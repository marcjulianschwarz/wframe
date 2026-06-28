import uuid
from datetime import datetime
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    hashed_password: str


class UserRead(BaseModel):
    id: uuid.UUID
    email: EmailStr
    username: str
    created_at: datetime
    updated_at: datetime

    model_config: ClassVar[ConfigDict] = ConfigDict(from_attributes=True)
