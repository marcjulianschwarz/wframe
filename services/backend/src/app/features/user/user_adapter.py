from app.features.user.user_models import User
from app.features.user.user_schemas import UserRead


def user_model_to_read(user: User) -> UserRead:
    return UserRead.model_validate(user)
