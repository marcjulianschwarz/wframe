from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth import AuthDep
from app.database.session import get_session
from app.features.bitmap import ha_cache
from app.features.bitmap.ha_repository import HaRepo
from app.settings import settings

router = APIRouter(prefix="/ha", tags=["homeassistant"])


def _repo(session: Annotated[AsyncSession, Depends(get_session)]) -> HaRepo:
    return HaRepo(session)


RepoDep = Annotated[HaRepo, Depends(_repo)]


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #
class LightIn(BaseModel):
    name: str = Field(max_length=80)
    is_on: bool = False
    # 0–255 as Home Assistant reports it; omitted for on/off-only lights.
    brightness: int | None = Field(default=None, ge=0, le=255)


class LightPush(BaseModel):
    """The payload HA POSTs to the webhook. Capped so a misconfigured
    automation can't push an unbounded list into the in-memory cache."""

    lights: list[LightIn] = Field(max_length=64)


class SensorPush(BaseModel):
    """A 24h sensor history series HA POSTs to the sensor webhook.

    HA queries its recorder for the series and pushes the whole thing, so wframe
    can draw a chart without storing any history itself. Points are capped so a
    misconfigured query can't push an unbounded series into the cache."""

    name: str = Field(max_length=80)
    unit: str = Field(default="", max_length=16)
    times: list[str] = Field(max_length=2000)
    values: list[float] = Field(max_length=2000)


class ConnectionRead(BaseModel):
    """The user's ingest channel. ``webhook_url`` is what goes into the HA
    integration/automation; the snippet is ready to paste."""

    ingest_token: str
    webhook_url: str
    sensor_webhook_url: str
    automation_yaml: str
    sensor_automation_yaml: str


# --------------------------------------------------------------------------- #
# Connection management (JWT-authed, from the wframe UI)
# --------------------------------------------------------------------------- #
def _to_read(token: str) -> ConnectionRead:
    url = f"{settings.BACKEND_URL}/ha/webhook/{token}"
    # A copy-paste HA automation that pushes all lights every minute. The HACS
    # integration automates this, but the raw snippet works for everyone.
    yaml = f"""# Paste into Home Assistant's configuration.yaml (or a package), then
# restart HA. It pushes all your lights to wframe every minute and whenever a
# light changes. No custom components required.

rest_command:
  wframe_push:
    url: "{url}"
    method: POST
    content_type: "application/json"
    # Build the JSON payload explicitly: HA's friendly name -> name,
    # on/off -> is_on, and the 0-255 brightness attribute -> brightness.
    # default(none, true) coerces a missing/empty brightness (off lights and
    # on/off-only lights) to null, which to_json can serialize — accessing the
    # bare attribute yields Undefined, which it can't.
    payload: >-
      {{% set ns = namespace(items=[]) %}}
      {{% for s in states.light %}}
        {{% set ns.items = ns.items + [{{
          "name": s.name,
          "is_on": s.state == "on",
          "brightness": s.attributes.brightness | default(none, true)
        }}] %}}
      {{% endfor %}}
      {{{{ {{"lights": ns.items}} | to_json }}}}

automation:
  - alias: "Push lights to wframe"
    trigger:
      # A steady once-a-minute push. Reliable and simple; the panel is never
      # more than ~1 minute stale. (For near-instant updates you can add a
      # debounced state trigger, but plain polling is the dependable baseline.)
      - platform: time_pattern
        minutes: "/1"
    action:
      - service: rest_command.wframe_push"""
    sensor_url = f"{settings.BACKEND_URL}/ha/webhook/{token}/sensor"
    # The temperature chart needs 24h of history. HA's recorder already holds it,
    # but a copy-paste rest_command can't read a time series back out (templates
    # only see current state). So the series is produced by the wframe HACS
    # integration, which queries the recorder's history API and posts the whole
    # series here. This snippet is just the manual fallback: it configures the
    # integration's target sensor and push cadence.
    sensor_yaml = f"""# Install the wframe integration via HACS, then add this to
# configuration.yaml. The integration reads the last 24h of your sensor from
# Home Assistant's recorder and pushes the full series to wframe, so the epaper
# can draw a temperature chart. wframe stores no history of its own.

wframe:
  ingest_url: "{sensor_url}"
  # The sensor whose 24h history to chart (must be retained by the Recorder).
  sensor: SENSOR_ENTITY_ID
  # How often to push the refreshed 24h series. 15 min is plenty for epaper.
  push_interval_minutes: 15"""
    return ConnectionRead(
        ingest_token=token,
        webhook_url=url,
        sensor_webhook_url=sensor_url,
        automation_yaml=yaml,
        sensor_automation_yaml=sensor_yaml,
    )


@router.post("/connection", response_model=ConnectionRead)
async def create_connection(auth: AuthDep, repo: RepoDep) -> ConnectionRead:
    """Mint (or return the existing) ingest channel for the current user."""
    conn = await repo.get_or_create(auth.user.id)
    return _to_read(conn.ingest_token)


@router.get("/connection", response_model=ConnectionRead)
async def get_connection(auth: AuthDep, repo: RepoDep) -> ConnectionRead:
    conn = await repo.get(auth.user.id)
    if conn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No connection")
    return _to_read(conn.ingest_token)


# --------------------------------------------------------------------------- #
# Ingest webhook (token-authed, from Home Assistant)
# --------------------------------------------------------------------------- #
@router.post("/webhook/{token}", status_code=status.HTTP_204_NO_CONTENT)
async def ingest(token: str, body: LightPush, repo: RepoDep) -> None:
    """Receive a light snapshot pushed by Home Assistant.

    Authenticated by the opaque path token (HA never holds the user's JWT). The
    snapshot is stored only in the in-memory TTL cache — never the database — so
    wframe holds the home's state just long enough to render it.
    """
    conn = await repo.get_by_token(token)
    if conn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown ingest token")
    lights = [ha_cache.Light(name=item.name, is_on=item.is_on, brightness=item.brightness) for item in body.lights]
    ha_cache.put(conn.user_id, lights)


@router.post("/webhook/{token}/sensor", status_code=status.HTTP_204_NO_CONTENT)
async def ingest_sensor(token: str, body: SensorPush, repo: RepoDep) -> None:
    """Receive a 24h sensor history series pushed by the wframe HA integration.

    Same token auth and same in-memory-only handling as the lights webhook: the
    series is held just long enough to render a chart, never persisted.
    """
    conn = await repo.get_by_token(token)
    if conn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown ingest token")
    if len(body.times) != len(body.values):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="times and values must be the same length",
        )
    ha_cache.put_sensors(conn.user_id, name=body.name, unit=body.unit, times=body.times, values=body.values)
