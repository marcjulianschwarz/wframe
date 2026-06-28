from typing import Annotated, cast

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth import AuthDep
from app.database.session import get_session
from app.features.bitmap.location_adapter import location_to_read
from app.features.bitmap.location_repository import LocationRepo
from app.features.bitmap.location_schemas import LocationRead, LocationUpdate

router = APIRouter(prefix="/location", tags=["location"])


def _repo(session: Annotated[AsyncSession, Depends(get_session)]) -> LocationRepo:
    return LocationRepo(session)


RepoDep = Annotated[LocationRepo, Depends(_repo)]


async def _reverse_geocode(lat: float, lon: float) -> str | None:
    """Resolve coordinates to a city/town name via BigDataCloud's free,
    key-less reverse-geocode API. Returns None on any failure so a missing
    name never blocks saving the location."""
    url = "https://api.bigdatacloud.net/data/reverse-geocode-client"
    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
            r = await client.get(url, params={"latitude": lat, "longitude": lon, "localityLanguage": "en"})
            _ = r.raise_for_status()
            d = cast("dict[str, str]", r.json())
        name = d.get("city") or d.get("locality") or d.get("principalSubdivision")
        country = d.get("countryCode")
        if name and country:
            return f"{name}, {country}"
        return name or None
    except Exception:
        return None


@router.get("", response_model=LocationRead)
async def get_location(auth: AuthDep, repo: RepoDep) -> LocationRead:
    loc = await repo.get(auth.user.id)
    if loc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No location set")
    return location_to_read(loc)


@router.put("", response_model=LocationRead)
async def set_location(body: LocationUpdate, auth: AuthDep, repo: RepoDep) -> LocationRead:
    # If the client didn't supply a name, derive one from the coordinates so the
    # weather dashboard shows the place instead of "Your location".
    place = body.place or await _reverse_geocode(body.latitude, body.longitude)
    loc = await repo.upsert(auth.user.id, body.latitude, body.longitude, place)
    return location_to_read(loc)
