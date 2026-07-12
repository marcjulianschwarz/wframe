from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field


class VagStopUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    vgn_number: int = Field(ge=1)
    products: str | None = Field(default=None, max_length=64)


class VagStopRead(BaseModel):
    name: str
    vgn_number: int
    products: str | None

    model_config: ClassVar[ConfigDict] = ConfigDict(from_attributes=True)
