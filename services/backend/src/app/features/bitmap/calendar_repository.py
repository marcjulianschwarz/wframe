import uuid
from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_models import CalendarConfig


class CalendarRepoProtocol(Protocol):
    async def get(self, user_id: uuid.UUID) -> CalendarConfig | None: ...
    async def upsert(self, user_id: uuid.UUID, ics_url: str) -> CalendarConfig: ...


class CalendarRepo:
    def __init__(self, session: AsyncSession) -> None:
        self.session: AsyncSession = session

    async def get(self, user_id: uuid.UUID) -> CalendarConfig | None:
        return await self.session.get(CalendarConfig, user_id)

    async def upsert(self, user_id: uuid.UUID, ics_url: str) -> CalendarConfig:
        row = await self.session.get(CalendarConfig, user_id)
        if row is None:
            row = CalendarConfig(user_id=user_id, ics_url=ics_url)
            self.session.add(row)
        else:
            row.ics_url = ics_url
        await self.session.flush()
        await self.session.refresh(row)
        return row
