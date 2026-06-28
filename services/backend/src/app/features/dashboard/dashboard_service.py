from app.features.dashboard.dashboard_adapter import catalog_entry_to_option
from app.features.dashboard.dashboard_models import DASHBOARD_CATALOG, DashboardType
from app.features.dashboard.dashboard_schemas import DashboardOption


class DashboardService:
    def list_options(self) -> list[DashboardOption]:
        return [catalog_entry_to_option(t, v) for t, v in DASHBOARD_CATALOG.items()]

    def is_valid(self, dashboard_type: DashboardType) -> bool:
        return dashboard_type in DASHBOARD_CATALOG
