"""Font test renderer — a specimen sheet for comparing fonts on epaper.

Stateless (no per-user config): it draws the same pangram and a numeric line in
several typefaces, each shown at a range of sizes, then runs the whole thing
through the normal HTML→1-bit BMP pipeline. That's the point — you see exactly
how each font survives supersampling + the 1-bit threshold on the real panel, so
you can pick the one that reads best for body text at the size you care about.

Fonts fall into two groups:

* Outline fonts (serif / sans / mono generics, plus a couple of common web-safe
  families) render supersampled at ``SCALE`` so their antialiased edges resolve
  cleanly through the threshold.
* The bundled Cozette pixel font renders at ``scale=1`` on its native grid;
  supersampling a bitmap font only softens it, so it gets its own pass and the
  two images are stacked.
"""

from __future__ import annotations

from html import escape
from pathlib import Path

from PIL import Image

from app.features.bitmap.renderers.base import (
    NATIVE_SIZE,
    SCALE,
    Size,
    html_to_bmp,
    image_to_bmp,
)

FONTS_DIR = Path(__file__).parent.parent / "fonts"

# Sizes (px) each specimen is shown at, small→large, to judge legibility across
# the range you'd actually use for labels and body text on the panel.
SIZES = [11, 13, 16, 20, 26]

# A short sample that exercises ascenders, descenders, and every letter, plus a
# digit/punctuation line since numbers matter for clocks, weather, and stats.
# Kept short so the largest sizes still fit the 480px panel without clipping.
PANGRAM = "Quick brown fox jumps"
GLYPHS = "0123456789 .,:!? $1,234.56"

# Outline families rendered through the supersampled pass. `stack` is the CSS
# font-family list; the first name is the label. Generic families let the
# headless browser fall back to whatever it bundles, while still comparing the
# serif / sans / mono shapes that matter for a 1-bit panel.
OUTLINE_FONTS: list[tuple[str, str]] = [
    ("Sans-serif", "sans-serif"),
    ("Serif", "serif"),
    ("Monospace", "monospace"),
    ("Helvetica", "Helvetica, Arial, sans-serif"),
    ("Georgia", "Georgia, 'Times New Roman', serif"),
    ("Courier", "'Courier New', Courier, monospace"),
]


def _specimen(label: str, stack: str) -> str:
    """One font block: a label, then a line per size, each showing the pangram
    and the digit/glyph run together so letters and numbers are always compared
    at the exact same size ladder across every font."""
    rows: list[str] = []
    for px in SIZES:
        rows.append(
            f'<div class="line" style="font-size:{px}px">'
            f'<span class="sz">{px}px</span>'
            f'<span class="txt">{escape(PANGRAM)}  {escape(GLYPHS)}</span></div>'
        )
    return (
        f'<div class="spec" style="font-family:{stack}">'
        f'<div class="fname">{escape(label)}</div>'
        f'{"".join(rows)}</div>'
    )


def _outline_html(specimens: str, note: str) -> str:
    return f"""\
<!doctype html><html lang="en"><head><meta charset="utf-8">
<style>
  *{{box-sizing:border-box;margin:0;padding:0;}}
  html,body{{width:100vw;height:100vh;background:#000;color:#fff;
    font-family:sans-serif;-webkit-font-smoothing:antialiased;}}
  body{{padding:18px 20px;}}
  h1{{font-size:16px;font-weight:800;text-transform:uppercase;
    letter-spacing:1px;border-bottom:2px solid #fff;padding-bottom:8px;
    margin-bottom:12px;}}
  .spec{{padding:8px 0;border-bottom:1px solid #fff;}}
  .fname{{font-family:sans-serif;font-size:11px;font-weight:800;
    text-transform:uppercase;letter-spacing:1px;color:#fff;margin-bottom:4px;}}
  .line{{display:flex;align-items:baseline;gap:8px;line-height:1.25;
    white-space:nowrap;overflow:hidden;}}
  .line .sz{{font-family:sans-serif;font-size:9px;font-weight:700;color:#fff;
    width:34px;flex:none;text-align:right;opacity:.7;}}
  .line .txt{{flex:1;overflow:hidden;text-overflow:ellipsis;}}
  .note{{font-family:sans-serif;font-size:9px;color:#fff;opacity:.7;
    margin-top:10px;text-align:center;}}
</style></head><body>
  <h1>Font Test · Outline</h1>
  {specimens}
  <div class="note">{escape(note)}</div>
</body></html>"""


