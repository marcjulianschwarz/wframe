from pydantic import BaseModel

from app.features.dashboard.dashboard_models import DashboardType


class DashboardOption(BaseModel):
    type: DashboardType
    title: str
    description: str
