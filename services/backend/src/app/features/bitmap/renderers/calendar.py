"""Calendar renderer — upcoming events from a published iCalendar (ICS) feed.

The user stores one ICS URL (see :class:`CalendarConfig`) — typically a
published iCloud/Google calendar link. This renderer fetches it, parses the
VEVENTs with a small self-contained iCalendar parser (no extra dependency),
keeps the events from today onward, and lays the next handful out as an agenda:
a date rail on the left and the event title/time/location on the right. Rendered
supersampled (SCALE) like the other dashboards so the type stays crisp through
the 1-bit threshold.

The parser is intentionally minimal: it handles line folding, the DATE and
DATE-TIME value forms (with UTC ``Z``, a ``TZID`` param we treat as local, or
naive), and unescapes TEXT values. It does *not* expand RRULE recurrences — a
recurring event shows once, at its start. That covers the common "show my next
events" case without pulling in a full iCalendar library.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime
from html import escape

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_models import CalendarConfig
from app.features.bitmap.renderers.base import NATIVE_SIZE, SANS_STACK, SCALE, Size, html_to_bmp

# How many events fit the 800px agenda, and how far back "upcoming" starts
# (midnight today, so all-day events happening today still show).
MAX_EVENTS = 9


@dataclass
class Event:
    summary: str
    start: datetime
    all_day: bool
    location: str | None = None


def _unfold(raw: str) -> list[str]:
    """Undo iCalendar line folding: a line beginning with space/tab continues
    the previous one."""
    lines: list[str] = []
    for line in raw.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        if line[:1] in (" ", "\t") and lines:
            lines[-1] += line[1:]
        else:
            lines.append(line)
    return lines


def _unescape(text: str) -> str:
    return (
        text.replace("\\n", " ")
        .replace("\\N", " ")
        .replace("\\,", ",")
        .replace("\\;", ";")
        .replace("\\\\", "\\")
    )


def _parse_dt(value: str, params: dict[str, str]) -> tuple[datetime, bool]:
    """Parse a DTSTART value into (datetime, all_day).

    Handles ``VALUE=DATE`` (all-day), UTC ``...Z``, and naive/TZID local times.
    TZID-qualified and UTC times are both normalized to naive local-ish datetimes
    for display — good enough for an at-a-glance agenda.
    """
    value = value.strip()
    if params.get("VALUE") == "DATE" or (len(value) == 8 and value.isdigit()):
        d = datetime.strptime(value, "%Y%m%d")
        return d, True
    if value.endswith("Z"):
        return datetime.strptime(value, "%Y%m%dT%H%M%SZ"), False
    return datetime.strptime(value, "%Y%m%dT%H%M%S"), False


def parse_ics(text: str) -> list[Event]:
    """Extract VEVENTs from ICS text as a flat list of :class:`Event`."""
    events: list[Event] = []
    summary: str | None = None
    location: str | None = None
    start: tuple[datetime, bool] | None = None
    in_event = False

    for line in _unfold(text):
        if line == "BEGIN:VEVENT":
            in_event, summary, location, start = True, None, None, None
            continue
        if line == "END:VEVENT":
            if start is not None:
                events.append(
                    Event(
                        summary=summary or "(no title)",
                        start=start[0],
                        all_day=start[1],
                        location=location,
                    )
                )
            in_event = False
            continue
        if not in_event or ":" not in line:
            continue

        name_part, _, value = line.partition(":")
        name, *param_parts = name_part.split(";")
        params = {
            k.upper(): v
            for p in param_parts
            if "=" in p
            for k, v in [p.split("=", 1)]
        }
        name = name.upper()

        if name == "SUMMARY":
            summary = _unescape(value)
        elif name == "LOCATION":
            location = _unescape(value)
        elif name == "DTSTART":
            try:
                start = _parse_dt(value, params)
            except ValueError:
                start = None

    return events


def upcoming(events: list[Event], now: datetime, limit: int = MAX_EVENTS) -> list[Event]:
    today = datetime.combine(now.date(), datetime.min.time())
    future = [e for e in events if e.start >= today]
    future.sort(key=lambda e: e.start)
    return future[:limit]


async def _fetch(url: str) -> str:
    # webcal is just https with a different scheme name.
    if url.lower().startswith("webcal://"):
        url = "https://" + url[len("webcal://") :]
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        r = await client.get(url, headers={"Accept": "text/calendar"})
        _ = r.raise_for_status()
        return r.text


def _no_feed_html() -> str:
    return f"""\
<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{{margin:0;width:100vw;height:100vh;background:#000;color:#fff;
    font-family:{SANS_STACK};}}
  body{{display:flex;flex-direction:column;align-items:center;
    justify-content:center;text-align:center;padding:40px;}}
  h1{{font-size:39px;font-weight:700;text-transform:uppercase;margin:0 0 20px;}}
  p{{font-size:13px;line-height:1.6;}}
</style></head><body>
  <h1>Calendar</h1>
  <p>No calendar feed set yet.<br><br>Open wframe in your browser, edit<br>
     this dashboard, and paste a published<br>ICS/webcal link to enable it.</p>
