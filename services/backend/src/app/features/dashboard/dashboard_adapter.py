from app.features.dashboard.dashboard_models import DashboardType
from app.features.dashboard.dashboard_schemas import DashboardOption


def catalog_entry_to_option(dashboard_type: DashboardType, entry: dict[str, str]) -> DashboardOption:
    return DashboardOption(
        type=dashboard_type,
        title=entry["title"],
        description=entry["description"],
    )
