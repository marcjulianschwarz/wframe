import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth import AuthDep
from app.database.session import get_session
from app.features.bitmap.bitmap_repository import BitmapRepo
from app.features.bitmap.bitmap_service import BitmapService
from app.features.bitmap.previews import draft_preview_html, preview_html
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


@router.get("/{dashboard_type}/draft-preview", response_class=HTMLResponse)
async def draft_preview(
    dashboard_type: DashboardType,
    welcome_eyebrow: str | None = None,
    welcome_heading: str | None = None,
    welcome_body: str | None = None,
    welcome_footer: str | None = None,
) -> HTMLResponse:
    """Live example HTML reflecting unsaved edits, for the view editor's preview.

    Like ``/preview`` it uses only the passed draft values and canned data — no
    network, DB, or AI — so it's safe to serve unauthed and embed in an iframe.
    Text-configurable types (Welcome) reflect the draft; others show the sample.
    """
    return HTMLResponse(
        content=draft_preview_html(
            dashboard_type,
            welcome_eyebrow=welcome_eyebrow,
            welcome_heading=welcome_heading,
            welcome_body=welcome_body,
            welcome_footer=welcome_footer,
        )
    )


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
