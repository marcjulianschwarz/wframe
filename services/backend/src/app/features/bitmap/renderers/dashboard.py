"""Dashboard renderer — verbatim port of loop_frame.render_dashboard."""

import random
import re
from datetime import datetime

from app.features.bitmap.renderers.base import TEMPLATES_DIR, html_to_bmp

CONDS = ["Partly Cloudy", "Clear", "Light Rain", "Overcast", "Sunny", "Foggy", "Windy"]
ICONS = ["&#9728;", "&#9729;", "&#9730;", "&#9925;", "&#9928;"]


def dash_mutate(s: str) -> str:
    now = datetime.now()
    low = random.randint(-8, 18)
    high = low + random.randint(2, 12)
    s = re.sub(r'<div class="temp">-?\d+&deg;</div>', f'<div class="temp">{random.randint(low, high)}&deg;</div>', s)
    s = re.sub(r'<div class="cond">[^<]*</div>', f'<div class="cond">{random.choice(CONDS)}</div>', s)
    s = re.sub(r'<div class="icon">[^<]*</div>', f'<div class="icon">{random.choice(ICONS)}</div>', s)
    s = re.sub(
        r'<div class="meta">[^<]*</div>',
        f'<div class="meta">H {high}&deg; &middot; L {low}&deg; &middot; Humidity {random.randint(20, 95)}%</div>',
        s,
    )
    s = re.sub(r"<span>Updated [^<]*</span>", f"<span>Updated {now.strftime('%H:%M:%S')}</span>", s)
    s = re.sub(r'<div class="date">[^<]*</div>', f'<div class="date">{now.strftime("%a %d %b")}</div>', s)
    # Steps (first .value) and Battery % (second .value, has a <span> unit)
    s = re.sub(r'<div class="value">[\d,]+</div>', f'<div class="value">{random.randint(0, 25000):,}</div>', s, count=1)
    s = re.sub(
        r'<div class="value">\d+<span class="unit">%</span></div>',
        f'<div class="value">{random.randint(5, 100)}<span class="unit">%</span></div>',
        s,
    )
    return s


class DashboardRendererImpl:
    async def render(self) -> bytes:
        html = (TEMPLATES_DIR / "dashboard.html").read_text()
        html = dash_mutate(html)
        return await html_to_bmp(html)
