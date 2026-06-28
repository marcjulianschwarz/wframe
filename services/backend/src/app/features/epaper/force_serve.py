"""In-memory 'serve immediately' windows for epapers.

When a user changes their dashboard or display geometry we want the device to
pick up the change on its very next poll instead of waiting out the refresh
interval. Mutating actions call :func:`mark` to open a short window during which
the bitmap endpoint serves the image regardless of the duty cycle.

This is deliberately in-process state: the production backend runs a single
worker, so a plain dict suffices. The window is keyed by epaper id and expires by
timestamp, so it self-clears and a backend restart simply forgets pending forces
(harmless — the device just redraws on the normal schedule).
"""

from __future__ import annotations

import time
import uuid

# How long to keep serving after a change. Must comfortably exceed the device's
# poll period (~5s) so at least one poll lands inside the window.
FORCE_WINDOW_SECONDS = 12

# epaper_id -> unix timestamp until which we force-serve.
_serve_until: dict[uuid.UUID, float] = {}


def mark(epaper_id: uuid.UUID, now: float | None = None) -> None:
    """Open a force-serve window for this epaper starting now."""
    now = time.time() if now is None else now
    _serve_until[epaper_id] = now + FORCE_WINDOW_SECONDS


def is_forced(epaper_id: uuid.UUID, now: float | None = None) -> bool:
    """True while the epaper is inside an open force-serve window."""
    until = _serve_until.get(epaper_id)
    if until is None:
        return False
    now = time.time() if now is None else now
    if now >= until:
        # Expired: drop it so the dict doesn't grow unbounded.
        del _serve_until[epaper_id]
        return False
    return True
