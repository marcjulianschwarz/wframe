from app.features.dashboard.dashboard_adapter import dashboard_model_to_read
from app.features.dashboard.dashboard_models import Dashboard
from app.features.epaper.epaper_models import Epaper
from app.features.epaper.epaper_schemas import EpaperRead
from app.settings import settings


def epaper_model_to_read(epaper: Epaper, dashboard: Dashboard | None = None) -> EpaperRead:
    return EpaperRead(
        id=epaper.id,
        user_id=epaper.user_id,
        name=epaper.name,
        slug=epaper.slug,
        dashboard_id=epaper.dashboard_id,
        dashboard=dashboard_model_to_read(dashboard) if dashboard is not None else None,
        bitmap_url=f"{settings.BACKEND_URL}/e/{epaper.slug}.bmp",
        screen_width=epaper.screen_width,
        screen_height=epaper.screen_height,
        image_width=epaper.image_width,
        image_height=epaper.image_height,
        image_x=epaper.image_x,
        image_y=epaper.image_y,
        rotation=epaper.rotation,
        paused=epaper.paused,
        refresh_interval=epaper.refresh_interval,
        created_at=epaper.created_at,
        updated_at=epaper.updated_at,
    )
