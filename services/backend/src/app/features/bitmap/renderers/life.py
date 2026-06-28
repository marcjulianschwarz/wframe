"""Conway's Game of Life renderer.

The simulation (stepping, seeding) runs in Python with numpy and its grid is
persisted in the DB between pulls. Rendering — both the live board and the
one-tick "Restarting…" screen — is done as an HTML page rasterised by
Playwright, so there are no font files or PIL drawing involved.
"""

from __future__ import annotations

import random
import uuid
from io import BytesIO
from typing import cast

import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_models import LifeState
from app.features.bitmap.renderers.base import HEIGHT, WIDTH, html_to_bmp

LIFE_W, LIFE_H, LIFE_CELL = 60, 100, 8
LIFE_STEPS_PER_TICK = 5
RESEED_AFTER_GEN = 500

PATTERNS = {
    "r_pentomino": [(0, 1), (0, 2), (1, 0), (1, 1), (2, 1)],
    "acorn": [(0, 1), (1, 3), (2, 0), (2, 1), (2, 4), (2, 5), (2, 6)],
    "diehard": [(0, 6), (1, 0), (1, 1), (2, 1), (2, 5), (2, 6), (2, 7)],
    "bunnies": [(0, 0), (0, 6), (1, 4), (2, 4), (2, 7), (3, 1), (3, 3), (3, 5), (3, 7)],
}


def life_seed() -> np.ndarray:
    g = np.zeros((LIFE_H, LIFE_W), dtype=np.uint8)
    name = random.choice(list(PATTERNS))
    pat = PATTERNS[name]
    mdy = max(p[0] for p in pat) + 1
    mdx = max(p[1] for p in pat) + 1
    y = (LIFE_H - mdy) // 2
    x = (LIFE_W - mdx) // 2
    for dy, dx in pat:
        g[y + dy, x + dx] = 1
    return g


def life_seed_clusters() -> np.ndarray:
    """Scatter several known patterns across the grid for a lively restart."""
    g = np.zeros((LIFE_H, LIFE_W), dtype=np.uint8)
    names = list(PATTERNS)
    for _ in range(random.randint(3, 5)):
        pat = PATTERNS[random.choice(names)]
        mdy = max(p[0] for p in pat) + 1
        mdx = max(p[1] for p in pat) + 1
        # keep a 2-cell margin so clusters start with room to breathe
        y = random.randint(2, max(2, LIFE_H - mdy - 2))
        x = random.randint(2, max(2, LIFE_W - mdx - 2))
        for dy, dx in pat:
            g[y + dy, x + dx] = 1
    return g


def life_step(g: np.ndarray) -> np.ndarray:
    n = sum(np.roll(g, (dy, dx), (0, 1)) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy, dx) != (0, 0))
    alive = cast("np.ndarray", (n == 3) | ((g == 1) & (n == 2)))
    return alive.astype(np.uint8)


def grid_to_bytes(g: np.ndarray) -> bytes:
    buf = BytesIO()
    np.save(buf, g)
    return buf.getvalue()


def grid_from_bytes(b: bytes) -> np.ndarray:
    return cast("np.ndarray", np.load(BytesIO(b)))


# ---------- HTML rendering ----------

_RESTART_HTML = """\
<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:100%;height:100%;background:#fff;}
  body{display:flex;align-items:center;justify-content:center;
       font-family:-apple-system,Helvetica,Arial,sans-serif;}
  .msg{color:#000;font-size:64px;font-weight:700;letter-spacing:2px;}
</style></head><body><div class="msg">Restarting&hellip;</div></body></html>
"""


def _grid_html(g: np.ndarray) -> str:
    """A canvas page that paints the grid from a flat 0/1 string."""
    flat = "".join(map(str, g.flatten().tolist()))
    return f"""\
<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{{margin:0;width:100%;height:100%;background:#fff;}}
  canvas{{display:block;width:100vw;height:100vh;image-rendering:pixelated;}}
</style></head><body>
<canvas id="c" width="{WIDTH}" height="{HEIGHT}"></canvas>
<script>
  const W={LIFE_W}, H={LIFE_H}, CELL={LIFE_CELL};
  const cells="{flat}";
  const ctx=document.getElementById('c').getContext('2d');
  ctx.fillStyle="#fff"; ctx.fillRect(0,0,{WIDTH},{HEIGHT});
  ctx.fillStyle="#000";
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)
    if(cells[y*W+x]==='1') ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
</script></body></html>
"""


class LifeRenderer:
    def __init__(self, session: AsyncSession, user_id: uuid.UUID) -> None:
        self.session: AsyncSession = session
        self.user_id: uuid.UUID = user_id

    async def _load_state(self) -> LifeState:
        state = await self.session.get(LifeState, self.user_id)
        if state is None:
            grid = life_seed()
            state = LifeState(user_id=self.user_id, grid=grid_to_bytes(grid), generation=0)
            self.session.add(state)
            await self.session.flush()
            await self.session.refresh(state)
        return state

    async def render(self) -> bytes:
        state = await self._load_state()

        # generation == -1 is the "restart pending" sentinel set on the previous
        # pull: seed fresh clusters and resume the simulation this tick.
        if state.generation < 0:
            grid = life_seed_clusters()
            state.generation = 0
            state.grid = grid_to_bytes(grid)
            await self.session.flush()
            return await html_to_bmp(_grid_html(grid))

        grid = grid_from_bytes(state.grid)
        for _ in range(LIFE_STEPS_PER_TICK):
            grid = life_step(grid)
            state.generation += 1

        # Died out or ran too long → show "Restarting…" this pull, then on the
        # next pull seed fresh clusters (generation < 0 branch above).
        if int(cast("int", grid.sum())) == 0 or state.generation > RESEED_AFTER_GEN:
            state.generation = -1
            # grid is unused while restarting; keep the last grid bytes as-is.
            await self.session.flush()
            return await html_to_bmp(_RESTART_HTML)

        state.grid = grid_to_bytes(grid)
        await self.session.flush()
        return await html_to_bmp(_grid_html(grid))
