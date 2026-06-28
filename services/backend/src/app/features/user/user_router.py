from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth import AuthDep
from app.database.session import get_session
from app.features.user.user_repository import UserRepo
from app.features.user.user_schemas import UserRead
from app.features.user.user_service import UserService

router = APIRouter(prefix="/users", tags=["user"])


def get_user_repo(session: Annotated[AsyncSession, Depends(get_session)]) -> UserRepo:
    return UserRepo(session)


def get_user_service(repo: Annotated[UserRepo, Depends(get_user_repo)]) -> UserService:
    return UserService(repo)


UserServiceDep = Annotated[UserService, Depends(get_user_service)]


@router.get("/me", response_model=UserRead)
async def get_me(auth: AuthDep) -> UserRead:
    return auth.user
