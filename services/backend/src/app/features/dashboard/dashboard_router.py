from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.auth import AuthDep
from app.features.dashboard.dashboard_schemas import DashboardOption
from app.features.dashboard.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboards", tags=["dashboard"])


def get_dashboard_service() -> DashboardService:
    return DashboardService()


DashboardServiceDep = Annotated[DashboardService, Depends(get_dashboard_service)]


@router.get("", response_model=list[DashboardOption])
async def list_dashboards(service: DashboardServiceDep, _: AuthDep) -> list[DashboardOption]:
    return service.list_options()
