"""Welcome renderer — a composed "poster" of custom text, laid out for epaper.

The user writes the text in their own language (see ``WelcomeConfig``); this
renderer arranges it as a framed poster — a hairline border, a small eyebrow
kicker, a big heading, a divider rule, the body lines, and an optional footer —
then runs it through the normal supersampled → 1-bit BMP pipeline. Everything is
plain black/white with strong structure so it reads well on the panel. No
network, no AI — just the stored strings.

The ``body`` string is free text; its lines are split into three roles by blank
lines: an optional *eyebrow* (a single short line before a blank line), the main
paragraph lines, and an optional *footer* (a single line after a trailing blank
line). Most users just type a few lines and get heading + those lines.
"""

from __future__ import annotations

import uuid
from html import escape

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_models import WelcomeConfig
from app.features.bitmap.renderers.base import NATIVE_SIZE, SANS_STACK, Size, html_to_bmp

# Shown until the user writes their own, and as the store/preview sample. The
# blank-line groups become eyebrow / body / footer (see module docstring).
_DEFAULT_HEADING = "Welcome"
_DEFAULT_BODY = (
    "Hello & good to see you\n"
    "\n"
    "Make yourself at home.\n"
    "The coffee is fresh, the wifi is fast,\n"
    "and you're always welcome here.\n"
    "\n"
    "Enjoy your stay"
)


def _split_roles(body: str) -> tuple[str | None, list[str], str | None]:
    """Split the body into (eyebrow, lines, footer) by blank-line groups.

    Blank lines separate groups. A single-line leading group becomes the eyebrow;
    a single-line trailing group becomes the footer; everything in between is the
    body. With no blank lines, all lines are body (eyebrow/footer are None).
    """
    groups: list[list[str]] = []
    current: list[str] = []
    for raw in body.splitlines():
        line = raw.strip()
        if line:
            current.append(line)
        elif current:
            groups.append(current)
            current = []
    if current:
        groups.append(current)

    if not groups:
        return None, [], None

    eyebrow: str | None = None
    footer: str | None = None
    # A short single-line first/last group reads as a kicker/footer, not body.
    if len(groups) > 1 and len(groups[0]) == 1:
        eyebrow = groups.pop(0)[0]
    if len(groups) > 1 and len(groups[-1]) == 1:
        footer = groups.pop()[0]

    lines = [ln for group in groups for ln in group]
    return eyebrow, lines, footer


def render_html(heading: str, body: str, *, size: Size = NATIVE_SIZE) -> str:
    """Lay the text out as a framed poster, scaled to the render size.

    All sizes derive from the render dimensions so the composition stays balanced
    at any geometry, portrait or landscape.
    """
    width, height = size
    short_edge = min(width, height)

    heading_px = max(30, round(short_edge * 0.12))
    body_px = max(15, round(short_edge * 0.045))
    eyebrow_px = max(12, round(short_edge * 0.03))
    footer_px = max(11, round(short_edge * 0.028))
    pad_px = max(24, round(short_edge * 0.09))
    border_px = max(2, round(short_edge * 0.006))
    rule_w = round(short_edge * 0.16)

    eyebrow, lines, footer = _split_roles(body)
    body_html = "".join(f"<p>{escape(ln)}</p>" for ln in lines)

    eyebrow_html = f'<div class="eyebrow">{escape(eyebrow)}</div>' if eyebrow else ""
    footer_html = f'<div class="footer">{escape(footer)}</div>' if footer else ""

    return f"""\
<!doctype html><html lang="en"><head><meta charset="utf-8">
<style>
  *{{box-sizing:border-box;margin:0;padding:0;}}
  html,body{{width:100vw;height:100vh;background:#000;color:#fff;
    font-family:{SANS_STACK};-webkit-font-smoothing:antialiased;}}
  body{{padding:{round(pad_px * 0.45)}px;}}
  .frame{{width:100%;height:100%;border:{border_px}px solid #fff;
    border-radius:{round(short_edge * 0.03)}px;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;padding:{pad_px}px;position:relative;}}
  /* Reserve room for the absolutely-positioned footer so the centered block sits
     optically centered *with* the footer, not floating above it. */
  .frame{{padding-bottom:{round(pad_px + footer_px * 3) if footer else pad_px}px;}}
  /* Small corner ticks for a bit of decoration. */
  .frame::before,.frame::after{{content:"";position:absolute;
    width:{round(short_edge * 0.06)}px;height:{round(short_edge * 0.06)}px;
    border-color:#fff;border-style:solid;border-width:0;}}
  .frame::before{{top:{round(pad_px * 0.5)}px;left:{round(pad_px * 0.5)}px;
    border-top-width:{border_px}px;border-left-width:{border_px}px;}}
  .frame::after{{bottom:{round(pad_px * 0.5)}px;right:{round(pad_px * 0.5)}px;
    border-bottom-width:{border_px}px;border-right-width:{border_px}px;}}
  .eyebrow{{font-size:{eyebrow_px}px;font-weight:700;text-transform:uppercase;
    letter-spacing:{max(2, round(eyebrow_px * 0.18))}px;opacity:0.85;
    margin-bottom:{round(heading_px * 0.35)}px;}}
  h1{{font-size:{heading_px}px;font-weight:800;line-height:1.05;
    letter-spacing:-1px;}}
  .rule{{width:{rule_w}px;height:{border_px}px;background:#fff;
    margin:{round(heading_px * 0.5)}px 0;opacity:0.9;}}
  .body{{display:flex;flex-direction:column;gap:{round(body_px * 0.5)}px;
    max-width:100%;}}
  .body p{{font-size:{body_px}px;font-weight:500;line-height:1.45;opacity:0.95;}}
  .footer{{position:absolute;bottom:{round(pad_px * 0.9)}px;left:0;right:0;
    font-size:{footer_px}px;font-weight:700;text-transform:uppercase;
    letter-spacing:{max(2, round(footer_px * 0.2))}px;opacity:0.75;}}
</style></head><body>
  <div class="frame">
    {eyebrow_html}
    <h1>{escape(heading)}</h1>
    {'<div class="rule"></div>' if body_html else ''}
    {f'<div class="body">{body_html}</div>' if body_html else ''}
    {footer_html}
  </div>
</body></html>"""


class WelcomeRenderer:
    def __init__(self, session: AsyncSession, user_id: uuid.UUID) -> None:
        self.session: AsyncSession = session
        self.user_id: uuid.UUID = user_id

    async def render(self, size: Size = NATIVE_SIZE) -> bytes:
        cfg = await self.session.get(WelcomeConfig, self.user_id)
        heading = cfg.heading if cfg else _DEFAULT_HEADING
        body = cfg.body if cfg else _DEFAULT_BODY
        return await html_to_bmp(render_html(heading, body, size=size), size=size)
