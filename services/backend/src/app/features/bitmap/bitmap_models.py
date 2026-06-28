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


class HaConnection(Base, TimestampMixin):
    """Per-user Home Assistant ingest channel.

    Holds only the opaque token HA authenticates with when it pushes light
    states to the webhook — this is connection *config*, not home data. The
    pushed states themselves are never stored here; they live in an in-memory
    TTL cache (see ``ha_cache``) only as long as a render needs them.
    """

    __tablename__: str = "ha_connections"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    # Opaque secret in the webhook URL; indexed for the token→user lookup on
    # ingest, where there is no JWT to resolve the user from.
    ingest_token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)


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
    """Last rendered native BMP for a collection dashboard.

    Cached per ``dashboard_id`` so the serve path can fall back to the most
    recent good image when a fresh render fails, and so two custom-URL
    dashboards never share a cache entry.
    """

    __tablename__: str = "bitmaps"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dashboards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    rendered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
