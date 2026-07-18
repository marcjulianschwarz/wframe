"""VAG departures renderer — live departure board for a VGN stop.

Data comes from the VAG Abfahrtsmonitor API (start.vag.de, CC-BY 4.0, no API
key; see https://bundesapi.github.io/vag-api/). The page is drawn with the
shared sans body font as a departure board: one row per departure with the
line, direction, platform, and a real-time countdown. Rendered supersampled
(SCALE) like the other dashboards so the antialiased type stays crisp through
the 1-bit threshold.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from html import escape
from typing import ClassVar

import httpx
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_models import VagStop
from app.features.bitmap.renderers.base import NATIVE_SIZE, SANS_STACK, SCALE, Size, html_to_bmp

VAG_API = "https://start.vag.de/dm/api/v1"
# How far ahead to ask for departures and how many rows fit the 800px page.
TIMESPAN_MIN = 120
MAX_ROWS = 10

# Produkt → short badge prefix shown when the line name alone is ambiguous.
PRODUCT_LABEL = {
    "UBahn": "U",
    "Tram": "T",
    "Bus": "B",
    "SBahn": "S",
    "RBahn": "R",
}


class Abfahrt(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(extra="ignore")

    Linienname: str = ""
    Richtungstext: str = ""
    AbfahrtszeitSoll: str
    AbfahrtszeitIst: str
    Produkt: str = ""
    HaltesteigText: str | None = None


class Departures(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(extra="ignore")

    class Meta(BaseModel):
        model_config: ClassVar[ConfigDict] = ConfigDict(extra="ignore")

        Timestamp: str

    Metadata: Meta
    Haltestellenname: str = ""
    Abfahrten: list[Abfahrt] = []
    Sonderinformationen: list[str] = Field(default_factory=list)


def _no_stop_html() -> str:
    return f"""\
<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{{margin:0;width:100vw;height:100vh;background:#fff;color:#000;
    font-family:{SANS_STACK};}}
  body{{display:flex;flex-direction:column;align-items:center;
    justify-content:center;text-align:center;padding:40px;}}
  h1{{font-size:39px;font-weight:700;text-transform:uppercase;margin:0 0 20px;}}
  p{{font-size:13px;line-height:1.6;}}
</style></head><body>
  <h1>VAG</h1>
  <p>No stop set yet.<br><br>Open wframe in your browser, edit<br>
     this dashboard, and pick your<br>VGN stop to enable it.</p>
</body></html>"""


async def _fetch(vgn_number: int) -> Departures:
    params = {"timespan": TIMESPAN_MIN, "limitcount": MAX_ROWS}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{VAG_API}/abfahrten/vgn/{vgn_number}", params=params)
        _ = r.raise_for_status()
        return Departures.model_validate(r.json())


def _countdown(dep: Abfahrt, now: datetime) -> tuple[str, str]:
    """(minutes-until text, delay text). Countdown uses the real-time estimate;
    the delay is estimate − schedule, shown only when a vehicle runs late."""
    ist = datetime.fromisoformat(dep.AbfahrtszeitIst)
    soll = datetime.fromisoformat(dep.AbfahrtszeitSoll)
    mins = max(0, int((ist - now).total_seconds() // 60))
    delay = int((ist - soll).total_seconds() // 60)
    return ("now" if mins == 0 else f"{mins}'", f"+{delay}" if delay > 0 else "")


def render_html(stop_name: str, data: Departures, now: datetime) -> str:
    rows: list[str] = []
    for dep in data.Abfahrten[:MAX_ROWS]:
        count, delay = _countdown(dep, now)
        line = escape(dep.Linienname)
        # U-Bahn/S-Bahn line names already carry their product ("U1", "S2");
        # bare numbers (trams and buses) get a product letter so they read.
        if line and line[0].isdigit():
            line = f"{PRODUCT_LABEL.get(dep.Produkt, '')}{line}"
        platform = f" · Gl. {escape(dep.HaltesteigText)}" if dep.HaltesteigText else ""
        delay_html = f'<span class="delay">{delay}</span>' if delay else ""
        rows.append(f"""\
      <div class="row">
        <div class="line">{line}</div>
        <div class="dest">
          <div class="dir">{escape(dep.Richtungstext)}</div>
          <div class="sub">{escape(dep.Produkt)}{platform}</div>
        </div>
        <div class="eta">{count}{delay_html}</div>
      </div>""")
    if not rows:
        rows.append(
            '<div class="empty">No departures in the next '
            f"{TIMESPAN_MIN // 60}h.</div>"
        )

    info = " · ".join(escape(s.strip()) for s in data.Sonderinformationen[:1])
    info_html = f'<div class="info">{info}</div>' if info else ""
    stamp = now.strftime("%a %d %b · %H:%M")

    return f"""\
