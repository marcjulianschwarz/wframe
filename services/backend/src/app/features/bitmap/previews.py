"""Example HTML previews for each dashboard.

The in-app preview shows the *live HTML* (in an iframe), not the rasterized
BMP, so the user can see exactly how a dashboard is laid out before deploying.
Previews use canned example data and never hit the network, the DB, or any AI
model. Some inject a tiny JS loop so values animate, illustrating how the
dashboard changes over time.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta

from app.features.bitmap.renderers.base import TEMPLATES_DIR
from app.features.dashboard.dashboard_models import DashboardType


# --------------------------------------------------------------------------- #
# weather — reuses the real renderer's HTML with a sample Open-Meteo payload
# --------------------------------------------------------------------------- #
def _weather_preview() -> str:
    from app.features.bitmap.renderers.weather import Forecast, render_html

    now = datetime.now()
    # 24h sample temperature curve (a smooth daily swing), shaped like the real
    # Open-Meteo response so _render_html treats it exactly as live data.
    times = [
        (now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=i)).strftime("%Y-%m-%dT%H:00")
        for i in range(24)
    ]
    temps = [round(16 + 6 * math.sin((i - 3) / 24 * 2 * math.pi), 1) for i in range(24)]
    data = {
        "current": {
            "time": times[0],
            "temperature_2m": temps[0],
            "relative_humidity_2m": 61,
            "wind_speed_10m": 12.0,
            "weather_code": 2,
        },
        "hourly": {"time": times, "temperature_2m": temps},
        "daily": {
            "temperature_2m_max": [max(temps)],
            "temperature_2m_min": [min(temps)],
            "sunrise": [now.strftime("%Y-%m-%dT04:52")],
            "sunset": [now.strftime("%Y-%m-%dT21:48")],
        },
    }
    return render_html(Forecast.model_validate(data), "Example City")


# --------------------------------------------------------------------------- #
# github — reuses the real renderer's HTML with a sample profile + repos
# --------------------------------------------------------------------------- #
def _github_preview() -> str:
    from app.features.bitmap.renderers.github import (
        Profile,
        Repo,
        aggregate,
        render_html,
    )

    profile = {
        "login": "octocat",
        "name": "The Octocat",
        "bio": "Building epaper dashboards and other small, sharp tools.",
        "followers": 9123,
        "following": 42,
        "public_repos": 58,
        "created_at": "2011-01-25T00:00:00Z",
    }
    repos = [
        {"name": "wframe", "language": "Python", "stargazers_count": 1820, "forks_count": 96, "fork": False},
        {"name": "cozette-epaper", "language": "Python", "stargazers_count": 642, "forks_count": 31, "fork": False},
        {"name": "bitmap-tools", "language": "Rust", "stargazers_count": 410, "forks_count": 22, "fork": False},
        {"name": "esphome-frames", "language": "C++", "stargazers_count": 233, "forks_count": 18, "fork": False},
        {"name": "dotfiles", "language": "Shell", "stargazers_count": 88, "forks_count": 9, "fork": False},
        {"name": "site", "language": "TypeScript", "stargazers_count": 21, "forks_count": 3, "fork": False},
    ]
    repo_models = [Repo.model_validate(r) for r in repos]
    return render_html(Profile.model_validate(profile), aggregate(repo_models))


# --------------------------------------------------------------------------- #
# dashboard (template-based)
# --------------------------------------------------------------------------- #
def _dashboard_preview() -> str:
    html = (TEMPLATES_DIR / "dashboard.html").read_text()
    now = datetime.now()
    html = html.replace(
        '<div class="date">Sat 27 Jun</div>',
        f'<div class="date">{now.strftime("%a %d %b")}</div>',
    )
    # Inject an animator before </body> that cycles the hero/stat values.
    script = """
