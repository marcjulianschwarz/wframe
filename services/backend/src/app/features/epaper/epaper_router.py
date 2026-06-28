import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth import AuthDep
from app.database.session import get_session
from app.features.bitmap.bitmap_router import BitmapServiceDep
from app.features.bitmap.renderers import Geometry
from app.features.dashboard.dashboard_router import get_dashboard_service
from app.features.dashboard.dashboard_service import DashboardService
from app.features.epaper import force_serve
from app.features.epaper.epaper_models import Epaper
from app.features.epaper.epaper_repository import EpaperRepo
from app.features.epaper.epaper_schemas import (
    EpaperGeometryUpdate,
    EpaperRead,
    EpaperRefreshUpdate,
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


EpaperServiceDep = Annotated[EpaperService, Depends(get_epaper_service)]


@router.get("/epaper", response_model=EpaperRead)
async def get_my_epaper(auth: AuthDep, service: EpaperServiceDep) -> EpaperRead:
    return await service.get_or_create_for_user(auth.user.id)


@router.patch("/epaper", response_model=EpaperRead)
async def update_my_epaper(body: EpaperUpdate, auth: AuthDep, service: EpaperServiceDep) -> EpaperRead:
    return await service.set_dashboard(auth.user.id, body.dashboard_type, body.custom_url)


@router.patch("/epaper/geometry", response_model=EpaperRead)
async def update_my_epaper_geometry(body: EpaperGeometryUpdate, auth: AuthDep, service: EpaperServiceDep) -> EpaperRead:
    return await service.set_geometry(auth.user.id, body)


@router.patch("/epaper/refresh", response_model=EpaperRead)
async def update_my_epaper_refresh(body: EpaperRefreshUpdate, auth: AuthDep, service: EpaperServiceDep) -> EpaperRead:
    return await service.set_refresh(auth.user.id, body)


@router.get("/e/{slug}.bmp")
async def serve_bitmap(slug: str, epaper_service: EpaperServiceDep, bitmap_service: BitmapServiceDep) -> Response:
    epaper = await epaper_service.get_by_slug(slug)
    if epaper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    # Outside a serve window (or paused): tell the device there's nothing to draw
    # so it leaves the panel untouched. 204 = "no content", no body.
    if not should_serve_now(epaper):
        return Response(
            status_code=status.HTTP_204_NO_CONTENT,
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    geometry = Geometry(
        screen_width=epaper.screen_width,
        screen_height=epaper.screen_height,
        image_width=epaper.image_width,
        image_height=epaper.image_height,
        image_x=epaper.image_x,
        image_y=epaper.image_y,
        rotation=epaper.rotation,
    )
    data = await bitmap_service.get_or_render(
        epaper.user_id, epaper.dashboard_type, epaper.custom_url, geometry=geometry
    )
    return Response(
        content=data,
        media_type="image/bmp",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )
