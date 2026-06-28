import uuid
from datetime import datetime
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field

from app.features.dashboard.dashboard_models import DashboardSource, DashboardType


class StoreItem(BaseModel):
    """A built-in dashboard in the store catalog the user can add."""

    type: DashboardType
    title: str
    description: str


class DashboardRead(BaseModel):
    """One dashboard in the user's collection."""

    id: uuid.UUID
    source: DashboardSource
    type: DashboardType | None
    custom_url: str | None
    name: str
    description: str | None
    slug: str
    preview_url: str
    created_at: datetime
    updated_at: datetime

    model_config: ClassVar[ConfigDict] = ConfigDict(from_attributes=True)


class StoreAddRequest(BaseModel):
    """Add a built-in store dashboard to the collection."""

    type: DashboardType


class CustomDashboardCreate(BaseModel):
    """Create a custom (URL-backed) dashboard in the collection."""

    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    # Optional; the service auto-generates a unique slug from the name when omitted.
    slug: str | None = Field(default=None, max_length=80)
    custom_url: str = Field(min_length=1, max_length=2048)


class DashboardUpdate(BaseModel):
    """Edit a dashboard the user owns. All fields optional (partial update)."""

    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    slug: str | None = Field(default=None, max_length=80)
    # Only meaningful for custom dashboards; ignored for store ones.
    custom_url: str | None = Field(default=None, max_length=2048)
