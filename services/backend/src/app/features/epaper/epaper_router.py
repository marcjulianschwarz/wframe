import time
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth import AuthDep
from app.database.session import get_session
from app.features.bitmap.bitmap_router import BitmapServiceDep
from app.features.bitmap.renderers import Geometry
from app.features.dashboard.dashboard_models import DashboardType
from app.features.dashboard.dashboard_repository import DashboardRepo
from app.features.dashboard.dashboard_router import get_dashboard_service
from app.features.dashboard.dashboard_service import DashboardService
from app.features.epaper import force_serve
from app.features.epaper.epaper_models import Epaper
from app.features.epaper.epaper_repository import EpaperRepo
from app.features.epaper.epaper_schemas import (
    EpaperCreate,
    EpaperGeometryUpdate,
    EpaperRead,
    EpaperRefreshUpdate,
    EpaperRename,
    EpaperUpdate,
)
from app.features.epaper.epaper_service import EpaperService

router = APIRouter(tags=["epaper"])

# The device polls roughly every 5s and only redraws when it gets an image, so a
# serve window must be long enough to overlap at least one poll. 8s guarantees an
# overlap regardless of poll phase.
SERVE_WINDOW_SECONDS = 8


def should_serve_now(epaper: Epaper, now: float | None = None) -> bool:
    """Decide if the bitmap should be served *right now* (else the endpoint 204s).

    Paused epapers never serve. A recent dashboard/geometry change opens a
    force-serve window (see :mod:`force_serve`) that overrides the interval so the
    device shows the change on its next poll. Otherwise, with ``refresh_interval``
    of 0 the image is always served; for a positive interval the timeline splits
    into repeating periods of ``SERVE_WINDOW_SECONDS`` (serve) + ``refresh_interval``
    (idle), and only the leading serve window of each period returns the image.
    """
    if epaper.paused:
        return False
    now = time.time() if now is None else now
    if force_serve.is_forced(epaper.id, now):
        return True
    if epaper.refresh_interval <= 0:
        return True
    period = SERVE_WINDOW_SECONDS + epaper.refresh_interval
    return (now % period) < SERVE_WINDOW_SECONDS


def get_epaper_repo(session: Annotated[AsyncSession, Depends(get_session)]) -> EpaperRepo:
    return EpaperRepo(session)


def get_epaper_service(
    repo: Annotated[EpaperRepo, Depends(get_epaper_repo)],
    dashboards: Annotated[DashboardService, Depends(get_dashboard_service)],
) -> EpaperService:
    return EpaperService(repo, dashboards)


def get_dashboard_repo_for_serve(session: Annotated[AsyncSession, Depends(get_session)]) -> DashboardRepo:
    return DashboardRepo(session)


EpaperServiceDep = Annotated[EpaperService, Depends(get_epaper_service)]


@router.get("/epapers", response_model=list[EpaperRead])
async def list_my_epapers(auth: AuthDep, service: EpaperServiceDep) -> list[EpaperRead]:
    return await service.list_for_user(auth.user.id)


@router.post("/epapers", response_model=EpaperRead, status_code=status.HTTP_201_CREATED)
async def create_my_epaper(body: EpaperCreate, auth: AuthDep, service: EpaperServiceDep) -> EpaperRead:
    return await service.create(auth.user.id, body.name)


@router.get("/epapers/{epaper_id}", response_model=EpaperRead)
async def get_my_epaper(epaper_id: uuid.UUID, auth: AuthDep, service: EpaperServiceDep) -> EpaperRead:
    return await service.get(auth.user.id, epaper_id)


@router.patch("/epapers/{epaper_id}", response_model=EpaperRead)
async def rename_my_epaper(
    epaper_id: uuid.UUID, body: EpaperRename, auth: AuthDep, service: EpaperServiceDep
) -> EpaperRead:
    return await service.rename(auth.user.id, epaper_id, body.name)


