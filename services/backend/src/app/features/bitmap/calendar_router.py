from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth import AuthDep
from app.database.session import get_session
from app.features.bitmap.calendar_repository import CalendarRepo
from app.features.bitmap.calendar_schemas import CalendarRead, CalendarUpdate

router = APIRouter(prefix="/calendar", tags=["calendar"])


def _repo(session: Annotated[AsyncSession, Depends(get_session)]) -> CalendarRepo:
    return CalendarRepo(session)


RepoDep = Annotated[CalendarRepo, Depends(_repo)]


@router.get("", response_model=CalendarRead)
async def get_calendar(auth: AuthDep, repo: RepoDep) -> CalendarRead:
    row = await repo.get(auth.user.id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No calendar feed set")
    return CalendarRead.model_validate(row)


@router.put("", response_model=CalendarRead)
async def set_calendar(body: CalendarUpdate, auth: AuthDep, repo: RepoDep) -> CalendarRead:
    row = await repo.upsert(auth.user.id, body.ics_url.strip())
    return CalendarRead.model_validate(row)
