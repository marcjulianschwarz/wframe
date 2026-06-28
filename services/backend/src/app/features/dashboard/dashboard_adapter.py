from app.features.dashboard.dashboard_models import (
    Dashboard,
    DashboardSource,
    DashboardType,
)
from app.features.dashboard.dashboard_schemas import DashboardRead, StoreItem
from app.settings import settings


def catalog_entry_to_store_item(dashboard_type: DashboardType, entry: dict[str, str]) -> StoreItem:
    return StoreItem(
        type=dashboard_type,
        title=entry["title"],
        description=entry["description"],
    )


def _preview_type(dashboard: Dashboard) -> DashboardType:
    """The built-in preview a collection row maps to.

    Store rows preview as their wrapped renderer; custom rows reuse the
    custom-URL placeholder preview (live URL rendering is too slow/unsafe to
    inline in the iframe preview).
    """
    if dashboard.source == DashboardSource.CUSTOM.value:
        return DashboardType.CUSTOM_URL
    return DashboardType(dashboard.type)


def dashboard_model_to_read(dashboard: Dashboard) -> DashboardRead:
    return DashboardRead(
        id=dashboard.id,
        source=DashboardSource(dashboard.source),
        type=DashboardType(dashboard.type) if dashboard.type is not None else None,
        custom_url=dashboard.custom_url,
        name=dashboard.name,
        description=dashboard.description,
        slug=dashboard.slug,
        preview_url=f"{settings.BACKEND_URL}/bitmaps/{_preview_type(dashboard).value}/preview",
        created_at=dashboard.created_at,
        updated_at=dashboard.updated_at,
    )
