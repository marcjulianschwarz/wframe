from typing import Annotated, ClassVar

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth import AuthDep
from app.database.session import get_session
from app.features.bitmap.vag_adapter import vag_stop_to_read
from app.features.bitmap.vag_repository import VagRepo
from app.features.bitmap.vag_schemas import VagStopRead, VagStopUpdate

VAG_API = "https://start.vag.de/dm/api/v1"

router = APIRouter(prefix="/vag", tags=["vag"])


def _repo(session: Annotated[AsyncSession, Depends(get_session)]) -> VagRepo:
    return VagRepo(session)


RepoDep = Annotated[VagRepo, Depends(_repo)]


class _Haltestelle(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(extra="ignore")

    Haltestellenname: str
    VGNKennung: int | None = None
    Produkte: str | None = None


class _HaltestellenResponse(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(extra="ignore")

    Haltestellen: list[_Haltestelle] = []


@router.get("/stops", response_model=list[VagStopRead])
async def search_stops(
    auth: AuthDep,  # pyright: ignore[reportUnusedParameter] auth gate only
    name: Annotated[str, Query(min_length=2, max_length=120)],
) -> list[VagStopRead]:
    """Proxy the VAG stop search so the browser never talks to the VAG API
    (avoids CORS and keeps the external endpoint in one place)."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{VAG_API}/haltestellen/vgn", params={"name": name})
            _ = r.raise_for_status()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="VAG stop search is unreachable right now",
        ) from exc
    data = _HaltestellenResponse.model_validate(r.json())
    return [
        VagStopRead(name=h.Haltestellenname, vgn_number=h.VGNKennung, products=h.Produkte)
        for h in data.Haltestellen
        if h.VGNKennung is not None
    ]


@router.get("", response_model=VagStopRead)
async def get_stop(auth: AuthDep, repo: RepoDep) -> VagStopRead:
    stop = await repo.get(auth.user.id)
    if stop is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No stop set")
    return vag_stop_to_read(stop)


@router.put("", response_model=VagStopRead)
async def set_stop(body: VagStopUpdate, auth: AuthDep, repo: RepoDep) -> VagStopRead:
    stop = await repo.upsert(auth.user.id, body.name, body.vgn_number, body.products)
    return vag_stop_to_read(stop)
