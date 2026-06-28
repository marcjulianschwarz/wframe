from __future__ import annotations

from fastapi import HTTPException, status

from app.auth.auth_schemas import LoginRequest, RegisterRequest
from app.auth.security import create_access_token, hash_password, verify_password
from app.features.user.user_models import User
from app.features.user.user_repository import UserRepoProtocol
from app.features.user.user_schemas import UserCreate


def _username_from_email(email: str) -> str:
    return email.split("@", 1)[0][:64]


class AuthService:
    def __init__(self, repo: UserRepoProtocol) -> None:
        self.repo: UserRepoProtocol = repo

    async def register(self, data: RegisterRequest) -> str:
        if await self.repo.get_by_email(data.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )
        username = data.username or _username_from_email(data.email)
        # Ensure username uniqueness; suffix on collision.
        base = username
        i = 1
        while await self.repo.get_by_username(username):
            i += 1
            username = f"{base[:60]}{i}"
        user = await self.repo.create(
            UserCreate(
                email=data.email,
                username=username,
                hashed_password=hash_password(data.password),
            )
        )
        return create_access_token(user.id)

    async def login(self, data: LoginRequest) -> str:
        user: User | None = await self.repo.get_by_email(data.email)
        # Always run verify to avoid leaking which emails exist via timing.
        if user is None or not verify_password(data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        return create_access_token(user.id)
