from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field


class WelcomeRead(BaseModel):
    """The user's current Welcome dashboard text."""

    eyebrow: str
    heading: str
    body: str
    footer: str

    model_config: ClassVar[ConfigDict] = ConfigDict(from_attributes=True)


class WelcomeUpdate(BaseModel):
    """Set the Welcome poster text: an optional kicker (eyebrow), the heading, the
    smaller body lines (newline-separated), and an optional footer. All free text
    so the user can write in their own language. Each role is stored separately,
    so leaving one blank never promotes another."""

    eyebrow: str = Field(default="", max_length=120)
    heading: str = Field(min_length=1, max_length=120)
    body: str = Field(default="", max_length=1000)
    footer: str = Field(default="", max_length=120)
