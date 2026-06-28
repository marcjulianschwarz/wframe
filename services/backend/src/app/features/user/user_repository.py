import uuid
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.user.user_models import User
from app.features.user.user_schemas import UserCreate


class UserRepoProtocol(Protocol):
    async def get(self, user_id: uuid.UUID) -> User | None: ...
    async def get_by_email(self, email: str) -> User | None: ...
    async def get_by_username(self, username: str) -> User | None: ...
    async def create(self, data: UserCreate) -> User: ...


class UserRepo:
    def __init__(self, session: AsyncSession) -> None:
        self.session: AsyncSession = session

    async def get(self, user_id: uuid.UUID) -> User | None:
        return await self.session.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        result = await self.session.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def create(self, data: UserCreate) -> User:
        user = User(
            email=data.email,
            username=data.username,
            hashed_password=data.hashed_password,
        )
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user
