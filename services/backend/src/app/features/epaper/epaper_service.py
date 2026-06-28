import secrets
import uuid

from app.features.dashboard.dashboard_service import DashboardService
from app.features.epaper import force_serve
from app.features.epaper.epaper_adapter import epaper_model_to_read
from app.features.epaper.epaper_models import Epaper
from app.features.epaper.epaper_repository import EpaperRepoProtocol
from app.features.epaper.epaper_schemas import (
    EpaperGeometryUpdate,
    EpaperRead,
    EpaperRefreshUpdate,
)


def _new_slug() -> str:
    return secrets.token_urlsafe(8).lower().replace("_", "").replace("-", "")[:10]


class EpaperService:
    def __init__(self, repo: EpaperRepoProtocol, dashboards: DashboardService) -> None:
        self.repo: EpaperRepoProtocol = repo
        self.dashboards: DashboardService = dashboards

    async def _to_read(self, epaper: Epaper) -> EpaperRead:
        dashboard = None
        if epaper.dashboard_id is not None:
            # The deployed dashboard belongs to the epaper's owner; resolve it so
            # the client can show what's currently on the device.
            dashboard = await self.dashboards.repo.get(epaper.user_id, epaper.dashboard_id)
        return epaper_model_to_read(epaper, dashboard)

    async def _get_or_create(self, user_id: uuid.UUID) -> Epaper:
        epaper = await self.repo.get_by_user(user_id)
        if epaper is None:
            epaper = await self.repo.create(user_id, _new_slug())
        return epaper

    async def get_or_create_for_user(self, user_id: uuid.UUID) -> EpaperRead:
        return await self._to_read(await self._get_or_create(user_id))

    async def set_dashboard(self, user_id: uuid.UUID, dashboard_id: uuid.UUID | None) -> EpaperRead:
        if dashboard_id is not None:
            # Ownership check: 404 if it isn't in this user's collection.
            _ = await self.dashboards.get_owned(user_id, dashboard_id)
        epaper = await self._get_or_create(user_id)
        epaper = await self.repo.set_dashboard_id(epaper, dashboard_id)
        # Let the device pick up the new dashboard on its next poll, not after the
        # refresh interval.
        force_serve.mark(epaper.id)
        return await self._to_read(epaper)

    async def set_geometry(self, user_id: uuid.UUID, geometry: EpaperGeometryUpdate) -> EpaperRead:
        from fastapi import HTTPException, status

        # The drawn image must fit within the screen at its given position.
        if geometry.image_x + geometry.image_width > geometry.screen_width:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="image extends past the right edge of the screen",
            )
        if geometry.image_y + geometry.image_height > geometry.screen_height:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="image extends past the bottom edge of the screen",
            )
        if geometry.image_x < 0 or geometry.image_y < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="image position cannot be negative",
            )
        epaper = await self._get_or_create(user_id)
        epaper = await self.repo.set_geometry(
            epaper,
            screen_width=geometry.screen_width,
            screen_height=geometry.screen_height,
            image_width=geometry.image_width,
            image_height=geometry.image_height,
            image_x=geometry.image_x,
            image_y=geometry.image_y,
            rotation=geometry.rotation,
        )
        # Show the new geometry immediately on the next poll.
        force_serve.mark(epaper.id)
        return await self._to_read(epaper)

    async def set_refresh(self, user_id: uuid.UUID, refresh: EpaperRefreshUpdate) -> EpaperRead:
        epaper = await self._get_or_create(user_id)
        epaper = await self.repo.set_refresh(
            epaper,
            paused=refresh.paused,
            refresh_interval=refresh.refresh_interval,
        )
        return await self._to_read(epaper)

    async def get_by_slug(self, slug: str) -> Epaper | None:
        return await self.repo.get_by_slug(slug)
