import secrets
import uuid

from fastapi import HTTPException, status

from app.features.dashboard.dashboard_models import DashboardType
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


class EpaperService:
    def __init__(self, repo: EpaperRepoProtocol, dashboards: DashboardService) -> None:
        self.repo: EpaperRepoProtocol = repo
        self.dashboards: DashboardService = dashboards

    def _to_read(self, epaper: Epaper) -> EpaperRead:
        return epaper_model_to_read(epaper)

    async def get_or_create_for_user(self, user_id: uuid.UUID) -> EpaperRead:
        epaper = await self.repo.get_by_user(user_id)
        if epaper is None:
            slug = secrets.token_urlsafe(8).lower().replace("_", "").replace("-", "")[:10]
            epaper = await self.repo.create(user_id, slug)
        return self._to_read(epaper)

    async def set_dashboard(
        self,
        user_id: uuid.UUID,
        dashboard_type: DashboardType,
        custom_url: str | None = None,
    ) -> EpaperRead:
        if not self.dashboards.is_valid(dashboard_type):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unknown dashboard type",
            )
        if dashboard_type == DashboardType.CUSTOM_URL:
            if not custom_url or not custom_url.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="custom_url is required for the Custom URL dashboard",
                )
            custom_url = custom_url.strip()
            if not custom_url.startswith(("http://", "https://")):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="custom_url must start with http:// or https://",
                )
        else:
            custom_url = None
        epaper = await self.repo.get_by_user(user_id)
        if epaper is None:
            epaper = await self.repo.create(user_id, secrets.token_urlsafe(8).lower()[:10])
        epaper = await self.repo.set_dashboard(epaper, dashboard_type, custom_url)
        # Let the device pick up the new dashboard on its next poll, not after the
        # refresh interval.
        force_serve.mark(epaper.id)
        return self._to_read(epaper)

    async def set_geometry(self, user_id: uuid.UUID, geometry: EpaperGeometryUpdate) -> EpaperRead:
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
        epaper = await self.repo.get_by_user(user_id)
        if epaper is None:
            epaper = await self.repo.create(user_id, secrets.token_urlsafe(8).lower()[:10])
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
        return self._to_read(epaper)

    async def set_refresh(self, user_id: uuid.UUID, refresh: EpaperRefreshUpdate) -> EpaperRead:
        epaper = await self.repo.get_by_user(user_id)
        if epaper is None:
            epaper = await self.repo.create(user_id, secrets.token_urlsafe(8).lower()[:10])
        epaper = await self.repo.set_refresh(
            epaper,
            paused=refresh.paused,
            refresh_interval=refresh.refresh_interval,
        )
        return self._to_read(epaper)

    async def get_by_slug(self, slug: str) -> Epaper | None:
        return await self.repo.get_by_slug(slug)
