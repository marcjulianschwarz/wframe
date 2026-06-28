from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field


class GithubUpdate(BaseModel):
    # GitHub usernames: 1–39 chars, alphanumeric or single hyphens.
    username: str = Field(min_length=1, max_length=39, pattern=r"^[A-Za-z0-9-]+$")


class GithubRead(BaseModel):
    username: str

    model_config: ClassVar[ConfigDict] = ConfigDict(from_attributes=True)
