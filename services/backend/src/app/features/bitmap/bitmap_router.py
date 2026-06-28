import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth import AuthDep
from app.database.session import get_session
from app.features.bitmap.bitmap_repository import BitmapRepo
from app.features.bitmap.bitmap_service import BitmapService
from app.features.bitmap.previews import preview_html
from app.features.dashboard.dashboard_models import DashboardType
from app.features.dashboard.dashboard_router import DashboardServiceDep

router = APIRouter(prefix="/bitmaps", tags=["bitmap"])


def get_bitmap_repo(session: Annotated[AsyncSession, Depends(get_session)]) -> BitmapRepo:
    return BitmapRepo(session)


def get_bitmap_service(
    repo: Annotated[BitmapRepo, Depends(get_bitmap_repo)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> BitmapService:
    return BitmapService(repo, session)


BitmapServiceDep = Annotated[BitmapService, Depends(get_bitmap_service)]


@router.get("/{dashboard_type}/preview", response_class=HTMLResponse)
async def preview(dashboard_type: DashboardType) -> HTMLResponse:
    """Live example HTML for a dashboard, for the in-app iframe preview. Uses
    canned data only — no network, DB, or AI — so it's safe to serve unauthed
    and embed directly."""
    return HTMLResponse(content=preview_html(dashboard_type))


@router.post("/dashboards/{dashboard_id}/render")
async def render_now(
    dashboard_id: uuid.UUID,
    auth: AuthDep,
    service: BitmapServiceDep,
    dashboards: DashboardServiceDep,
) -> Response:
    """Render a collection dashboard now and return the BMP. Used for the in-app
    preview; it does not change which dashboard the user's epaper serves."""
    dashboard = await dashboards.get_owned(auth.user.id, dashboard_id)
    data = await service.force_render(dashboard)
    return Response(content=data, media_type="image/bmp")
