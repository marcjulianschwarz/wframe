import uuid
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_models import Bitmap


class BitmapRepoProtocol(Protocol):
    async def get_latest(self, dashboard_id: uuid.UUID) -> Bitmap | None: ...
    async def save(self, dashboard_id: uuid.UUID, data: bytes) -> Bitmap: ...


class BitmapRepo:
    def __init__(self, session: AsyncSession) -> None:
        self.session: AsyncSession = session

    async def get_latest(self, dashboard_id: uuid.UUID) -> Bitmap | None:
        result = await self.session.execute(
            select(Bitmap).where(Bitmap.dashboard_id == dashboard_id).order_by(Bitmap.rendered_at.desc()).limit(1)
        )
        return result.scalar_one_or_none()

    async def save(self, dashboard_id: uuid.UUID, data: bytes) -> Bitmap:
        bitmap = Bitmap(dashboard_id=dashboard_id, data=data)
        self.session.add(bitmap)
        await self.session.flush()
        return bitmap
