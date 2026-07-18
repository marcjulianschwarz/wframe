from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_repository import BitmapRepoProtocol
from app.features.bitmap.renderers import (
    HEIGHT,
    WIDTH,
    DashboardRenderer,
    Geometry,
    Size,
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

    @staticmethod
    def _render_size(geometry: Geometry | None) -> Size:
        """The dimensions the dashboard HTML is laid out at: the image size from
        ``geometry`` (so the layout reflows for it), or the native panel size."""
        if geometry is None:
            return (WIDTH, HEIGHT)
        return (geometry.image_width, geometry.image_height)

    async def get_or_render(self, dashboard: Dashboard, geometry: Geometry | None = None) -> bytes:
        """Render fresh at the geometry's image size; fall back to last cached on
        failure.

        The HTML is laid out at the image size so the layout reflows for it,
        rather than being drawn at native size and stretched. The render is
        cached per ``(dashboard, width, height)`` so the fallback matches the
        size being served, and ``geometry`` is then applied to place it on the
        screen (paste + rotate, no scaling).
        """
        width, height = self._render_size(geometry)
        # Capture the id up front: on the failure path below we roll back, which
        # expires every ORM object in the session — so a later ``dashboard.id``
        # would try to lazily reload it, doing sync IO outside the async greenlet
        # (MissingGreenlet). A plain int/uuid captured here survives the rollback.
        dashboard_id = dashboard.id
        try:
            data = await self._renderer(dashboard).render(size=(width, height))
            _ = await self.repo.save(dashboard_id, data, width, height)
        except Exception:
            # A DB error inside the render leaves the transaction aborted, which
            # would make the fallback query below fail too. Reset it first.
            await self.session.rollback()
            existing = await self.repo.get_latest(dashboard_id, width, height)
            if existing is None:
                raise
            data = existing.data
        if geometry is not None:
            data = await composite_onto_screen(data, geometry)
        return data

    async def force_render(self, dashboard: Dashboard, geometry: Geometry | None = None) -> bytes:
        width, height = self._render_size(geometry)
        data = await self._renderer(dashboard).render(size=(width, height))
        _ = await self.repo.save(dashboard.id, data, width, height)
        if geometry is not None:
            data = await composite_onto_screen(data, geometry)
        return data
