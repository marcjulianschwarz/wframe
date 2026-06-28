import uuid
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.dashboard.dashboard_models import DashboardType
from app.features.epaper.epaper_models import Epaper


class EpaperRepoProtocol(Protocol):
    async def get_by_user(self, user_id: uuid.UUID) -> Epaper | None: ...
    async def get_by_slug(self, slug: str) -> Epaper | None: ...
    async def create(self, user_id: uuid.UUID, slug: str) -> Epaper: ...
    async def set_dashboard(
        self,
        epaper: Epaper,
        dashboard_type: DashboardType,
        custom_url: str | None = None,
    ) -> Epaper: ...
    async def set_geometry(
        self,
        epaper: Epaper,
        *,
        screen_width: int,
        screen_height: int,
        image_width: int,
        image_height: int,
        image_x: int,
        image_y: int,
        rotation: int,
    ) -> Epaper: ...
    async def set_refresh(
        self,
        epaper: Epaper,
        *,
        paused: bool,
        refresh_interval: int,
    ) -> Epaper: ...


class EpaperRepo:
    def __init__(self, session: AsyncSession) -> None:
        self.session: AsyncSession = session

    async def get_by_user(self, user_id: uuid.UUID) -> Epaper | None:
        result = await self.session.execute(select(Epaper).where(Epaper.user_id == user_id))
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Epaper | None:
        result = await self.session.execute(select(Epaper).where(Epaper.slug == slug))
        return result.scalar_one_or_none()

    async def create(self, user_id: uuid.UUID, slug: str) -> Epaper:
        epaper = Epaper(user_id=user_id, slug=slug)
        self.session.add(epaper)
        await self.session.flush()
        await self.session.refresh(epaper)
        return epaper

    async def set_dashboard(
        self,
        epaper: Epaper,
        dashboard_type: DashboardType,
        custom_url: str | None = None,
    ) -> Epaper:
        epaper.dashboard_type = dashboard_type.value
        epaper.custom_url = custom_url
        await self.session.flush()
        await self.session.refresh(epaper)
        return epaper

    async def set_geometry(
        self,
        epaper: Epaper,
        *,
        screen_width: int,
        screen_height: int,
        image_width: int,
        image_height: int,
        image_x: int,
        image_y: int,
        rotation: int,
    ) -> Epaper:
        epaper.screen_width = screen_width
        epaper.screen_height = screen_height
        epaper.image_width = image_width
        epaper.image_height = image_height
        epaper.image_x = image_x
        epaper.image_y = image_y
        epaper.rotation = rotation
        await self.session.flush()
        await self.session.refresh(epaper)
        return epaper

    async def set_refresh(
        self,
        epaper: Epaper,
        *,
        paused: bool,
        refresh_interval: int,
    ) -> Epaper:
        epaper.paused = paused
        epaper.refresh_interval = refresh_interval
        await self.session.flush()
        await self.session.refresh(epaper)
        return epaper
