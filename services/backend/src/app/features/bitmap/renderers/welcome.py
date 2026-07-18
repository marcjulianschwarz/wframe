"""Welcome renderer — a composed "poster" of custom text, laid out for epaper.

The user writes the text in their own language (see ``WelcomeConfig``); this
renderer arranges it as a framed poster — a hairline border, a small eyebrow
kicker, a big heading, a divider rule, the body lines, and an optional footer —
then runs it through the normal supersampled → 1-bit BMP pipeline. Everything is
plain black/white with strong structure so it reads well on the panel. No
network, no AI — just the stored strings.

Each visual role is its own stored field: ``eyebrow`` (kicker), ``heading``,
``body`` (one line per row, newline-separated), and ``footer``. Empty roles are
simply omitted — nothing is inferred from position, so a blank kicker never
promotes a body line.
"""

from __future__ import annotations

import uuid
from html import escape

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_models import WelcomeConfig
from app.features.bitmap.renderers.base import NATIVE_SIZE, SANS_STACK, Size, html_to_bmp

# Shown until the user writes their own, and as the store/preview sample.
_DEFAULT_EYEBROW = "Hello & good to see you"
_DEFAULT_HEADING = "Welcome"
_DEFAULT_BODY = (
    "Make yourself at home.\n"
    "The coffee is fresh, the wifi is fast,\n"
    "and you're always welcome here."
)
_DEFAULT_FOOTER = "Enjoy your stay"


def render_html(
    heading: str,
    body: str = "",
    *,
    eyebrow: str = "",
    footer: str = "",
    size: Size = NATIVE_SIZE,
) -> str:
    """Lay the text out as a framed poster, scaled to the render size.

    ``body`` is newline-separated lines. ``eyebrow`` and ``footer`` are optional
    single lines; empty ones are omitted. All sizes derive from the render
    dimensions so the composition stays balanced at any geometry.
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

    lines = [ln.strip() for ln in body.splitlines() if ln.strip()]
    body_html = "".join(f"<p>{escape(ln)}</p>" for ln in lines)

    eyebrow_html = f'<div class="eyebrow">{escape(eyebrow)}</div>' if eyebrow.strip() else ""
    footer_html = f'<div class="footer">{escape(footer)}</div>' if footer.strip() else ""
    footer = footer.strip()

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
        if cfg is None:
            html = render_html(
                _DEFAULT_HEADING,
                _DEFAULT_BODY,
                eyebrow=_DEFAULT_EYEBROW,
                footer=_DEFAULT_FOOTER,
                size=size,
            )
        else:
            html = render_html(
                cfg.heading,
                cfg.body,
                eyebrow=cfg.eyebrow,
                footer=cfg.footer,
                size=size,
            )
        return await html_to_bmp(html, size=size)
