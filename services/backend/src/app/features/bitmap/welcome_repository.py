import uuid
from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_models import WelcomeConfig


class WelcomeRepoProtocol(Protocol):
    async def get(self, user_id: uuid.UUID) -> WelcomeConfig | None: ...
    async def upsert(self, user_id: uuid.UUID, heading: str, body: str) -> WelcomeConfig: ...


class WelcomeRepo:
    def __init__(self, session: AsyncSession) -> None:
        self.session: AsyncSession = session

    async def get(self, user_id: uuid.UUID) -> WelcomeConfig | None:
        return await self.session.get(WelcomeConfig, user_id)

    async def upsert(self, user_id: uuid.UUID, heading: str, body: str) -> WelcomeConfig:
        row = await self.session.get(WelcomeConfig, user_id)
        if row is None:
            row = WelcomeConfig(user_id=user_id, heading=heading, body=body)
            self.session.add(row)
        else:
            row.heading = heading
            row.body = body
        await self.session.flush()
        await self.session.refresh(row)
        return row
