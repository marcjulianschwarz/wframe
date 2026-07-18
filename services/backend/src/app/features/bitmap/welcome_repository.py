import uuid
from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_models import WelcomeConfig


class WelcomeRepoProtocol(Protocol):
    async def get(self, user_id: uuid.UUID) -> WelcomeConfig | None: ...
    async def upsert(
        self, user_id: uuid.UUID, *, eyebrow: str, heading: str, body: str, footer: str
    ) -> WelcomeConfig: ...


class WelcomeRepo:
    def __init__(self, session: AsyncSession) -> None:
        self.session: AsyncSession = session

    async def get(self, user_id: uuid.UUID) -> WelcomeConfig | None:
        return await self.session.get(WelcomeConfig, user_id)

    async def upsert(
        self, user_id: uuid.UUID, *, eyebrow: str, heading: str, body: str, footer: str
    ) -> WelcomeConfig:
        row = await self.session.get(WelcomeConfig, user_id)
        if row is None:
            row = WelcomeConfig(
                user_id=user_id, eyebrow=eyebrow, heading=heading, body=body, footer=footer
            )
            self.session.add(row)
        else:
            row.eyebrow = eyebrow
            row.heading = heading
            row.body = body
            row.footer = footer
        await self.session.flush()
        await self.session.refresh(row)
        return row
