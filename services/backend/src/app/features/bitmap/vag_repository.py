import uuid
from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_models import VagStop


class VagRepoProtocol(Protocol):
    async def get(self, user_id: uuid.UUID) -> VagStop | None: ...
    async def upsert(self, user_id: uuid.UUID, name: str, vgn_number: int, products: str | None) -> VagStop: ...


class VagRepo:
    def __init__(self, session: AsyncSession) -> None:
        self.session: AsyncSession = session

    async def get(self, user_id: uuid.UUID) -> VagStop | None:
        return await self.session.get(VagStop, user_id)

    async def upsert(self, user_id: uuid.UUID, name: str, vgn_number: int, products: str | None) -> VagStop:
        stop = await self.session.get(VagStop, user_id)
        if stop is None:
            stop = VagStop(user_id=user_id, name=name, vgn_number=vgn_number, products=products)
            self.session.add(stop)
        else:
            stop.name = name
            stop.vgn_number = vgn_number
            stop.products = products
        await self.session.flush()
        await self.session.refresh(stop)
        return stop
