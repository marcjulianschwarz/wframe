import uuid
from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_models import GithubProfile


class GithubRepoProtocol(Protocol):
    async def get(self, user_id: uuid.UUID) -> GithubProfile | None: ...
    async def upsert(self, user_id: uuid.UUID, username: str) -> GithubProfile: ...


class GithubRepo:
    def __init__(self, session: AsyncSession) -> None:
        self.session: AsyncSession = session

    async def get(self, user_id: uuid.UUID) -> GithubProfile | None:
        return await self.session.get(GithubProfile, user_id)

    async def upsert(self, user_id: uuid.UUID, username: str) -> GithubProfile:
        profile = await self.session.get(GithubProfile, user_id)
        if profile is None:
            profile = GithubProfile(user_id=user_id, username=username)
            self.session.add(profile)
        else:
            profile.username = username
        await self.session.flush()
        await self.session.refresh(profile)
        return profile
