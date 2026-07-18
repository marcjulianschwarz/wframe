"""Custom URL renderer — rasterizes any user-supplied web page to a BMP."""

from __future__ import annotations

from app.features.bitmap.renderers.base import NATIVE_SIZE, Size, url_to_bmp

_FALLBACK_HTML = """\
<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:100%;height:100%;background:#fff;}
  body{display:flex;align-items:center;justify-content:center;
       font-family:-apple-system,Helvetica,Arial,sans-serif;}
  .msg{color:#000;font-size:40px;font-weight:600;text-align:center;padding:24px;}
</style></head><body><div class="msg">No custom URL set</div></body></html>
"""


class CustomUrlRenderer:
    def __init__(self, url: str | None) -> None:
        self.url: str | None = url

    async def render(self, size: Size = NATIVE_SIZE) -> bytes:
        if not self.url:
            from app.features.bitmap.renderers.base import html_to_bmp

            return await html_to_bmp(_FALLBACK_HTML, size=size)
        return await url_to_bmp(self.url, size=size)
