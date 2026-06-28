from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth_context import AuthContext
from app.auth.security import decode_access_token
from app.database.session import get_session
from app.features.user.user_repository import UserRepo
from app.features.user.user_schemas import UserRead


async def verify_token(
    session: Annotated[AsyncSession, Depends(get_session)],
    authorization: Annotated[str | None, Header()] = None,
) -> AuthContext:
    """Validate the Bearer JWT and resolve the authenticated user."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    raw = authorization.split(" ", 1)[1].strip()
    user_id = decode_access_token(raw)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    repo = UserRepo(session)
    user = await repo.get(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )
    return AuthContext(raw_token=raw, user=UserRead.model_validate(user))


AuthDep = Annotated[AuthContext, Depends(verify_token)]
