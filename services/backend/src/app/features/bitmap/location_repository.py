import uuid
from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_models import WeatherLocation


class LocationRepoProtocol(Protocol):
    async def get(self, user_id: uuid.UUID) -> WeatherLocation | None: ...
    async def upsert(self, user_id: uuid.UUID, lat: float, lon: float, place: str | None) -> WeatherLocation: ...


class LocationRepo:
    def __init__(self, session: AsyncSession) -> None:
        self.session: AsyncSession = session

    async def get(self, user_id: uuid.UUID) -> WeatherLocation | None:
        return await self.session.get(WeatherLocation, user_id)

    async def upsert(self, user_id: uuid.UUID, lat: float, lon: float, place: str | None) -> WeatherLocation:
        loc = await self.session.get(WeatherLocation, user_id)
        if loc is None:
            loc = WeatherLocation(user_id=user_id, latitude=lat, longitude=lon, place=place)
            self.session.add(loc)
        else:
            loc.latitude = lat
            loc.longitude = lon
            loc.place = place
        await self.session.flush()
        await self.session.refresh(loc)
        return loc
