"""1-bit dithering of arbitrary images for the Image dashboard.

Each algorithm takes a greyscale :class:`PIL.Image.Image` and returns a mode-1
(black/white) image of the same size. Kept dependency-free (pure Pillow + the
stdlib) so it adds no new packages.
"""

from __future__ import annotations

import enum

from PIL import Image, ImageEnhance


class ImageAlgorithm(str, enum.Enum):
    FLOYD_STEINBERG = "floyd_steinberg"
    ORDERED = "ordered"
    THRESHOLD = "threshold"
    ATKINSON = "atkinson"


class ImageFit(str, enum.Enum):
    CONTAIN = "contain"  # letterbox: whole image visible, black bars fill the rest
    COVER = "cover"  # crop to fill the whole screen
    STRETCH = "stretch"  # distort to exactly the target size


# 8×8 Bayer matrix (values 0..63), the standard ordered-dither threshold map.
_BAYER_8 = (
    (0, 32, 8, 40, 2, 34, 10, 42),
    (48, 16, 56, 24, 50, 18, 58, 26),
    (12, 44, 4, 36, 14, 46, 6, 38),
    (60, 28, 52, 20, 62, 30, 54, 22),
    (3, 35, 11, 43, 1, 33, 9, 41),
    (51, 19, 59, 27, 49, 17, 57, 25),
    (15, 47, 7, 39, 13, 45, 5, 37),
    (63, 31, 55, 23, 61, 29, 53, 21),
)


def _threshold(img: Image.Image, cutoff: int = 128) -> Image.Image:
    return img.point(lambda v: 255 if v >= cutoff else 0, mode="1")  # pyright: ignore[reportOperatorIssue]


def _ordered(img: Image.Image) -> Image.Image:
    """8×8 Bayer ordered dither. Pixel is white when its level exceeds the
    matrix threshold scaled to 0..255 — a regular cross-hatch with no smearing.

    Reads/writes via flat pixel lists (getdata/putdata) rather than per-pixel
    PixelAccess so the values stay statically typed as ints."""
    w, h = img.size
    src = list(img.tobytes())
    out_px: list[int] = [0] * (w * h)
    for y in range(h):
        row = _BAYER_8[y & 7]
        base = y * w
        for x in range(w):
            # map matrix cell (0..63) to a 0..255 threshold
            t = (row[x & 7] * 255) // 64
            out_px[base + x] = 1 if src[base + x] > t else 0
    out = Image.new("1", (w, h))
    out.putdata(out_px)
    return out


def _diffuse(img: Image.Image, weights: list[tuple[int, int, float]], divisor: float) -> Image.Image:
    """Generic error-diffusion dither. ``weights`` are (dx, dy, factor) offsets
    that the quantization error is spread to; ``divisor`` normalizes them."""
    w, h = img.size
    # Work in a mutable float buffer so accumulated error stays precise.
    flat = list(img.tobytes())
    buf: list[list[float]] = [[float(flat[y * w + x]) for x in range(w)] for y in range(h)]
    out_px: list[int] = [0] * (w * h)
    for y in range(h):
        base = y * w
        for x in range(w):
            old = buf[y][x]
            new = 255.0 if old >= 128 else 0.0
            out_px[base + x] = 1 if new else 0
            err = (old - new) / divisor
            for dx, dy, f in weights:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h:
                    buf[ny][nx] += err * f
    out = Image.new("1", (w, h))
    out.putdata(out_px)
    return out


# Floyd–Steinberg neighbour weights (sum 16). Pillow's built-in convert("1")
# implements this too, but we route it through _diffuse for a uniform code path.
_FS = [(1, 0, 7.0), (-1, 1, 3.0), (0, 1, 5.0), (1, 1, 1.0)]
# Atkinson spreads only 6/8 of the error → lighter, higher local contrast.
_ATKINSON = [(1, 0, 1.0), (2, 0, 1.0), (-1, 1, 1.0), (0, 1, 1.0), (1, 1, 1.0), (0, 2, 1.0)]


def dither(img: Image.Image, algorithm: ImageAlgorithm) -> Image.Image:
    """Convert a greyscale image to mode-1 using ``algorithm``."""
    grey = img.convert("L")
    if algorithm is ImageAlgorithm.THRESHOLD:
        return _threshold(grey)
    if algorithm is ImageAlgorithm.ORDERED:
        return _ordered(grey)
    if algorithm is ImageAlgorithm.ATKINSON:
        return _diffuse(grey, _ATKINSON, 8.0)
    # Floyd–Steinberg: use Pillow's optimized native path.
    return grey.convert("1")


def contrast(img: Image.Image, factor: float) -> Image.Image:
    """Adjust contrast around mid-grey before dithering.

    ``factor`` of 1.0 leaves the image unchanged; below 1.0 pulls very light and
    very dark values toward grey, which recovers midtone detail on harsh,
    high-contrast photos (pure black/white source pixels otherwise clip to flat
    regions the dither can't texture). Above 1.0 increases contrast.
    """
    if factor == 1.0:
        return img
    return ImageEnhance.Contrast(img.convert("L")).enhance(factor)


def fit(img: Image.Image, size: tuple[int, int], mode: ImageFit) -> Image.Image:
    """Scale ``img`` to ``size`` per ``mode``, returning a greyscale image of
    exactly ``size`` (contain pads with black, matching the screen's black
    margin convention)."""
    tw, th = size
    src = img.convert("L")
    if mode is ImageFit.STRETCH:
        return src.resize(size, Image.Resampling.LANCZOS)

    sw, sh = src.size
    # contain → fit inside; cover → fill and overflow.
    scale = min(tw / sw, th / sh) if mode is ImageFit.CONTAIN else max(tw / sw, th / sh)
    rw, rh = max(1, round(sw * scale)), max(1, round(sh * scale))
    resized = src.resize((rw, rh), Image.Resampling.LANCZOS)

    if mode is ImageFit.COVER:
        left, top = (rw - tw) // 2, (rh - th) // 2
        return resized.crop((left, top, left + tw, top + th))

    # contain: centre on a black canvas.
    canvas = Image.new("L", size, 0)
    canvas.paste(resized, ((tw - rw) // 2, (th - rh) // 2))
    return canvas
