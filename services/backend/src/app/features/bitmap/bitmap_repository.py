import uuid
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_models import Bitmap


class BitmapRepoProtocol(Protocol):
    async def get_latest(self, user_id: uuid.UUID, dashboard_type: str) -> Bitmap | None: ...
    async def save(self, user_id: uuid.UUID, dashboard_type: str, data: bytes) -> Bitmap: ...


class BitmapRepo:
    def __init__(self, session: AsyncSession) -> None:
        self.session: AsyncSession = session

    async def get_latest(self, user_id: uuid.UUID, dashboard_type: str) -> Bitmap | None:
        result = await self.session.execute(
            select(Bitmap)
            .where(
                Bitmap.user_id == user_id,
                Bitmap.dashboard_type == dashboard_type,
            )
            .order_by(Bitmap.rendered_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def save(self, user_id: uuid.UUID, dashboard_type: str, data: bytes) -> Bitmap:
        bitmap = Bitmap(user_id=user_id, dashboard_type=dashboard_type, data=data)
        self.session.add(bitmap)
        await self.session.flush()
        return bitmap
