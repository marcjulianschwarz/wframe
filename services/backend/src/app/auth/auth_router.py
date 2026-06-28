from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth_schemas import LoginRequest, RegisterRequest, TokenResponse
from app.auth.auth_service import AuthService
from app.database.session import get_session
from app.features.user.user_repository import UserRepo

router = APIRouter(prefix="/auth", tags=["auth"])


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> AuthService:
    return AuthService(UserRepo(session))


ServiceDep = Annotated[AuthService, Depends(_service)]


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, service: ServiceDep) -> TokenResponse:
    token = await service.register(body)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, service: ServiceDep) -> TokenResponse:
    token = await service.login(body)
    return TokenResponse(access_token=token)
