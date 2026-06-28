"""wframe Home Assistant integration.

Reads the last 24h of a sensor from Home Assistant's recorder and pushes the
full series to a wframe ingest webhook, so a wframe epaper dashboard can draw a
temperature chart. The history lives in HA's recorder; wframe stores none of it
— it holds the pushed series only long enough to render.

Configuration (configuration.yaml):

    wframe:
      ingest_url: "https://<your-wframe>/ha/webhook/<token>/sensor"
      sensor: sensor.living_room_temperature
      push_interval_minutes: 15
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

import voluptuous as vol
from homeassistant.components.recorder import get_instance, history
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.typing import ConfigType
from homeassistant.util import dt as dt_util

_LOGGER = logging.getLogger(__name__)

DOMAIN = "wframe"

CONF_INGEST_URL = "ingest_url"
CONF_SENSOR = "sensor"
CONF_PUSH_INTERVAL = "push_interval_minutes"

HISTORY_WINDOW = timedelta(hours=24)
# Cap the pushed series so a high-frequency sensor can't post a huge payload;
# matches the backend's SensorPush max_length. Downsampled below if exceeded.
MAX_POINTS = 2000

CONFIG_SCHEMA = vol.Schema(
    {
        DOMAIN: vol.Schema(
            {
                vol.Required(CONF_INGEST_URL): cv.url,
                vol.Required(CONF_SENSOR): cv.entity_id,
                vol.Optional(CONF_PUSH_INTERVAL, default=15): vol.All(int, vol.Range(min=1, max=1440)),
            }
        )
    },
    extra=vol.ALLOW_EXTRA,
)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    conf = config[DOMAIN]
    ingest_url: str = conf[CONF_INGEST_URL]
    entity_id: str = conf[CONF_SENSOR]
    interval = timedelta(minutes=conf[CONF_PUSH_INTERVAL])

    async def _push(_now: datetime | None = None) -> None:
        await _push_series(hass, ingest_url, entity_id)

    # Push once at startup, then on the configured interval.
    async def _startup(_event: object) -> None:
        await _push()

    hass.bus.async_listen_once("homeassistant_started", _startup)
    async_track_time_interval(hass, _push, interval)
    _LOGGER.info("wframe set up: pushing %s to %s every %s", entity_id, ingest_url, interval)
    return True


async def _push_series(hass: HomeAssistant, ingest_url: str, entity_id: str) -> None:
    """Read 24h of ``entity_id`` from the recorder and POST it to wframe."""
    end = dt_util.utcnow()
    start = end - HISTORY_WINDOW

    # The recorder runs in its own thread; query it via its executor.
    def _query() -> list:
        changes = history.state_changes_during_period(
            hass, start, end, entity_id, include_start_time_state=True
        )
        return changes.get(entity_id, [])

    states = await get_instance(hass).async_add_executor_job(_query)

    times: list[str] = []
    values: list[float] = []
    name = entity_id
    unit = ""
    for state in states:
        if state.state in ("unknown", "unavailable", "", None):
            continue
        try:
            value = float(state.state)
        except (ValueError, TypeError):
            continue
        times.append(state.last_changed.isoformat())
        values.append(value)
        name = state.attributes.get("friendly_name", name)
        unit = state.attributes.get("unit_of_measurement", unit)

    if not values:
        _LOGGER.warning("wframe: no numeric history for %s in the last 24h", entity_id)
        return

    times, values = _downsample(times, values, MAX_POINTS)

    payload = {"name": name, "unit": unit, "times": times, "values": values}
    session = async_get_clientsession(hass)
    try:
        async with session.post(ingest_url, json=payload, timeout=15) as resp:
            if resp.status >= 400:
                _LOGGER.error("wframe push failed: HTTP %s", resp.status)
            else:
                _LOGGER.debug("wframe pushed %d points for %s", len(values), entity_id)
    except Exception:  # noqa: BLE001 - network errors shouldn't crash HA setup
        _LOGGER.exception("wframe push to %s failed", ingest_url)


def _downsample(times: list[str], values: list[float], limit: int) -> tuple[list[str], list[float]]:
    """Evenly thin a series to at most ``limit`` points, always keeping the last
    one so the chart's current reading is accurate."""
    n = len(values)
    if n <= limit:
        return times, values
    step = n / limit
    idx = sorted({int(i * step) for i in range(limit)} | {n - 1})
    return [times[i] for i in idx], [values[i] for i in idx]
