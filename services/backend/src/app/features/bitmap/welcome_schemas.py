from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field


class WelcomeRead(BaseModel):
    """The user's current Welcome dashboard text."""

    heading: str
    body: str

    model_config: ClassVar[ConfigDict] = ConfigDict(from_attributes=True)


class WelcomeUpdate(BaseModel):
    """Set the Welcome heading and the smaller text below it (newline-separated
    lines). All free text so the user can write in their own language."""

    heading: str = Field(min_length=1, max_length=120)
    body: str = Field(default="", max_length=1000)
