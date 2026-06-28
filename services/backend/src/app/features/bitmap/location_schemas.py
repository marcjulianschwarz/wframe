from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field


class LocationUpdate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    place: str | None = Field(default=None, max_length=120)


class LocationRead(BaseModel):
    latitude: float
    longitude: float
    place: str | None

    model_config: ClassVar[ConfigDict] = ConfigDict(from_attributes=True)
