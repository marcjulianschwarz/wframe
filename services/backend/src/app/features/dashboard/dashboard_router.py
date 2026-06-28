import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth import AuthDep
from app.database.session import get_session
from app.features.dashboard.dashboard_models import DashboardSource, DashboardType
from app.features.dashboard.dashboard_repository import DashboardRepo
from app.features.dashboard.dashboard_schemas import (
    CustomDashboardCreate,
    DashboardRead,
    DashboardUpdate,
    StoreAddRequest,
    StoreItem,
)
from app.features.dashboard.dashboard_service import DashboardService

router = APIRouter(tags=["dashboard"])


def get_dashboard_repo(session: Annotated[AsyncSession, Depends(get_session)]) -> DashboardRepo:
    return DashboardRepo(session)


def get_dashboard_service(
    repo: Annotated[DashboardRepo, Depends(get_dashboard_repo)],
) -> DashboardService:
    return DashboardService(repo)


DashboardServiceDep = Annotated[DashboardService, Depends(get_dashboard_service)]


# --- store (built-in catalog) -------------------------------------------- #
@router.get("/store", response_model=list[StoreItem])
async def list_store(service: DashboardServiceDep, _: AuthDep) -> list[StoreItem]:
    return service.list_store()


@router.get("/store/{dashboard_type}", response_model=StoreItem)
async def get_store_item(dashboard_type: DashboardType, service: DashboardServiceDep, _: AuthDep) -> StoreItem:
    return service.get_store_item(dashboard_type)


# --- collection ---------------------------------------------------------- #
@router.get("/dashboards", response_model=list[DashboardRead])
async def list_dashboards(
    auth: AuthDep,
    service: DashboardServiceDep,
    source: Annotated[DashboardSource | None, Query()] = None,
) -> list[DashboardRead]:
    return await service.list_collection(auth.user.id, source)


@router.post("/dashboards/store", response_model=DashboardRead, status_code=status.HTTP_201_CREATED)
async def add_store_dashboard(body: StoreAddRequest, auth: AuthDep, service: DashboardServiceDep) -> DashboardRead:
    return await service.add_from_store(auth.user.id, body.type)


@router.post("/dashboards/custom", response_model=DashboardRead, status_code=status.HTTP_201_CREATED)
async def create_custom_dashboard(
    body: CustomDashboardCreate, auth: AuthDep, service: DashboardServiceDep
) -> DashboardRead:
    return await service.create_custom(auth.user.id, body)


@router.patch("/dashboards/{dashboard_id}", response_model=DashboardRead)
async def update_dashboard(
    dashboard_id: uuid.UUID, body: DashboardUpdate, auth: AuthDep, service: DashboardServiceDep
) -> DashboardRead:
    return await service.update(auth.user.id, dashboard_id, body)


@router.delete("/dashboards/{dashboard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dashboard(dashboard_id: uuid.UUID, auth: AuthDep, service: DashboardServiceDep) -> None:
    await service.delete(auth.user.id, dashboard_id)
