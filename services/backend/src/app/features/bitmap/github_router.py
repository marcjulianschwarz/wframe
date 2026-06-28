from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth import AuthDep
from app.database.session import get_session
from app.features.bitmap.github_adapter import github_profile_to_read
from app.features.bitmap.github_repository import GithubRepo
from app.features.bitmap.github_schemas import GithubRead, GithubUpdate
from app.settings import settings

router = APIRouter(prefix="/github", tags=["github"])


def _repo(session: Annotated[AsyncSession, Depends(get_session)]) -> GithubRepo:
    return GithubRepo(session)


RepoDep = Annotated[GithubRepo, Depends(_repo)]


async def _exists(username: str) -> bool:
    """Check the username resolves to a real public account before saving, so a
    typo is rejected here rather than silently producing an empty dashboard."""
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "wframe"}
    if settings.GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"
    try:
        async with httpx.AsyncClient(timeout=8, headers=headers) as client:
            r = await client.get(f"https://api.github.com/users/{username}")
        return r.status_code == 200
    except Exception:
        # On a network blip, don't block saving — the renderer falls back to the
        # last cached bitmap if the username later turns out unreachable.
        return True


@router.get("", response_model=GithubRead)
async def get_github(auth: AuthDep, repo: RepoDep) -> GithubRead:
    profile = await repo.get(auth.user.id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No GitHub username set")
    return github_profile_to_read(profile)


@router.put("", response_model=GithubRead)
async def set_github(body: GithubUpdate, auth: AuthDep, repo: RepoDep) -> GithubRead:
    if not await _exists(body.username):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No public GitHub user named '{body.username}'",
        )
    profile = await repo.upsert(auth.user.id, body.username)
    return github_profile_to_read(profile)
