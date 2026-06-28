import uuid

from app.features.user.user_adapter import user_model_to_read
from app.features.user.user_repository import UserRepoProtocol
from app.features.user.user_schemas import UserRead


class UserService:
    def __init__(self, repo: UserRepoProtocol) -> None:
        self.repo: UserRepoProtocol = repo

    async def get(self, user_id: uuid.UUID) -> UserRead | None:
        user = await self.repo.get(user_id)
        return user_model_to_read(user) if user else None
