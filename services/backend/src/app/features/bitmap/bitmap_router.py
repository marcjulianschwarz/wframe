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


@router.post("/{dashboard_type}/render")
async def render_now(
    dashboard_type: DashboardType,
    auth: AuthDep,
    service: BitmapServiceDep,
    custom_url: str | None = None,
) -> Response:
    """Render a dashboard now and return the BMP. Used for the in-app preview;
    it does not change which dashboard the user's epaper serves."""
    data = await service.force_render(auth.user.id, dashboard_type, custom_url=custom_url)
    return Response(content=data, media_type="image/bmp")
