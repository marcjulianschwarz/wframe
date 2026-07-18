from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CalendarRead(BaseModel):
    """The user's current Calendar feed URL."""

    ics_url: str

    model_config: ClassVar[ConfigDict] = ConfigDict(from_attributes=True)


class CalendarUpdate(BaseModel):
    """Set the published iCalendar (ICS) feed URL to pull events from.

    Accepts ``webcal://``, ``http://``, and ``https://`` links (webcal is
    normalized to https on fetch). Treated as a secret — for published iCloud
    calendars the URL itself grants read access, so it is never logged."""

    ics_url: str = Field(min_length=1, max_length=2048)

    @field_validator("ics_url")
    @classmethod
    def _valid_scheme(cls, v: str) -> str:
        v = v.strip()
        if not v.lower().startswith(("webcal://", "http://", "https://")):
            raise ValueError("URL must start with webcal://, http://, or https://")
        return v