@router.delete("/epapers/{epaper_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_epaper(epaper_id: uuid.UUID, auth: AuthDep, service: EpaperServiceDep) -> Response:
    await service.delete(auth.user.id, epaper_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/epapers/{epaper_id}/dashboard", response_model=EpaperRead)
async def set_my_epaper_dashboard(
    epaper_id: uuid.UUID, body: EpaperUpdate, auth: AuthDep, service: EpaperServiceDep
) -> EpaperRead:
    return await service.set_dashboard(auth.user.id, epaper_id, body.dashboard_id)


@router.patch("/epapers/{epaper_id}/geometry", response_model=EpaperRead)
async def set_my_epaper_geometry(
    epaper_id: uuid.UUID, body: EpaperGeometryUpdate, auth: AuthDep, service: EpaperServiceDep
) -> EpaperRead:
    return await service.set_geometry(auth.user.id, epaper_id, body)


@router.patch("/epapers/{epaper_id}/refresh", response_model=EpaperRead)
async def set_my_epaper_refresh(
    epaper_id: uuid.UUID, body: EpaperRefreshUpdate, auth: AuthDep, service: EpaperServiceDep
) -> EpaperRead:
    return await service.set_refresh(auth.user.id, epaper_id, body)


@router.post("/epapers/{epaper_id}/refresh-now", response_model=EpaperRead)
async def refresh_my_epaper_now(
    epaper_id: uuid.UUID, auth: AuthDep, service: EpaperServiceDep
) -> EpaperRead:
    return await service.refresh_now(auth.user.id, epaper_id)


@router.get("/epapers/{epaper_id}/preview.bmp")
async def preview_my_epaper_bitmap(
    epaper_id: uuid.UUID,
    auth: AuthDep,
    service: EpaperServiceDep,
    bitmap_service: BitmapServiceDep,
    dashboard_repo: Annotated[DashboardRepo, Depends(get_dashboard_repo_for_serve)],
) -> Response:
    """The exact 1-bit image the panel would show right now, for the in-app canvas
    preview. Unlike ``/e/{slug}.bmp`` this ignores the serve window and pause
    state (a preview should always reflect the current dashboard), and it renders
    once if nothing is cached yet — so a first render always happens on demand."""
    epaper = await service.owned(auth.user.id, epaper_id)
    if epaper.dashboard_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No dashboard deployed")
    dashboard = await dashboard_repo.get_any(epaper.dashboard_id)
    if dashboard is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found")
    geometry = Geometry(
        screen_width=epaper.screen_width,
        screen_height=epaper.screen_height,
        image_width=epaper.image_width,
        image_height=epaper.image_height,
        image_x=epaper.image_x,
        image_y=epaper.image_y,
        rotation=epaper.rotation,
    )
    data = await bitmap_service.get_or_render(dashboard, geometry=geometry)
    return Response(
        content=data,
        media_type="image/bmp",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@router.get("/e/{slug}.bmp")
async def serve_bitmap(
    slug: str,
    epaper_service: EpaperServiceDep,
    bitmap_service: BitmapServiceDep,
    dashboard_repo: Annotated[DashboardRepo, Depends(get_dashboard_repo_for_serve)],
) -> Response:
    epaper = await epaper_service.get_by_slug(slug)
    if epaper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    no_content = Response(
        status_code=status.HTTP_204_NO_CONTENT,
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )
    # Outside a serve window (or paused): tell the device there's nothing to draw
    # so it leaves the panel untouched. 204 = "no content", no body.
    if not should_serve_now(epaper):
        return no_content
    # No dashboard deployed yet (or it was deleted): nothing to draw.
    if epaper.dashboard_id is None:
        return no_content
    dashboard = await dashboard_repo.get_any(epaper.dashboard_id)
    if dashboard is None:
        return no_content
    geometry = Geometry(
        screen_width=epaper.screen_width,
        screen_height=epaper.screen_height,
        image_width=epaper.image_width,
        image_height=epaper.image_height,
        image_x=epaper.image_x,
        image_y=epaper.image_y,
        rotation=epaper.rotation,
    )
    data = await bitmap_service.get_or_render(dashboard, geometry=geometry)
    headers = {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
    }
    # Photos ghost badly under the panel's default partial refresh, so tell the
    # device to do a full refresh for this push. Text dashboards stay on partials
    # (faster, less wear); only the Image dashboard opts into the full clear.
    if dashboard.type == DashboardType.IMAGE.value:
        headers["X-Epaper-Full-Refresh"] = "1"
    return Response(content=data, media_type="image/bmp", headers=headers)