<script>
  const conds = ["Clear","Partly Cloudy","Light Rain","Overcast","Sunny","Windy"];
  const icons = ["\\u2600","\\u2601","\\u2602","\\u26C5","\\u26C8"];
  function rnd(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
  function tick(){
    const low = rnd(-8,18), high = low + rnd(2,12);
    document.querySelector('.temp').innerHTML = rnd(low,high)+'\\u00b0';
    document.querySelector('.cond').textContent = conds[rnd(0,conds.length-1)];
    document.querySelector('.icon').textContent = icons[rnd(0,icons.length-1)];
    document.querySelector('.meta').innerHTML =
      'H '+high+'\\u00b0 \\u00b7 L '+low+'\\u00b0 \\u00b7 Humidity '+rnd(20,95)+'%';
    const vals = document.querySelectorAll('.stat .value');
    if(vals[0]) vals[0].textContent = rnd(0,25000).toLocaleString();
    if(vals[1]) vals[1].innerHTML = rnd(5,100)+'<span class="unit">%</span>';
    const f = document.querySelector('footer span');
    if(f) f.textContent = 'Updated '+new Date().toLocaleTimeString();
  }
  tick(); setInterval(tick, 1500);
</script>
"""
    return html.replace("</body>", script + "</body>")


# --------------------------------------------------------------------------- #
# hn_zeitung
# --------------------------------------------------------------------------- #
def _hn_preview() -> str:
    from app.features.bitmap.renderers.hn_zeitung import Item, render_html

    items = [
        Item(
            id=1,
            title="Show HN: I built an epaper dashboard framework",
            url="https://example.com/wframe",
            by="marcjulian",
            score=412,
            descendants=137,
            summary="A small framework that renders selectable dashboards to "
            + "1-bit BMPs for epaper displays driven by ESPHome boards.",
        ),
        Item(
            id=2,
            title="The case against unmaintained dependencies",
            url="https://example.com/deps",
            by="dep_skeptic",
            score=288,
            descendants=95,
            summary="Why pinning a five-year-old library is a slow-motion "
            + "outage, with a worked example from password hashing.",
        ),
        Item(
            id=3,
            title="Open-Meteo: free weather data without an API key",
            url="https://open-meteo.com",
            by="weatherfan",
            score=201,
            descendants=44,
            summary="A free forecast API with hourly and daily fields, ideal "
            + "for hobby dashboards and ambient displays.",
        ),
        Item(
            id=4,
            title="Pixel fonts and 1-bit rendering",
            url="https://example.com/cozette",
            by="typenerd",
            score=156,
            descendants=60,
            summary="How rendering bitmap fonts at native size keeps glyphs "
            + "crisp once you threshold to pure black and white.",
        ),
    ]
    return render_html(items)


# --------------------------------------------------------------------------- #
# life
# --------------------------------------------------------------------------- #
def _life_preview() -> str:
    """A self-contained Conway's Game of Life that animates in the browser."""
    return """\
<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:480px;height:800px;background:#fff;}
  canvas{display:block;width:480px;height:800px;image-rendering:pixelated;}
</style></head><body>
<canvas id="c" width="480" height="800"></canvas>
<script>
  const W=60,H=100,CELL=8;
  let g=Array.from({length:H},()=>Array.from({length:W},()=>Math.random()<0.28?1:0));
  const ctx=document.getElementById('c').getContext('2d');
  function draw(){
    ctx.fillStyle="#fff";ctx.fillRect(0,0,480,800);ctx.fillStyle="#000";
    for(let y=0;y<H;y++)for(let x=0;x<W;x++)
      if(g[y][x])ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
  }
  function step(){
    const n=Array.from({length:H},()=>new Array(W).fill(0));
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      let c=0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(!dy&&!dx)continue;
        const yy=(y+dy+H)%H,xx=(x+dx+W)%W;c+=g[yy][xx];
      }
      n[y][x]=(c===3||(g[y][x]&&c===2))?1:0;
    }
    g=n;
  }
  let gen=0;
  function tick(){
    draw();step();
    if(++gen>400){g=Array.from({length:H},()=>Array.from({length:W},
      ()=>Math.random()<0.28?1:0));gen=0;}
  }
  tick();setInterval(tick,200);
</script></body></html>"""


# --------------------------------------------------------------------------- #
# custom_url
# --------------------------------------------------------------------------- #
def _custom_url_preview() -> str:
    return """\
<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:480px;height:800px;background:#fff;
    font-family:-apple-system,Helvetica,Arial,sans-serif;}
  body{display:flex;flex-direction:column;align-items:center;
    justify-content:center;text-align:center;padding:40px;color:#000;}
  h1{font-size:40px;font-weight:700;margin-bottom:20px;}
  p{font-size:18px;line-height:1.5;}
</style></head><body>
  <h1>Custom URL</h1>
  <p>Enter a URL above. Your epaper will render<br>that live web page as a bitmap.</p>
</body></html>"""


# --------------------------------------------------------------------------- #
# homeassistant — reuses the real renderer's HTML with sample lights
# --------------------------------------------------------------------------- #
def _homeassistant_preview() -> str:
    from app.features.bitmap import ha_cache
    from app.features.bitmap.renderers.homeassistant import render_html

    lights = [
        ha_cache.Light(name="Living Room", is_on=True, brightness=204),
        ha_cache.Light(name="Kitchen", is_on=True, brightness=128),
        ha_cache.Light(name="Bedroom", is_on=True, brightness=46),
        ha_cache.Light(name="Hallway", is_on=False, brightness=0),
        ha_cache.Light(name="Desk Lamp", is_on=True, brightness=255),
        ha_cache.Light(name="Porch", is_on=False, brightness=None),
    ]
    return render_html(lights)


def _image_preview() -> str:
    return """\
<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:480px;height:800px;background:#fff;color:#000;
    font-family:-apple-system,Helvetica,Arial,sans-serif;}
  body{display:flex;flex-direction:column;align-items:center;
    justify-content:center;text-align:center;padding:40px;}
  h1{font-size:40px;font-weight:700;margin-bottom:20px;}
  p{font-size:18px;line-height:1.5;}
</style></head><body>
  <h1>Image</h1>
  <p>Upload an image and pick a dithering<br>style. Your epaper shows it fullscreen.</p>
</body></html>"""


# --------------------------------------------------------------------------- #
# vag — reuses the real renderer's HTML with canned departures
# --------------------------------------------------------------------------- #
def _vag_preview() -> str:
    from app.features.bitmap.renderers.vag import Departures, render_html

    now = datetime.now().replace(second=0, microsecond=0)

    def dep(line: str, direction: str, product: str, mins: int, delay: int, platform: str) -> dict[str, str]:
        return {
            "Linienname": line,
            "Richtungstext": direction,
            "AbfahrtszeitSoll": (now + timedelta(minutes=mins - delay)).isoformat(),
            "AbfahrtszeitIst": (now + timedelta(minutes=mins)).isoformat(),
            "Produkt": product,
            "HaltesteigText": platform,
        }

    data = {
        "Metadata": {"Timestamp": now.isoformat()},
        "Haltestellenname": "Plärrer (Nürnberg)",
        "Abfahrten": [
            dep("U1", "Langwasser Süd", "UBahn", 0, 0, "2"),
            dep("U2", "Röthenbach", "UBahn", 2, 1, "1"),
            dep("4", "Gibitzenhof", "Tram", 4, 0, "A"),
            dep("U1", "Fürth Hardhöhe", "UBahn", 6, 0, "1"),
            dep("6", "Doku-Zentrum", "Tram", 9, 3, "B"),
            dep("34", "Gebersdorf", "Bus", 12, 0, "C"),
            dep("U3", "Nordwestring", "UBahn", 15, 0, "2"),
            dep("283", "Worzeldorf", "Bus", 21, 0, "D"),
        ],
        "Sonderinformationen": [],
    }
    return render_html("Plärrer (Nürnberg)", Departures.model_validate(data), now)


def _welcome_preview() -> str:
    from app.features.bitmap.renderers.welcome import (
        _DEFAULT_BODY,
        _DEFAULT_EYEBROW,
        _DEFAULT_FOOTER,
        _DEFAULT_HEADING,
        render_html,
    )

    return render_html(
        _DEFAULT_HEADING, _DEFAULT_BODY, eyebrow=_DEFAULT_EYEBROW, footer=_DEFAULT_FOOTER
    )


def _calendar_preview() -> str:
    from app.features.bitmap.renderers.calendar import Event, render_html

    now = datetime.now()
    base = now.replace(hour=0, minute=0, second=0, microsecond=0)

    def at(days: int, hour: int, minute: int = 0) -> datetime:
        return base + timedelta(days=days, hours=hour, minutes=minute)

    events = [
        Event("Team standup", at(0, 9, 30), all_day=False, location="Zoom"),
        Event("Dentist", at(0, 14), all_day=False, location="Hauptstr. 12"),
        Event("Anna's birthday", at(1, 0), all_day=True),
        Event("Design review", at(2, 11), all_day=False, location="Room 4B"),
        Event("Flight to Berlin", at(3, 7, 15), all_day=False, location="NUE T1"),
        Event("Dinner with Sam", at(4, 19, 30), all_day=False),
        Event("Sprint planning", at(6, 10), all_day=False),
    ]
    return render_html(events, now)


def _homeassistant_temp_preview() -> str:
    import math
    import time

    from app.features.bitmap import ha_cache
    from app.features.bitmap.renderers.homeassistant import render_sensor_html

    # A day's worth of hourly readings: a gentle diurnal curve so the chart and
    # high/low stats look real in the store thumbnail.
    times = [f"2026-06-27T{h:02d}:00:00" for h in range(24)]
    values = [round(18 + 6 * math.sin((h - 9) / 24 * 2 * math.pi), 1) for h in range(24)]
    series = ha_cache.SensorSeries(
        name="Living Room", unit="°C", times=times, values=values, received_at=time.monotonic()
    )
    return render_sensor_html(series)


_PREVIEWS = {
    DashboardType.WEATHER: _weather_preview,
    DashboardType.GITHUB: _github_preview,
    DashboardType.HOMEASSISTANT: _homeassistant_preview,
    DashboardType.HOMEASSISTANT_TEMP: _homeassistant_temp_preview,
    DashboardType.IMAGE: _image_preview,
    DashboardType.DASHBOARD: _dashboard_preview,
    DashboardType.HN_ZEITUNG: _hn_preview,
    DashboardType.LIFE: _life_preview,
    DashboardType.CUSTOM_URL: _custom_url_preview,
    DashboardType.VAG: _vag_preview,
    DashboardType.WELCOME: _welcome_preview,
    DashboardType.CALENDAR: _calendar_preview,
}


def preview_html(dashboard_type: DashboardType) -> str:
    fn = _PREVIEWS.get(dashboard_type)
    if fn is None:
        raise ValueError(f"No preview for {dashboard_type}")
    return fn()


def draft_preview_html(
    dashboard_type: DashboardType,
    *,
    welcome_eyebrow: str | None = None,
    welcome_heading: str | None = None,
    welcome_body: str | None = None,
    welcome_footer: str | None = None,
) -> str:
    """Live HTML preview reflecting *unsaved* edits for the view editor.

    For the text-configurable Welcome type we render the renderer's own
    ``render_html`` with the draft values, so the preview updates as the user
    types — before anything is saved. For every other type there is no free-text
    config to preview synchronously, so we fall back to the canned example.
    """
    if dashboard_type == DashboardType.WELCOME:
        from app.features.bitmap.renderers.welcome import _DEFAULT_HEADING, render_html

        # Any provided draft field is used verbatim (including empty strings);
        # only a missing field falls back — and the only sensible fallback is a
        # non-empty heading so the poster isn't blank.
        return render_html(
            welcome_heading or _DEFAULT_HEADING,
            welcome_body or "",
            eyebrow=welcome_eyebrow or "",
            footer=welcome_footer or "",
        )

    if dashboard_type == DashboardType.CALENDAR:
        # Calendar text config is just the feed URL, which we can't fetch
        # synchronously here; the draft preview shows the sample agenda so the
        # user sees the layout. The saved render will use their real feed.
        return _calendar_preview()

    return preview_html(dashboard_type)
