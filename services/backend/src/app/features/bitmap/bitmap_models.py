import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, LargeBinary, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base, TimestampMixin

# Native panel size; the default render dimensions when no geometry narrows it.
WIDTH = 480
HEIGHT = 800


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


class VagStop(Base, TimestampMixin):
    """Per-user VGN stop for the VAG departures dashboard. The renderer reads it
    to fetch live departures from the VAG Abfahrtsmonitor API."""

    __tablename__: str = "vag_stops"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    # VGNKennung — the stop id the departures endpoint is keyed by.
    vgn_number: Mapped[int] = mapped_column(nullable=False)
    # e.g. "Bus,Tram,UBahn" as returned by the stop search.
    products: Mapped[str | None] = mapped_column(String(64), nullable=True)


class ImageUpload(Base, TimestampMixin):
    """Per-user source image for the Image dashboard.

    Stores the *original* upload bytes (plus its content type) so the renderer
    can re-dither it to a 1-bit BMP on demand — keeping the original means the
    user can switch dithering algorithms or fit modes without re-uploading, and
    it can be rasterized at whatever screen size a render needs. ``algorithm``
    and ``fit`` are the user's current display choices, applied at render time.
    """

    __tablename__: str = "image_uploads"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    content_type: Mapped[str] = mapped_column(String(64), nullable=False)
    # One of the ImageAlgorithm / ImageFit string values; validated in the API.
    algorithm: Mapped[str] = mapped_column(String(24), nullable=False, default="floyd_steinberg")
    fit: Mapped[str] = mapped_column(String(16), nullable=False, default="contain")
    # Contrast multiplier applied before dithering. 1.0 = unchanged; <1.0 reduces
    # contrast to recover detail on harsh high-contrast photos.
    contrast: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)


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
    """Last rendered BMP for a collection dashboard, at a given render size.

    Cached per ``(dashboard_id, width, height)``: dashboards render their HTML at
    the image size so the layout reflows, meaning a render is only valid for the
    size it was produced at. Keying by size lets the serve path fall back to the
    most recent good image *for that size* when a fresh render fails, and keeps
    two custom-URL dashboards (or two different display sizes) from sharing an
    entry.
    """

    __tablename__: str = "bitmaps"
    __table_args__ = (Index("ix_bitmaps_dashboard_size", "dashboard_id", "width", "height"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dashboards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # The render dimensions this bitmap was produced at (the epaper's image size).
    width: Mapped[int] = mapped_column(nullable=False, default=WIDTH)
    height: Mapped[int] = mapped_column(nullable=False, default=HEIGHT)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    rendered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
