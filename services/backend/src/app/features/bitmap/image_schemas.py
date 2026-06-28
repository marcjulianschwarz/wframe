from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field

from app.features.bitmap.renderers.dither import ImageAlgorithm, ImageFit


class ImageRead(BaseModel):
    """The user's current Image dashboard config (never the bytes themselves)."""

    content_type: str
    algorithm: ImageAlgorithm
    fit: ImageFit
    contrast: float

    model_config: ClassVar[ConfigDict] = ConfigDict(from_attributes=True)


class ImageSettingsUpdate(BaseModel):
    """Change how the stored image is dithered/fitted, without re-uploading."""

    algorithm: ImageAlgorithm
    fit: ImageFit
    # 1.0 = unchanged; below 1.0 reduces contrast to recover midtone detail.
    contrast: float = Field(default=1.0, ge=0.2, le=2.0)
