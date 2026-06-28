from dataclasses import dataclass

from app.features.user.user_schemas import UserRead


@dataclass(slots=True)
class AuthContext:
    raw_token: str
    user: UserRead
