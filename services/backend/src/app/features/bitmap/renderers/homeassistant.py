"""Home Assistant lights renderer — a grid of the user's lights and brightness.

Unlike the weather/github renderers, this one does NOT fetch data: a
cloud-hosted wframe can't reach a home behind a router. Instead Home Assistant
*pushes* light states to the webhook (see ``ha_router``), which holds them in an
in-memory TTL cache (``ha_cache``). This renderer reads the latest pushed
snapshot from that cache. If nothing has been pushed (or it expired) it shows a
"waiting for data" frame. Drawn with the Cozette pixel font at scale=1, like the
weather and github dashboards, so the type stays crisp through the 1-bit
threshold.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from html import escape
from pathlib import Path

from app.features.bitmap import ha_cache
from app.features.bitmap.renderers.base import NATIVE_SIZE, Size, html_to_bmp
from app.features.bitmap.renderers.weather import svg_line_chart
from app.logging import create_logger

logger = create_logger(__name__)

FONTS_DIR = Path(__file__).parent.parent / "fonts"


def _font_face() -> str:
    reg = (FONTS_DIR / "Cozette.ttf").as_uri()
    bold = (FONTS_DIR / "CozetteBold.ttf").as_uri()
    return f'''
  @font-face {{ font-family:"Cozette"; font-weight:400;
    src:url("{reg}") format("truetype"); }}
  @font-face {{ font-family:"Cozette"; font-weight:700;
    src:url("{bold}") format("truetype"); }}'''


def _waiting_html() -> str:
    return f"""\
<!doctype html><html><head><meta charset="utf-8"><style>{_font_face()}
  html,body{{margin:0;width:100vw;height:100vh;background:#000;color:#fff;
    font-family:"Cozette",monospace;-webkit-font-smoothing:none;}}
  body{{display:flex;flex-direction:column;align-items:center;
    justify-content:center;text-align:center;padding:40px;}}
  h1{{font-size:39px;font-weight:700;text-transform:uppercase;margin:0 0 20px;}}
  p{{font-size:13px;line-height:1.6;}}
</style></head><body>
  <h1>Home</h1>
  <p>Waiting for Home Assistant&hellip;<br><br>Connect wframe in Home Assistant<br>
     and push your lights to enable<br>this dashboard.</p>
</body></html>"""


def _temp_waiting_html() -> str:
    return f"""\
<!doctype html><html><head><meta charset="utf-8"><style>{_font_face()}
  html,body{{margin:0;width:100vw;height:100vh;background:#000;color:#fff;
    font-family:"Cozette",monospace;-webkit-font-smoothing:none;}}
  body{{display:flex;flex-direction:column;align-items:center;
    justify-content:center;text-align:center;padding:40px;}}
  h1{{font-size:39px;font-weight:700;text-transform:uppercase;margin:0 0 20px;}}
  p{{font-size:13px;line-height:1.6;}}
</style></head><body>
  <h1>Temperature</h1>
  <p>Waiting for Home Assistant&hellip;<br><br>Install the wframe integration<br>
     and point it at a sensor to enable<br>this 24h chart.</p>
</body></html>"""


def _brightness_bar(pct: int | None) -> str:
    """A 1-bit fill bar for brightness. Off/no-brightness lights render empty."""
    fill = pct or 0
    return f'<div class="bar"><div class="fill" style="width:{fill}%"></div></div>'


def _light_row(name: str, is_on: bool, pct: int | None) -> str:
    state = "ON" if is_on else "OFF"
    # Brightness only reads meaningfully when the light is on.
    val = f"{pct}%" if (is_on and pct is not None) else state
    bar = _brightness_bar(pct if is_on else 0)
    dot = "&#9679;" if is_on else "&#9675;"  # filled vs hollow circle
    return f"""\
      <div class="row">
        <div class="top">
          <span class="dot">{dot}</span>
          <span class="name">{escape(name)}</span>
          <span class="val">{escape(val)}</span>
        </div>
        {bar}
      </div>"""


def render_html(lights: list[ha_cache.Light]) -> str:
    on_count = sum(1 for light in lights if light.is_on)
    rows = (
        "".join(_light_row(light.name, light.is_on, light.brightness_pct) for light in lights)
        or '<p style="font-size:13px;">No lights reported.</p>'
    )
    stamp = datetime.now().strftime("%a %d %b · %H:%M")

    return f"""\
