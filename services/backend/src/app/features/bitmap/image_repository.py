import uuid
from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_models import ImageUpload


class ImageRepoProtocol(Protocol):
    async def get(self, user_id: uuid.UUID) -> ImageUpload | None: ...
    async def upsert_image(self, user_id: uuid.UUID, data: bytes, content_type: str) -> ImageUpload: ...
    async def set_settings(
        self, user_id: uuid.UUID, algorithm: str, fit: str, contrast: float
    ) -> ImageUpload | None: ...


class ImageRepo:
    def __init__(self, session: AsyncSession) -> None:
        self.session: AsyncSession = session

    async def get(self, user_id: uuid.UUID) -> ImageUpload | None:
        return await self.session.get(ImageUpload, user_id)

    async def upsert_image(self, user_id: uuid.UUID, data: bytes, content_type: str) -> ImageUpload:
        """Store new image bytes, preserving the user's existing algorithm/fit."""
        row = await self.session.get(ImageUpload, user_id)
        if row is None:
            row = ImageUpload(user_id=user_id, data=data, content_type=content_type)
            self.session.add(row)
        else:
            row.data = data
            row.content_type = content_type
        await self.session.flush()
        await self.session.refresh(row)
        return row

    async def set_settings(self, user_id: uuid.UUID, algorithm: str, fit: str, contrast: float) -> ImageUpload | None:
        row = await self.session.get(ImageUpload, user_id)
        if row is None:
            return None
        row.algorithm = algorithm
        row.fit = fit
        row.contrast = contrast
        await self.session.flush()
        await self.session.refresh(row)
        return row