def _cozette_html() -> str:
    reg = (FONTS_DIR / "Cozette.ttf").as_uri()
    bold = (FONTS_DIR / "CozetteBold.ttf").as_uri()
    # Same size ladder as the outline pass so numbers/letters line up across the
    # whole sheet. (Cozette is a 13px bitmap font, so non-13 multiples are
    # scaled by the browser — fine for a like-for-like size comparison.)
    rows = "".join(
        f'<div class="line" style="font-size:{px}px">'
        f'<span class="sz">{px}px</span>'
        f'<span class="txt">{escape(PANGRAM)}  {escape(GLYPHS)}</span></div>'
        for px in SIZES
    )
    return f"""\
<!doctype html><html lang="en"><head><meta charset="utf-8">
<style>
  @font-face {{ font-family:"Cozette"; font-weight:400;
    src:url("{reg}") format("truetype"); }}
  @font-face {{ font-family:"Cozette"; font-weight:700;
    src:url("{bold}") format("truetype"); }}
  *{{box-sizing:border-box;margin:0;padding:0;}}
  html,body{{width:100vw;height:100vh;background:#000;color:#fff;
    font-family:"Cozette",monospace;-webkit-font-smoothing:none;
    font-smooth:never;text-rendering:geometricPrecision;}}
  body{{padding:18px 20px;}}
  h1{{font-family:"Cozette",monospace;font-size:16px;font-weight:700;
    text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #fff;
    padding-bottom:8px;margin-bottom:12px;}}
  .line{{display:flex;align-items:baseline;gap:8px;line-height:1.15;
    white-space:nowrap;overflow:hidden;margin-bottom:6px;}}
  .line .sz{{font-size:13px;font-weight:700;width:44px;flex:none;
    text-align:right;opacity:.7;}}
  .line .txt{{flex:1;overflow:hidden;}}
</style></head><body>
  <h1>Cozette (pixel · scale 1)</h1>
  {rows}
</body></html>"""


def _stack_vertical(top: bytes, bottom: bytes, size: Size) -> Image.Image:
    """Stack two 1-bit BMPs into one panel-sized image (top 70% / bottom 30%).

    Both passes are already rendered at their exact final pixel height, so we
    only paste — no resampling. Resizing a 1-bit image here would soften every
    glyph the pipeline just thresholded crisply.
    """
    from io import BytesIO

    width, height = size
    top_h = int(height * 0.7)
    a = Image.open(BytesIO(top)).convert("1")
    b = Image.open(BytesIO(bottom)).convert("1")
    canvas = Image.new("1", (width, height), 0)  # black background (epaper convention)
    canvas.paste(a, (0, 0))
    canvas.paste(b, (0, top_h))
    return canvas


class FontTestRenderer:
    """Stateless specimen sheet; no session or user needed."""

    async def render(self, size: Size = NATIVE_SIZE) -> bytes:
        width, height = size
        # Outline pass fills the top 70% of the panel; Cozette pass the bottom 30%.
        top_h = int(height * 0.7)
        bot_h = height - top_h

        specimens = "".join(_specimen(label, stack) for label, stack in OUTLINE_FONTS)
        note = f"Same pangram in each face · supersampled ×{SCALE} then 1-bit"
        outline_bmp = await html_to_bmp(
            _outline_html(specimens, note), size=(width, top_h), scale=SCALE
        )
        cozette_bmp = await html_to_bmp(_cozette_html(), size=(width, bot_h), scale=1)

        stacked = _stack_vertical(outline_bmp, cozette_bmp, size)
        return await image_to_bmp(stacked)
