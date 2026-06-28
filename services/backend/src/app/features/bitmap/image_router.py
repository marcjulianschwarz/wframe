from io import BytesIO
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth import AuthDep
from app.database.session import get_session
from app.features.bitmap.image_repository import ImageRepo
from app.features.bitmap.image_schemas import ImageRead, ImageSettingsUpdate

router = APIRouter(prefix="/image", tags=["image"])

# Cap the upload so a huge file can't exhaust memory/DB. The original is stored
# only to re-dither; a few MB is plenty for any photo at this screen size.
_MAX_BYTES = 8 * 1024 * 1024
_ALLOWED_FORMATS = {"PNG", "JPEG", "GIF", "WEBP", "BMP"}


def _repo(session: Annotated[AsyncSession, Depends(get_session)]) -> ImageRepo:
    return ImageRepo(session)


RepoDep = Annotated[ImageRepo, Depends(_repo)]


@router.get("", response_model=ImageRead)
async def get_image(auth: AuthDep, repo: RepoDep) -> ImageRead:
    row = await repo.get(auth.user.id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No image uploaded")
    return ImageRead.model_validate(row)


@router.put("", response_model=ImageRead)
async def upload_image(auth: AuthDep, repo: RepoDep, file: Annotated[UploadFile, File()]) -> ImageRead:
    data = await file.read()
    if len(data) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image must be at most {_MAX_BYTES // (1024 * 1024)} MB",
        )
    # Decode-validate rather than trust the client's content type: confirm the
    # bytes are a real, supported image before storing them.
    try:
        with Image.open(BytesIO(data)) as img:
            img.verify()
            fmt = img.format
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a valid image file")
    if fmt not in _ALLOWED_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image format: {fmt}",
        )
    content_type = f"image/{fmt.lower()}"
    row = await repo.upsert_image(auth.user.id, data, content_type)
    return ImageRead.model_validate(row)


@router.patch("", response_model=ImageRead)
async def update_settings(body: ImageSettingsUpdate, auth: AuthDep, repo: RepoDep) -> ImageRead:
    row = await repo.set_settings(auth.user.id, body.algorithm.value, body.fit.value, body.contrast)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No image uploaded")
    return ImageRead.model_validate(row)
