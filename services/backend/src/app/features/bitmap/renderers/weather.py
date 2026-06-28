"""Weather renderer — live forecast for the user's stored location.

Data comes from Open-Meteo (no API key). The page is drawn with the bundled
Cozette pixel font and an inline SVG line chart of the next 24h temperature,
with a marker on the current hour. Rendered at scale=1 like HN Zeitung so the
pixel font stays crisp through the 1-bit threshold.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from html import escape
from pathlib import Path
from typing import ClassVar

import httpx
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_models import WeatherLocation
from app.features.bitmap.renderers.base import html_to_bmp

FONTS_DIR = Path(__file__).parent.parent / "fonts"


class Current(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(extra="ignore")

    time: str
    temperature_2m: float = 0.0
    relative_humidity_2m: float = 0.0
    wind_speed_10m: float = 0.0
    weather_code: int = 0


class Hourly(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(extra="ignore")

    time: list[str] = []
    temperature_2m: list[float] = []


class Daily(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(extra="ignore")

    temperature_2m_max: list[float] = []
    temperature_2m_min: list[float] = []
    sunrise: list[str] = []
    sunset: list[str] = []


class Forecast(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(extra="ignore")

    current: Current
    hourly: Hourly
    daily: Daily


# WMO weather code → short label. Coarse buckets are enough for a 1-bit display.
WMO = {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Dense drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Showers",
    81: "Showers",
    82: "Violent showers",
    85: "Snow showers",
    86: "Snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm",
    99: "Thunderstorm",
}


def _no_location_html() -> str:
    return f"""\
<!doctype html><html><head><meta charset="utf-8"><style>{_font_face()}
  html,body{{margin:0;width:480px;height:800px;background:#000;color:#fff;
    font-family:"Cozette",monospace;-webkit-font-smoothing:none;}}
  body{{display:flex;flex-direction:column;align-items:center;
    justify-content:center;text-align:center;padding:40px;}}
  h1{{font-size:39px;font-weight:700;text-transform:uppercase;margin:0 0 20px;}}
  p{{font-size:13px;line-height:1.6;}}
</style></head><body>
  <h1>Weather</h1>
  <p>No location set yet.<br><br>Open wframe in your browser and<br>
     allow location access to enable<br>this dashboard.</p>
</body></html>"""


def _font_face() -> str:
    reg = (FONTS_DIR / "Cozette.ttf").as_uri()
    bold = (FONTS_DIR / "CozetteBold.ttf").as_uri()
    return f'''
  @font-face {{ font-family:"Cozette"; font-weight:400;
    src:url("{reg}") format("truetype"); }}
  @font-face {{ font-family:"Cozette"; font-weight:700;
    src:url("{bold}") format("truetype"); }}'''


async def _fetch(lat: float, lon: float) -> Forecast:
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
        "hourly": "temperature_2m",
        "daily": "temperature_2m_max,temperature_2m_min,sunrise,sunset",
        "timezone": "auto",
        "forecast_days": 2,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get("https://api.open-meteo.com/v1/forecast", params=params)
        _ = r.raise_for_status()
        return Forecast.model_validate(r.json())


def _svg_chart(times: list[str], temps: list[float], now_idx: int) -> str:
    """A 24h temperature line chart as inline SVG, 1px white on black, with a
    dot + vertical guide on the current hour."""
    # Width matches the frame's inner content box: 480 − 2×26 body padding
    # − 2×22 frame padding − 2×2 frame border = 380.
    w, h = 380, 200
    pad_l, pad_r, pad_t, pad_b = 4, 4, 14, 24
    iw, ih = w - pad_l - pad_r, h - pad_t - pad_b

    lo, hi = min(temps), max(temps)
    span = (hi - lo) or 1.0
    # Headroom so the curve never touches the top or the baseline: plot into the
    # middle 84% of the vertical space.
    head = ih * 0.08
    n = len(temps)

    def x(i: int) -> float:
        return pad_l + (iw * i / (n - 1) if n > 1 else 0)

    def y(t: float) -> float:
        return pad_t + head + (ih - 2 * head) * (1 - (t - lo) / span)

    pts = " ".join(f"{x(i):.1f},{y(t):.1f}" for i, t in enumerate(temps))

    # hour ticks every 6 steps; clamp label anchor at the edges so the first
    # and last labels aren't clipped by the chart bounds.
    ticks: list[str] = []
    for i in range(0, n, 6):
        hh = times[i][11:16]
        anchor = "start" if i == 0 else "end" if i >= n - 1 else "middle"
        ticks.append(
            f'<line x1="{x(i):.1f}" y1="{pad_t + ih}" x2="{x(i):.1f}" '
            + f'y2="{pad_t + ih + 4}" stroke="#fff" stroke-width="1"/>'
            + f'<text x="{x(i):.1f}" y="{h - 6}" fill="#fff" font-size="11" '
            + f'font-family="Cozette,monospace" text-anchor="{anchor}">{hh}</text>'
        )

    nx, ny = x(now_idx), y(temps[now_idx])
    now_marker = (
        f'<line x1="{nx:.1f}" y1="{pad_t}" x2="{nx:.1f}" y2="{pad_t + ih}" '
        f'stroke="#fff" stroke-width="1" stroke-dasharray="2 3"/>'
        f'<circle cx="{nx:.1f}" cy="{ny:.1f}" r="4" fill="#fff"/>'
    )

    return f'''<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}"
  xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
  <rect x="0" y="0" width="{w}" height="{h}" fill="#000"/>
  <text x="{pad_l}" y="11" fill="#fff" font-size="11"
    font-family="Cozette,monospace">{hi:.0f}&deg;</text>
  <text x="{pad_l}" y="{pad_t + ih}" fill="#fff" font-size="11"
    font-family="Cozette,monospace">{lo:.0f}&deg;</text>
  <line x1="{pad_l}" y1="{pad_t + ih}" x2="{pad_l + iw}" y2="{pad_t + ih}"
    stroke="#fff" stroke-width="1"/>
  {now_marker}
  <polyline points="{pts}" fill="none" stroke="#fff" stroke-width="2"
    stroke-linejoin="round" stroke-linecap="round"/>
  {"".join(ticks)}
</svg>'''


def render_html(data: Forecast, place: str | None) -> str:
    cur = data.current
    daily = data.daily
    hourly = data.hourly

    # Use the location's local time (Open-Meteo returns it because we request
    # timezone=auto), not the server clock — otherwise the stamp and the chart's
    # current-hour marker are off by the server↔location offset.
    now = datetime.fromisoformat(cur.time)
    now_iso = now.strftime("%Y-%m-%dT%H:00")
    htimes: list[str] = hourly.time
    htemps: list[float] = hourly.temperature_2m
    # window: current hour → +23h
    try:
        start = htimes.index(now_iso)
    except ValueError:
        start = 0
    window_t = htimes[start : start + 24]
    window_v = htemps[start : start + 24]
    if not window_v:  # fallback
        window_t, window_v = htimes[:24], htemps[:24]

    temp = cur.temperature_2m
    cond = WMO.get(cur.weather_code, "—")
    hum = cur.relative_humidity_2m
    wind = cur.wind_speed_10m
    hi = daily.temperature_2m_max[0]
    lo = daily.temperature_2m_min[0]
    sunrise = daily.sunrise[0][11:16]
    sunset = daily.sunset[0][11:16]

    label = escape(place) if place else "Your location"
    chart = _svg_chart(window_t, window_v, 0)
    stamp = now.strftime("%a %d %b · %H:%M")

    return f"""\
