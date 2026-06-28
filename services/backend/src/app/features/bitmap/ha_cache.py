"""In-memory TTL cache for Home Assistant light snapshots.

This is the *only* place a user's home data lives. HA pushes a snapshot to the
webhook; we hold it here just long enough to render it onto the screen, then it
expires. Nothing is written to the database and nothing survives a restart — by
design, so wframe never becomes a durable record of someone's home.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass

from app.logging import create_logger

logger = create_logger(__name__)

# How long a pushed snapshot stays renderable. Long enough to outlive a slow
# epaper refresh cadence, short enough that a disconnected home goes stale.
TTL_SECONDS = 60 * 60


@dataclass(frozen=True)
class Light:
    name: str
    is_on: bool
    # 0–255 as HA reports it; None when the light has no brightness channel.
    brightness: int | None = None

    @property
    def brightness_pct(self) -> int | None:
        if self.brightness is None:
            return None
        return round(self.brightness / 255 * 100)


@dataclass(frozen=True)
class LightSnapshot:
    lights: list[Light]
    received_at: float


@dataclass(frozen=True)
class SensorSeries:
    """A time series for one sensor (e.g. 24h of temperature readings).

    HA owns the history (its recorder DB); it queries the last 24h and pushes
    the whole series, so wframe stays stateless and never accumulates home data
    of its own — the same privacy stance as the light snapshots above. ``times``
    are ISO-8601 strings and ``values`` the numeric readings, index-aligned.
    """

    name: str
    unit: str
    times: list[str]
    values: list[float]
    received_at: float


# user_id -> snapshot. Process-local; not shared across workers, which is fine:
# a user's epaper renders are few and a missed-worker snapshot just re-pushes on
# HA's next state change.
_store: dict[uuid.UUID, LightSnapshot] = {}
_sensor_store: dict[uuid.UUID, SensorSeries] = {}


def put(user_id: uuid.UUID, lights: list[Light]) -> None:
    _store[user_id] = LightSnapshot(lights=lights, received_at=time.monotonic())
    logger.info(
        "ha_cache stored snapshot",
        user_id=str(user_id),
        lights=len(lights),
        on=sum(1 for light in lights if light.is_on),
    )


def age_seconds(snap: LightSnapshot | SensorSeries) -> float:
    """Seconds since ``snap`` was received."""
    return time.monotonic() - snap.received_at


def get(user_id: uuid.UUID) -> LightSnapshot | None:
    """Return the live snapshot, or None if absent or older than ``TTL_SECONDS``."""
    snap = _store.get(user_id)
    if snap is None:
        logger.info("ha_cache miss (no snapshot)", user_id=str(user_id))
        return None
    age = time.monotonic() - snap.received_at
    if age > TTL_SECONDS:
        del _store[user_id]
        logger.info("ha_cache miss (expired)", user_id=str(user_id), age_seconds=round(age))
        return None
    logger.info("ha_cache hit", user_id=str(user_id), lights=len(snap.lights), age_seconds=round(age))
    return snap


def put_sensors(user_id: uuid.UUID, *, name: str, unit: str, times: list[str], values: list[float]) -> None:
    _sensor_store[user_id] = SensorSeries(
        name=name, unit=unit, times=times, values=values, received_at=time.monotonic()
    )
    logger.info("ha_cache stored sensor series", user_id=str(user_id), name=name, points=len(values))


def get_sensors(user_id: uuid.UUID) -> SensorSeries | None:
    """Return the live sensor series, or None if absent or older than ``TTL_SECONDS``."""
    series = _sensor_store.get(user_id)
    if series is None:
        logger.info("ha_cache sensor miss (no series)", user_id=str(user_id))
        return None
    age = time.monotonic() - series.received_at
    if age > TTL_SECONDS:
        del _sensor_store[user_id]
        logger.info("ha_cache sensor miss (expired)", user_id=str(user_id), age_seconds=round(age))
        return None
    logger.info("ha_cache sensor hit", user_id=str(user_id), points=len(series.values), age_seconds=round(age))
    return series
