import secrets
import uuid
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_models import HaConnection


def _new_token() -> str:
    return secrets.token_urlsafe(32)


class HaRepoProtocol(Protocol):
    async def get(self, user_id: uuid.UUID) -> HaConnection | None: ...
    async def get_or_create(self, user_id: uuid.UUID) -> HaConnection: ...
    async def get_by_token(self, token: str) -> HaConnection | None: ...


class HaRepo:
    def __init__(self, session: AsyncSession) -> None:
        self.session: AsyncSession = session

    async def get(self, user_id: uuid.UUID) -> HaConnection | None:
        return await self.session.get(HaConnection, user_id)

    async def get_or_create(self, user_id: uuid.UUID) -> HaConnection:
        conn = await self.session.get(HaConnection, user_id)
        if conn is None:
            conn = HaConnection(user_id=user_id, ingest_token=_new_token())
            self.session.add(conn)
            await self.session.flush()
            await self.session.refresh(conn)
        return conn

    async def get_by_token(self, token: str) -> HaConnection | None:
        result = await self.session.execute(select(HaConnection).where(HaConnection.ingest_token == token))
        return result.scalar_one_or_none()