<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=480, initial-scale=1.0">
<style>{_font_face()}
  *{{box-sizing:border-box;margin:0;padding:0;}}
  html,body{{width:480px;height:800px;background:#000;color:#fff;
    font-family:"Cozette",monospace;-webkit-font-smoothing:none;
    font-smooth:never;text-rendering:geometricPrecision;}}
  body{{padding:26px;}}
  /* Fill the full height so the border reaches the bottom; the chart row grows
     to take the slack between the fixed-height header and stats. */
  .frame{{border:2px solid #fff;padding:24px 22px;height:100%;
    display:flex;flex-direction:column;}}
  .head{{text-align:center;border-bottom:2px solid #fff;
    padding-bottom:13px;margin-bottom:18px;}}
  .head .place{{font-size:13px;font-weight:700;text-transform:uppercase;}}
  .head .now{{font-size:78px;font-weight:700;line-height:1;margin:8px 0 4px;}}
  .head .cond{{font-size:18px;font-weight:700;text-transform:uppercase;}}
  .head .stamp{{font-size:13px;margin-top:8px;text-transform:uppercase;}}
  .chart{{flex:1;display:flex;flex-direction:column;justify-content:center;
    margin:8px 0;}}
  .chart .cap{{font-size:13px;font-weight:700;text-transform:uppercase;
    margin-bottom:8px;}}
  /* Render the SVG at its native 380×200 — never scaled — so the browser
     doesn't sub-pixel-stretch the 2px stroke into spiky edges. */
  .chart svg{{display:block;width:380px;height:200px;}}
  .stats{{display:grid;grid-template-columns:1fr 1fr;gap:13px;
    border-top:2px solid #fff;padding-top:16px;}}
  .stat .k{{font-size:13px;text-transform:uppercase;}}
  .stat .v{{font-size:26px;font-weight:700;}}
  .footer{{margin-top:18px;padding-top:13px;border-top:2px solid #fff;
    display:flex;justify-content:flex-end;font-size:13px;font-weight:700;
    text-transform:uppercase;}}
</style></head><body>
  <div class="frame">
    <div class="head">
      <div class="place">{label}</div>
      <div class="now">{temp:.0f}&deg;</div>
      <div class="cond">{escape(cond)}</div>
      <div class="stamp">{escape(stamp)}</div>
    </div>
    <div class="chart">
      <div class="cap">Next 24h</div>
      {chart}
    </div>
    <div class="stats">
      <div class="stat"><div class="k">High / Low</div>
        <div class="v">{hi:.0f}&deg; / {lo:.0f}&deg;</div></div>
      <div class="stat"><div class="k">Humidity</div>
        <div class="v">{hum:.0f}%</div></div>
      <div class="stat"><div class="k">Wind</div>
        <div class="v">{wind:.0f} km/h</div></div>
      <div class="stat"><div class="k">Sun</div>
        <div class="v">{sunrise} / {sunset}</div></div>
    </div>
    <div class="footer">
      <span>Weather · {now.strftime("%H:%M")}</span>
    </div>
  </div>
</body></html>"""


class WeatherRenderer:
    def __init__(self, session: AsyncSession, user_id: uuid.UUID) -> None:
        self.session: AsyncSession = session
        self.user_id: uuid.UUID = user_id

    async def render(self) -> bytes:
        loc = await self.session.get(WeatherLocation, self.user_id)
        if loc is None:
            return await html_to_bmp(_no_location_html(), scale=1)
        data = await _fetch(loc.latitude, loc.longitude)
        html = render_html(data, loc.place)
        return await html_to_bmp(html, scale=1)