<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=480, initial-scale=1.0">
<style>{_font_face()}
  *{{box-sizing:border-box;margin:0;padding:0;}}
  /* Fill the actual render viewport instead of a fixed 480×800, so the whole
     layout reflows when the device geometry changes. */
  html,body{{width:100vw;height:100vh;background:#000;color:#fff;
    font-family:"Cozette",monospace;-webkit-font-smoothing:none;
    font-smooth:never;text-rendering:geometricPrecision;}}
  body{{padding:26px;}}
  .frame{{border:2px solid #fff;padding:24px 22px;height:100%;
    display:flex;flex-direction:column;}}
  .head{{text-align:center;border-bottom:2px solid #fff;
    padding-bottom:13px;margin-bottom:18px;}}
  .head .title{{font-size:39px;font-weight:700;text-transform:uppercase;
    line-height:1;}}
  .head .sub{{font-size:13px;margin-top:8px;text-transform:uppercase;}}
  .rows{{flex:1;display:flex;flex-direction:column;gap:16px;
    overflow:hidden;}}
  .row .top{{display:flex;align-items:baseline;font-size:18px;font-weight:700;
    text-transform:uppercase;}}
  .row .dot{{font-size:14px;margin-right:8px;}}
  .row .name{{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}}
  .row .val{{margin-left:12px;}}
  /* 1-bit brightness bar: white border, white fill. */
  .bar{{margin-top:7px;height:13px;border:2px solid #fff;}}
  .bar .fill{{height:100%;background:#fff;}}
  .footer{{margin-top:18px;padding-top:13px;border-top:2px solid #fff;
    display:flex;justify-content:space-between;font-size:13px;font-weight:700;
    text-transform:uppercase;}}
</style></head><body>
  <div class="frame">
    <div class="head">
      <div class="title">Home</div>
      <div class="sub">{on_count} of {len(lights)} lights on</div>
    </div>
    <div class="rows">
      {rows}
    </div>
    <div class="footer">
      <span>Home Assistant</span><span>{escape(stamp)}</span>
    </div>
  </div>
</body></html>"""


def render_sensor_html(series: ha_cache.SensorSeries) -> str:
    """A framed temperature dashboard: current reading up top, a 24h line chart
    (shared with the weather renderer) below. ``now_idx`` is the last point,
    since the whole series is history up to now."""
    now_idx = len(series.values) - 1
    chart = svg_line_chart(series.times, series.values, now_idx)
    latest = series.values[now_idx]
    lo, hi = min(series.values), max(series.values)
    unit = escape(series.unit) or "&deg;"
    stamp = datetime.now().strftime("%a %d %b · %H:%M")

    return f"""\
<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=480, initial-scale=1.0">
<style>{_font_face()}
  *{{box-sizing:border-box;margin:0;padding:0;}}
  /* Fill the actual render viewport instead of a fixed 480×800, so the whole
     layout reflows when the device geometry changes. */
  html,body{{width:100vw;height:100vh;background:#000;color:#fff;
    font-family:"Cozette",monospace;-webkit-font-smoothing:none;
    font-smooth:never;text-rendering:geometricPrecision;}}
  body{{padding:26px;}}
  .frame{{border:2px solid #fff;padding:24px 22px;height:100%;
    display:flex;flex-direction:column;}}
  .head{{text-align:center;border-bottom:2px solid #fff;
    padding-bottom:13px;margin-bottom:18px;}}
  .head .place{{font-size:13px;font-weight:700;text-transform:uppercase;}}
  .head .now{{font-size:78px;font-weight:700;line-height:1;margin:8px 0 4px;}}
  .head .stamp{{font-size:13px;margin-top:8px;text-transform:uppercase;}}
  .chart{{flex:1;display:flex;flex-direction:column;justify-content:center;
    margin:8px 0;min-height:0;}}
  .chart .cap{{font-size:13px;font-weight:700;text-transform:uppercase;
    margin-bottom:8px;}}
  /* The SVG stretches to fill the chart box (preserveAspectRatio="none" +
     non-scaling-stroke), so it reflows with the panel geometry. */
  .chart svg{{display:block;width:100%;flex:1;min-height:0;}}
  .stats{{display:grid;grid-template-columns:1fr 1fr;gap:13px;
    border-top:2px solid #fff;padding-top:16px;}}
  .stat .k{{font-size:13px;text-transform:uppercase;}}
  .stat .v{{font-size:26px;font-weight:700;}}
  .footer{{margin-top:18px;padding-top:13px;border-top:2px solid #fff;
    display:flex;justify-content:space-between;font-size:13px;font-weight:700;
    text-transform:uppercase;}}
</style></head><body>
  <div class="frame">
    <div class="head">
      <div class="place">{escape(series.name)}</div>
      <div class="now">{latest:.0f}{unit}</div>
      <div class="stamp">{escape(stamp)}</div>
    </div>
    <div class="chart">
      <div class="cap">Past 24h</div>
      {chart}
    </div>
    <div class="stats">
      <div class="stat"><div class="k">High</div>
        <div class="v">{hi:.0f}{unit}</div></div>
      <div class="stat"><div class="k">Low</div>
        <div class="v">{lo:.0f}{unit}</div></div>
    </div>
    <div class="footer">
      <span>Home Assistant</span><span>{escape(stamp)}</span>
    </div>
  </div>
</body></html>"""


class HomeAssistantRenderer:
    """Lights grid from the pushed light snapshot."""

    def __init__(self, user_id: uuid.UUID) -> None:
        self.user_id: uuid.UUID = user_id

    async def render(self, size: Size = NATIVE_SIZE) -> bytes:
        snap = ha_cache.get(self.user_id)
        if snap is None:
            logger.info("ha render: waiting frame (no cached lights)", user_id=str(self.user_id))
            return await html_to_bmp(_waiting_html(), size=size, scale=1)
        logger.info(
            "ha render: lights grid",
            user_id=str(self.user_id),
            lights=len(snap.lights),
            age_seconds=round(ha_cache.age_seconds(snap)),
        )
        return await html_to_bmp(render_html(snap.lights), size=size, scale=1)


class HomeAssistantTempRenderer:
    """24h temperature chart from the pushed sensor series."""

    def __init__(self, user_id: uuid.UUID) -> None:
        self.user_id: uuid.UUID = user_id

    async def render(self, size: Size = NATIVE_SIZE) -> bytes:
        series = ha_cache.get_sensors(self.user_id)
        if series is None or not series.values:
            logger.info("ha render: waiting frame (no cached sensor series)", user_id=str(self.user_id))
            return await html_to_bmp(_temp_waiting_html(), size=size, scale=1)
        logger.info(
            "ha render: temperature chart",
            user_id=str(self.user_id),
            points=len(series.values),
            age_seconds=round(ha_cache.age_seconds(series)),
        )
        return await html_to_bmp(render_sensor_html(series), size=size, scale=1)
