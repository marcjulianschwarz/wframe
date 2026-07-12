from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_repository import BitmapRepoProtocol
from app.features.bitmap.renderers import (
    DashboardRenderer,
    Geometry,
    composite_onto_screen,
    renderer_factory,
)
from app.features.dashboard.dashboard_models import (
    Dashboard,
    DashboardSource,
    DashboardType,
)


class BitmapService:
    def __init__(
        self,
        repo: BitmapRepoProtocol,
        session: AsyncSession,
    ) -> None:
        self.repo: BitmapRepoProtocol = repo
        self.session: AsyncSession = session

    def _renderer(self, dashboard: Dashboard) -> DashboardRenderer:
        if dashboard.source == DashboardSource.CUSTOM.value:
            return renderer_factory(DashboardType.CUSTOM_URL, custom_url=dashboard.custom_url)
        dashboard_type = DashboardType(dashboard.type)
        if dashboard_type in (DashboardType.HOMEASSISTANT, DashboardType.HOMEASSISTANT_TEMP):
            return renderer_factory(dashboard_type, user_id=dashboard.user_id)
        if dashboard_type in (
            DashboardType.LIFE,
            DashboardType.WEATHER,
            DashboardType.GITHUB,
            DashboardType.IMAGE,
            DashboardType.VAG,
        ):
            return renderer_factory(dashboard_type, session=self.session, user_id=dashboard.user_id)
        return renderer_factory(dashboard_type)

    async def get_or_render(self, dashboard: Dashboard, geometry: Geometry | None = None) -> bytes:
        """Always render fresh; fall back to last cached on failure.

        The native render is what gets cached; ``geometry`` (the screen/image
        layout) is applied afterwards so layout changes never force a re-render.
        """
        try:
            data = await self._renderer(dashboard).render()
            _ = await self.repo.save(dashboard.id, data)
        except Exception:
            # A DB error inside the render leaves the transaction aborted, which
            # would make the fallback query below fail too. Reset it first.
            await self.session.rollback()
            existing = await self.repo.get_latest(dashboard.id)
            if existing is None:
                raise
            data = existing.data
        if geometry is not None:
            data = await composite_onto_screen(data, geometry)
        return data

    async def force_render(self, dashboard: Dashboard, geometry: Geometry | None = None) -> bytes:
        data = await self._renderer(dashboard).render()
        _ = await self.repo.save(dashboard.id, data)
        if geometry is not None:
            data = await composite_onto_screen(data, geometry)
        return data
