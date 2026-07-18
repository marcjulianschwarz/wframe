"""Shared HTML→1-bit BMP rendering via Playwright."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Protocol

from PIL import Image

WIDTH = 480
HEIGHT = 800
THRESHOLD = 128
# Supersample factor: render the page at SCALE× device resolution so glyphs are
# antialiased, then downscale to 1× with a quality filter before thresholding.
# Hard-thresholding at native resolution is what makes 1-bit type look jagged.
SCALE = 3

# The shared body font for all dashboards. A proportional sans read best on the
# panel in the font test, so dashboards use this CSS generic (rendered
# supersampled at SCALE, *with* antialiasing) instead of the Cozette pixel font.
# It's a generic family, so the headless browser supplies whatever sans it
# bundles — pin a real .ttf here if you need identical output everywhere.
SANS_STACK = "sans-serif"

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

# A (width, height) render target in device pixels. Dashboards render their HTML
# *at* this size so the layout reflows for it, rather than being drawn at native
# size and then stretched. Defaults to the native panel size.
Size = tuple[int, int]
NATIVE_SIZE: Size = (WIDTH, HEIGHT)


class DashboardRenderer(Protocol):
    async def render(self, size: Size = NATIVE_SIZE) -> bytes: ...


@dataclass(frozen=True)
class Geometry:
    """How a rendered dashboard is placed on the physical screen."""

    screen_width: int
    screen_height: int
    image_width: int
    image_height: int
    image_x: int
    image_y: int
    # Clockwise screen rotation in degrees; one of 0/90/180/270.
    rotation: int = 0

    @property
    def is_identity(self) -> bool:
        """True when compositing is a no-op (image fills the native screen)."""
        return (
            self.screen_width == WIDTH
            and self.screen_height == HEIGHT
            and self.image_width == WIDTH
            and self.image_height == HEIGHT
            and self.image_x == 0
            and self.image_y == 0
            and self.rotation == 0
        )


def _composite(bmp_bytes: bytes, geom: Geometry) -> bytes:
    """Paste a 1-bit BMP (already rendered at the image size) onto a screen canvas.

    The dashboard is rendered directly at ``image_width``×``image_height`` (its
    HTML reflows for that size), so no scaling happens here — a mismatch is only
    a defensive resize. The margin outside the drawn image is filled black (0);
    on this epaper an unlit/0 pixel reads as black, so a black margin keeps the
    surround dark. The whole screen is then rotated clockwise by
    ``geom.rotation`` degrees; 90/270 swap the output's width and height.
    """
    img = Image.open(BytesIO(bmp_bytes)).convert("1")
    if img.size != (geom.image_width, geom.image_height):
        img = img.resize((geom.image_width, geom.image_height), Image.Resampling.LANCZOS).convert("1")
    canvas = Image.new("1", (geom.screen_width, geom.screen_height), 0)
    canvas.paste(img, (geom.image_x, geom.image_y))
    if geom.rotation:
        # PIL rotates counter-clockwise; negate for clockwise. expand=True keeps
        # the full rotated image (dimensions swap for 90/270).
        canvas = canvas.rotate(-geom.rotation, expand=True).convert("1")
    out = BytesIO()
    canvas.save(out, "BMP")
    return out.getvalue()


async def composite_onto_screen(bmp_bytes: bytes, geom: Geometry) -> bytes:
    """Place a rendered dashboard BMP onto the screen per ``geom``.

    Returns the input unchanged when ``geom`` is the identity geometry.
    """
    if geom.is_identity:
        return bmp_bytes
    return await asyncio.to_thread(_composite, bmp_bytes, geom)


def _to_bmp(png_bytes: bytes, threshold: int, size: Size) -> bytes:
    """Downscale a supersampled PNG to ``size`` and threshold to 1-bit."""
    img = Image.open(BytesIO(png_bytes)).convert("L")
    if img.size != size:
        img = img.resize(size, Image.Resampling.LANCZOS)
    bw = img.point(lambda v: 255 if v >= threshold else 0, mode="1")  # pyright: ignore[reportOperatorIssue]
    out = BytesIO()
    bw.save(out, "BMP")
    return out.getvalue()


async def html_to_bmp(
    html: str, *, size: Size = NATIVE_SIZE, threshold: int = THRESHOLD, scale: int = SCALE
) -> bytes:
    """Render HTML to a 1-bit BMP via Playwright, laid out at ``size``.

    The browser viewport is set to ``size`` so the HTML reflows for the actual
    render dimensions instead of being drawn at native size and stretched later.

    ``scale`` supersamples outline fonts so antialiased edges survive the
    1-bit threshold. Pass ``scale=1`` when the page uses a pixel/bitmap font
    sized to its native grid — supersampling such fonts only softens them.
    """
    from playwright.async_api import async_playwright

    width, height = size
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(
            viewport={"width": width, "height": height},
            device_scale_factor=scale,
        )
        await page.set_content(html, wait_until="networkidle")
        png = await page.screenshot(type="png")
        await browser.close()

    return await asyncio.to_thread(_to_bmp, png, threshold, size)


async def url_to_bmp(url: str, *, size: Size = NATIVE_SIZE, threshold: int = THRESHOLD) -> bytes:
    """Navigate to a live URL and rasterize the rendered page to a 1-bit BMP at ``size``."""
    from playwright.async_api import async_playwright

    width, height = size
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(
            viewport={"width": width, "height": height},
            device_scale_factor=SCALE,
        )
        try:
            _ = await page.goto(url, wait_until="networkidle", timeout=20000)
        except Exception:
            # networkidle can hang on long-polling pages; a loaded DOM is enough.
            _ = await page.goto(url, wait_until="load", timeout=20000)
        png = await page.screenshot(type="png")
        await browser.close()

    return await asyncio.to_thread(_to_bmp, png, threshold, size)


async def image_to_bmp(img: Image.Image) -> bytes:
    def _save(im: Image.Image) -> bytes:
        out = BytesIO()
        im.save(out, "BMP")
        return out.getvalue()

    return await asyncio.to_thread(_save, img)
