import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_repository import BitmapRepoProtocol
from app.features.bitmap.renderers import (
    DashboardRenderer,
    Geometry,
    composite_onto_screen,
    renderer_factory,
)
from app.features.dashboard.dashboard_models import DashboardType


class BitmapService:
    def __init__(
        self,
        repo: BitmapRepoProtocol,
        session: AsyncSession,
    ) -> None:
        self.repo: BitmapRepoProtocol = repo
        self.session: AsyncSession = session

    def _renderer(
        self,
        user_id: uuid.UUID,
        dashboard_type: DashboardType,
        custom_url: str | None = None,
    ) -> DashboardRenderer:
        if dashboard_type in (
            DashboardType.LIFE,
            DashboardType.WEATHER,
            DashboardType.GITHUB,
        ):
            return renderer_factory(dashboard_type, session=self.session, user_id=user_id)
        if dashboard_type == DashboardType.CUSTOM_URL:
            return renderer_factory(dashboard_type, custom_url=custom_url)
        return renderer_factory(dashboard_type)

    async def get_or_render(
        self,
        user_id: uuid.UUID,
        dashboard_type: str | DashboardType,
        custom_url: str | None = None,
        geometry: Geometry | None = None,
    ) -> bytes:
        """Always render fresh; fall back to last cached on failure.

        The native render is what gets cached; ``geometry`` (the screen/image
        layout) is applied afterwards so layout changes never force a re-render.
        """
        dt = DashboardType(dashboard_type)
        try:
            renderer = self._renderer(user_id, dt, custom_url)
            data = await renderer.render()
            _ = await self.repo.save(user_id, dt.value, data)
        except Exception:
            existing = await self.repo.get_latest(user_id, dt.value)
            if existing is None:
                raise
            data = existing.data
        if geometry is not None:
            data = await composite_onto_screen(data, geometry)
        return data

    async def force_render(
        self,
        user_id: uuid.UUID,
        dashboard_type: str | DashboardType,
        custom_url: str | None = None,
        geometry: Geometry | None = None,
    ) -> bytes:
        dt = DashboardType(dashboard_type)
        renderer = self._renderer(user_id, dt, custom_url)
        data = await renderer.render()
        _ = await self.repo.save(user_id, dt.value, data)
        if geometry is not None:
            data = await composite_onto_screen(data, geometry)
        return data
