from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth import AuthDep
from app.database.session import get_session
from app.features.bitmap.welcome_repository import WelcomeRepo
from app.features.bitmap.welcome_schemas import WelcomeRead, WelcomeUpdate

router = APIRouter(prefix="/welcome", tags=["welcome"])


def _repo(session: Annotated[AsyncSession, Depends(get_session)]) -> WelcomeRepo:
    return WelcomeRepo(session)


RepoDep = Annotated[WelcomeRepo, Depends(_repo)]


@router.get("", response_model=WelcomeRead)
async def get_welcome(auth: AuthDep, repo: RepoDep) -> WelcomeRead:
    row = await repo.get(auth.user.id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No welcome text set")
    return WelcomeRead.model_validate(row)


@router.put("", response_model=WelcomeRead)
async def set_welcome(body: WelcomeUpdate, auth: AuthDep, repo: RepoDep) -> WelcomeRead:
    row = await repo.upsert(auth.user.id, body.heading.strip(), body.body.strip())
    return WelcomeRead.model_validate(row)
