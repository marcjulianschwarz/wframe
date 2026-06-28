import uuid
from datetime import datetime
from typing import ClassVar, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.features.dashboard.dashboard_models import DashboardType

# Guard rails for geometry: large enough for any realistic epaper, small enough
# to keep compositing cheap and reject obviously bad input.
MAX_DIMENSION = 4096
# Refresh interval bounds in seconds: 0 = redraw on every device poll, up to 24h.
MAX_REFRESH_INTERVAL = 86_400


class EpaperUpdate(BaseModel):
    dashboard_type: DashboardType
    custom_url: str | None = None


class EpaperGeometryUpdate(BaseModel):
    screen_width: int = Field(ge=1, le=MAX_DIMENSION)
    screen_height: int = Field(ge=1, le=MAX_DIMENSION)
    image_width: int = Field(ge=1, le=MAX_DIMENSION)
    image_height: int = Field(ge=1, le=MAX_DIMENSION)
    image_x: int = Field(ge=-MAX_DIMENSION, le=MAX_DIMENSION)
    image_y: int = Field(ge=-MAX_DIMENSION, le=MAX_DIMENSION)
    rotation: Literal[0, 90, 180, 270] = 0


class EpaperRefreshUpdate(BaseModel):
    paused: bool
    refresh_interval: int = Field(ge=0, le=MAX_REFRESH_INTERVAL)


class EpaperRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    slug: str
    dashboard_type: DashboardType
    custom_url: str | None
    bitmap_url: str
    screen_width: int
    screen_height: int
    image_width: int
    image_height: int
    image_x: int
    image_y: int
    rotation: int
    paused: bool
    refresh_interval: int
    created_at: datetime
    updated_at: datetime

    model_config: ClassVar[ConfigDict] = ConfigDict(from_attributes=True)
