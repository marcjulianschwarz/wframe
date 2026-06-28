import uuid
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.dashboard.dashboard_models import Dashboard, DashboardSource


class DashboardRepoProtocol(Protocol):
    async def list_for_user(self, user_id: uuid.UUID, source: DashboardSource | None = None) -> list[Dashboard]: ...
    async def get(self, user_id: uuid.UUID, dashboard_id: uuid.UUID) -> Dashboard | None: ...
    async def get_any(self, dashboard_id: uuid.UUID) -> Dashboard | None: ...
    async def slug_exists(self, user_id: uuid.UUID, slug: str, exclude_id: uuid.UUID | None = None) -> bool: ...
    async def add(self, dashboard: Dashboard) -> Dashboard: ...
    async def save(self, dashboard: Dashboard) -> Dashboard: ...
    async def delete(self, dashboard: Dashboard) -> None: ...


class DashboardRepo:
    def __init__(self, session: AsyncSession) -> None:
        self.session: AsyncSession = session

    async def list_for_user(self, user_id: uuid.UUID, source: DashboardSource | None = None) -> list[Dashboard]:
        stmt = select(Dashboard).where(Dashboard.user_id == user_id)
        if source is not None:
            stmt = stmt.where(Dashboard.source == source.value)
        stmt = stmt.order_by(Dashboard.created_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get(self, user_id: uuid.UUID, dashboard_id: uuid.UUID) -> Dashboard | None:
        result = await self.session.execute(
            select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_any(self, dashboard_id: uuid.UUID) -> Dashboard | None:
        """Fetch by id without scoping to a user — for the public serve path."""
        result = await self.session.execute(select(Dashboard).where(Dashboard.id == dashboard_id))
        return result.scalar_one_or_none()

    async def slug_exists(self, user_id: uuid.UUID, slug: str, exclude_id: uuid.UUID | None = None) -> bool:
        stmt = select(Dashboard.id).where(Dashboard.user_id == user_id, Dashboard.slug == slug)
        if exclude_id is not None:
            stmt = stmt.where(Dashboard.id != exclude_id)
        result = await self.session.execute(stmt.limit(1))
        return result.scalar_one_or_none() is not None

    async def add(self, dashboard: Dashboard) -> Dashboard:
        self.session.add(dashboard)
        await self.session.flush()
        await self.session.refresh(dashboard)
        return dashboard

    async def save(self, dashboard: Dashboard) -> Dashboard:
        await self.session.flush()
        await self.session.refresh(dashboard)
        return dashboard

    async def delete(self, dashboard: Dashboard) -> None:
        await self.session.delete(dashboard)
        await self.session.flush()
