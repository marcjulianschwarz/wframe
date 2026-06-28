from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.settings import settings


def _bcrypt_safe(plain: str) -> bytes:
    """bcrypt hashes at most 72 bytes and raises on longer input; truncate
    ourselves so hashing and verifying always agree on the same prefix."""
    return plain.encode("utf-8")[:72]


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(_bcrypt_safe(plain), bcrypt.gensalt()).decode("ascii")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(_bcrypt_safe(plain), hashed.encode("ascii"))


def create_access_token(user_id: uuid.UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> uuid.UUID | None:
    """Return the user id from a valid token, else None."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        sub: object = payload.get("sub")
        return uuid.UUID(str(sub)) if sub else None
    except (JWTError, ValueError):
        return None