<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=480, initial-scale=1.0">
<style>
  *{{box-sizing:border-box;margin:0;padding:0;}}
  /* Fill the actual render viewport instead of a fixed 480×800, so the whole
     layout reflows when the device geometry changes. */
  html,body{{width:100vw;height:100vh;background:#fff;color:#000;
    font-family:{SANS_STACK};}}
  body{{padding:26px;}}
  .frame{{border:2px solid #000;padding:24px 22px;height:100%;
    display:flex;flex-direction:column;}}
  .head{{text-align:center;border-bottom:2px solid #000;
    padding-bottom:13px;margin-bottom:14px;}}
  .head .kicker{{font-size:13px;font-weight:700;text-transform:uppercase;}}
  .head .stop{{font-size:26px;font-weight:700;line-height:1.2;margin:6px 0 4px;}}
  .head .stamp{{font-size:13px;margin-top:6px;text-transform:uppercase;}}
  .rows{{flex:1;display:flex;flex-direction:column;}}
  .row{{display:flex;align-items:center;gap:12px;
    border-bottom:1px solid #000;padding:10px 0;}}
  .line{{width:64px;flex:none;background:#000;color:#fff;text-align:center;
    font-size:20px;font-weight:700;padding:6px 0;}}
  .dest{{flex:1;min-width:0;}}
  .dir{{font-size:18px;font-weight:700;white-space:nowrap;overflow:hidden;}}
  .sub{{font-size:13px;margin-top:2px;text-transform:uppercase;}}
  .eta{{flex:none;text-align:right;font-size:26px;font-weight:700;}}
  .eta .delay{{display:block;font-size:13px;font-weight:400;}}
  .empty{{flex:1;display:flex;align-items:center;justify-content:center;
    font-size:13px;text-transform:uppercase;}}
  .info{{margin-top:12px;font-size:13px;line-height:1.4;max-height:54px;
    overflow:hidden;}}
  .footer{{margin-top:14px;padding-top:13px;border-top:2px solid #000;
    display:flex;justify-content:flex-end;font-size:13px;font-weight:700;
    text-transform:uppercase;}}
</style></head><body>
  <div class="frame">
    <div class="head">
      <div class="kicker">Abfahrten</div>
      <div class="stop">{escape(stop_name)}</div>
      <div class="stamp">{escape(stamp)}</div>
    </div>
    <div class="rows">
{chr(10).join(rows)}
    </div>
    {info_html}
    <div class="footer">
      <span>VAG · {now.strftime("%H:%M")}</span>
    </div>
  </div>
</body></html>"""


class VagRenderer:
    def __init__(self, session: AsyncSession, user_id: uuid.UUID) -> None:
        self.session: AsyncSession = session
        self.user_id: uuid.UUID = user_id

    async def render(self, size: Size = NATIVE_SIZE) -> bytes:
        stop = await self.session.get(VagStop, self.user_id)
        if stop is None:
            return await html_to_bmp(_no_stop_html(), size=size, scale=SCALE)
        data = await _fetch(stop.vgn_number)
        # The API timestamp is the stop's local time; using it (not the server
        # clock) keeps countdowns right regardless of the server's timezone.
        now = datetime.fromisoformat(data.Metadata.Timestamp)
        html = render_html(data.Haltestellenname or stop.name, data, now)
        return await html_to_bmp(html, size=size, scale=SCALE)
