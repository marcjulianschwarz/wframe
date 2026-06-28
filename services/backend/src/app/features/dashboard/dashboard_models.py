import enum
import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base, TimestampMixin


class DashboardType(str, enum.Enum):
    DASHBOARD = "dashboard"
    HN_ZEITUNG = "hn_zeitung"
    LIFE = "life"
    CUSTOM_URL = "custom_url"
    WEATHER = "weather"
    GITHUB = "github"
    HOMEASSISTANT = "homeassistant"
    HOMEASSISTANT_TEMP = "homeassistant_temp"


class DashboardSource(str, enum.Enum):
    """Where a collection dashboard came from.

    ``STORE`` rows wrap one of the built-in :class:`DashboardType` renderers the
    user added from the store. ``CUSTOM`` rows are user-created (currently only a
    custom URL; raw custom HTML is intentionally not supported yet).
    """

    STORE = "store"
    CUSTOM = "custom"


# The store: a static catalog of the built-in dashboards a user can add to their
# collection. Keyed by the renderer type that backs each one.
DASHBOARD_CATALOG: dict[DashboardType, dict[str, str]] = {
    DashboardType.DASHBOARD: {
        "title": "Dashboard",
        "description": "Weather, calendar, stats, and a daily quote.",
    },
    DashboardType.HN_ZEITUNG: {
        "title": "HN Zeitung",
        "description": "Newspaper-style top Hacker News stories with AI summaries.",
    },
    DashboardType.LIFE: {
        "title": "Life",
        "description": "Conway's Game of Life — evolving cellular automaton.",
    },
    DashboardType.CUSTOM_URL: {
        "title": "Custom URL",
        "description": "Render any web page you point it at, as a bitmap.",
    },
    DashboardType.WEATHER: {
        "title": "Weather",
        "description": "Live 24h temperature chart and stats for your location.",
    },
    DashboardType.GITHUB: {
        "title": "GitHub",
        "description": "A public profile card: stars, top repos, and languages.",
    },
    DashboardType.HOMEASSISTANT: {
        "title": "Home Assistant — Lights",
        "description": "Your lights and their brightness, pushed live from Home Assistant.",
    },
    DashboardType.HOMEASSISTANT_TEMP: {
        "title": "Home Assistant — Temperature",
        "description": "A 24h temperature chart from a Home Assistant sensor.",
    },
}


class Dashboard(Base, TimestampMixin):
    """One dashboard in a user's collection.

    A user builds a collection by adding store built-ins (``source=store``, with
    ``type`` set) and creating their own (``source=custom``, with ``custom_url``
    set). An :class:`~app.features.epaper.epaper_models.Epaper` displays one of
    these rows via its ``dashboard_id``. The slug is user-facing and unique per
    user so it can appear in URLs without colliding across accounts.
    """

    __tablename__: str = "dashboards"
    __table_args__: tuple[UniqueConstraint, ...] = (
        UniqueConstraint("user_id", "slug", name="uq_dashboards_user_slug"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source: Mapped[str] = mapped_column(String(16), nullable=False)
    # The built-in renderer this row uses. Set for store rows; null for custom.
    type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # The page a custom-URL dashboard renders. Set for custom rows; null otherwise.
    custom_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