</body></html>"""


def _error_html(message: str) -> str:
    return f"""\
<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{{margin:0;width:100vw;height:100vh;background:#000;color:#fff;
    font-family:{SANS_STACK};}}
  body{{display:flex;flex-direction:column;align-items:center;
    justify-content:center;text-align:center;padding:40px;}}
  h1{{font-size:39px;font-weight:700;text-transform:uppercase;margin:0 0 20px;}}
  p{{font-size:13px;line-height:1.6;}}
</style></head><body>
  <h1>Calendar</h1>
  <p>Couldn't load the feed.<br><br>{escape(message)}</p>
</body></html>"""


def render_html(events: list[Event], now: datetime) -> str:
    rows: list[str] = []
    for e in events:
        day = e.start.strftime("%d")
        mon = e.start.strftime("%b").upper()
        wd = e.start.strftime("%a").upper()
        time = "All day" if e.all_day else e.start.strftime("%H:%M")
        loc = (
            f'<div class="loc">{escape(e.location)}</div>'
            if e.location
            else ""
        )
        rows.append(f"""\
      <div class="row">
        <div class="rail">
          <div class="wd">{wd}</div>
          <div class="day">{day}</div>
          <div class="mon">{mon}</div>
        </div>
        <div class="body">
          <div class="title">{escape(e.summary)}</div>
          <div class="sub">{time}</div>
          {loc}
        </div>
      </div>""")
    if not rows:
        rows.append('<div class="empty">No upcoming events.</div>')

    stamp = now.strftime("%a %d %b · %H:%M")

    return f"""\
<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=480, initial-scale=1.0">
<style>
  *{{box-sizing:border-box;margin:0;padding:0;}}
  html,body{{width:100vw;height:100vh;background:#000;color:#fff;
    font-family:{SANS_STACK};}}
  body{{padding:26px;}}
  .frame{{border:2px solid #fff;padding:24px 22px;height:100%;
    display:flex;flex-direction:column;}}
  .head{{text-align:center;border-bottom:2px solid #fff;
    padding-bottom:13px;margin-bottom:8px;}}
  .head .kicker{{font-size:13px;font-weight:700;text-transform:uppercase;
    letter-spacing:2px;}}
  .head .stamp{{font-size:20px;font-weight:700;line-height:1.2;margin:6px 0 0;}}
  .rows{{flex:1;display:flex;flex-direction:column;}}
  .row{{display:flex;align-items:stretch;gap:14px;
    border-bottom:1px solid #fff;padding:11px 0;}}
  .rail{{width:58px;flex:none;text-align:center;
    display:flex;flex-direction:column;justify-content:center;
    border-right:2px solid #fff;padding-right:10px;}}
  .rail .wd{{font-size:11px;font-weight:700;letter-spacing:1px;}}
  .rail .day{{font-size:28px;font-weight:800;line-height:1;}}
  .rail .mon{{font-size:11px;font-weight:700;letter-spacing:1px;}}
  .body{{flex:1;min-width:0;display:flex;flex-direction:column;
    justify-content:center;}}
  .title{{font-size:19px;font-weight:700;line-height:1.2;
    overflow:hidden;text-overflow:ellipsis;}}
  .sub{{font-size:13px;margin-top:3px;text-transform:uppercase;
    letter-spacing:1px;}}
  .loc{{font-size:13px;margin-top:2px;white-space:nowrap;overflow:hidden;
    text-overflow:ellipsis;opacity:0.85;}}
  .empty{{flex:1;display:flex;align-items:center;justify-content:center;
    font-size:13px;text-transform:uppercase;}}
  .footer{{margin-top:14px;padding-top:13px;border-top:2px solid #fff;
    display:flex;justify-content:flex-end;font-size:13px;font-weight:700;
    text-transform:uppercase;}}
</style></head><body>
  <div class="frame">
    <div class="head">
      <div class="kicker">Upcoming</div>
      <div class="stamp">{escape(now.strftime("%A, %d %B"))}</div>
    </div>
    <div class="rows">
{chr(10).join(rows)}
    </div>
    <div class="footer">
      <span>Calendar · {now.strftime("%H:%M")}</span>
    </div>
  </div>
</body></html>"""


class CalendarRenderer:
    def __init__(self, session: AsyncSession, user_id: uuid.UUID) -> None:
        self.session: AsyncSession = session
        self.user_id: uuid.UUID = user_id

    async def render(self, size: Size = NATIVE_SIZE) -> bytes:
        cfg = await self.session.get(CalendarConfig, self.user_id)
        if cfg is None:
            return await html_to_bmp(_no_feed_html(), size=size, scale=SCALE)
        now = datetime.now()
        try:
            text = await _fetch(cfg.ics_url)
        except Exception:
            # Never surface the URL (it's a secret capability link) in the error.
            return await html_to_bmp(_error_html("The feed URL is unreachable."), size=size, scale=SCALE)
        events = upcoming(parse_ics(text), now)
        return await html_to_bmp(render_html(events, now), size=size, scale=SCALE)
