"""Image renderer — dithers a user-uploaded image to a fullscreen 1-bit BMP.

The original upload is stored per-user (see ``ImageUpload``); this renderer
fits it to the screen and applies the user's chosen dithering algorithm. Keeping
the original means the algorithm/fit can change without re-uploading.
"""

from __future__ import annotations

import asyncio
import uuid
from io import BytesIO

from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_models import ImageUpload
from app.features.bitmap.renderers.base import HEIGHT, WIDTH, html_to_bmp
from app.features.bitmap.renderers.dither import ImageAlgorithm, ImageFit, contrast, dither, fit

_NO_IMAGE_HTML = """\
<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:480px;height:800px;background:#000;color:#fff;}
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;
       font-family:-apple-system,Helvetica,Arial,sans-serif;text-align:center;padding:40px;}
  h1{font-size:40px;font-weight:700;margin-bottom:20px;}
  p{font-size:18px;line-height:1.5;}
</style></head><body>
  <h1>Image</h1><p>Upload an image in wframe to<br>show it here.</p>
</body></html>"""


def render_bmp(data: bytes, algorithm: ImageAlgorithm, fit_mode: ImageFit, contrast_factor: float = 1.0) -> bytes:
    """Fit, contrast-adjust, then dither the original bytes to a 1-bit BMP."""
    src = Image.open(BytesIO(data))
    fitted = fit(src, (WIDTH, HEIGHT), fit_mode)
    adjusted = contrast(fitted, contrast_factor)
    bw = dither(adjusted, algorithm)
    # On this epaper an unlit/0 pixel reads as black, so the saved 1-bit bitmap
    # must be inverted relative to a normal screen: a bright photo pixel needs to
    # map to 0 (black-on-the-panel) to look right. point() over mode "1" flips
    # each pixel without re-thresholding, so the dither pattern is preserved.
    bw = bw.point(lambda v: 0 if v else 1, mode="1")
    out = BytesIO()
    bw.save(out, "BMP")
    return out.getvalue()


class ImageRenderer:
    def __init__(self, session: AsyncSession, user_id: uuid.UUID) -> None:
        self.session: AsyncSession = session
        self.user_id: uuid.UUID = user_id

    async def render(self) -> bytes:
        upload = await self.session.get(ImageUpload, self.user_id)
        if upload is None:
            return await html_to_bmp(_NO_IMAGE_HTML)
        return await asyncio.to_thread(
            render_bmp,
            upload.data,
            ImageAlgorithm(upload.algorithm),
            ImageFit(upload.fit),
            upload.contrast,
        )
