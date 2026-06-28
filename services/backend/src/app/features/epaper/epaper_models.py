import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base, TimestampMixin

# Native render size of every dashboard; also the default screen/image geometry.
DEFAULT_WIDTH = 480
DEFAULT_HEIGHT = 800
# Default seconds the device waits between refreshes (the "off" part of the
# serve duty cycle). 300s = redraw the epaper every 5 minutes.
DEFAULT_REFRESH_INTERVAL = 300


class Epaper(Base, TimestampMixin):
    __tablename__: str = "epapers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Not unique: a user can register several epapers, each showing its own
    # dashboard with its own geometry/refresh settings.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    # The collection dashboard this epaper currently displays. Null until the
    # user deploys one. A deleted dashboard sets this back to null (SET NULL).
    dashboard_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dashboards.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Display geometry: the dashboard is rendered, scaled to image_width×image_height,
    # then composited at (image_x, image_y) onto a screen_width×screen_height canvas.
    screen_width: Mapped[int] = mapped_column(Integer, nullable=False, default=DEFAULT_WIDTH)
    screen_height: Mapped[int] = mapped_column(Integer, nullable=False, default=DEFAULT_HEIGHT)
    image_width: Mapped[int] = mapped_column(Integer, nullable=False, default=DEFAULT_WIDTH)
    image_height: Mapped[int] = mapped_column(Integer, nullable=False, default=DEFAULT_HEIGHT)
    image_x: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    image_y: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Clockwise screen rotation in degrees; one of 0/90/180/270.
    rotation: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Refresh control. When paused, the bitmap endpoint always returns 204 so the
    # device freezes on its last image. Otherwise the endpoint serves the image
    # only during a short window every ``refresh_interval`` seconds (204 between
    # windows), so the epaper redraws on that cadence instead of every poll.
    paused: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    refresh_interval: Mapped[int] = mapped_column(Integer, nullable=False, default=DEFAULT_REFRESH_INTERVAL)
