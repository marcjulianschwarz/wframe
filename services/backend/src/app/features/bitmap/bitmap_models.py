import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, LargeBinary, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base, TimestampMixin


class WeatherLocation(Base, TimestampMixin):
    """Per-user location for the weather dashboard, set from the browser's
    geolocation. The renderer reads it to fetch live forecast data."""

    __tablename__: str = "weather_locations"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    place: Mapped[str | None] = mapped_column(String(120), nullable=True)


class GithubProfile(Base, TimestampMixin):
    """Per-user GitHub username for the github dashboard. The renderer reads it
    to fetch that account's public profile, repos, and language stats."""

    __tablename__: str = "github_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    username: Mapped[str] = mapped_column(String(39), nullable=False)


class LifeState(Base, TimestampMixin):
    __tablename__: str = "life_states"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    grid: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    generation: Mapped[int] = mapped_column(nullable=False, default=0)


class Bitmap(Base, TimestampMixin):
    __tablename__: str = "bitmaps"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    dashboard_type: Mapped[str] = mapped_column(String(32), nullable=False)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    rendered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
