import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def name_cannot_be_explicitly_cleared(cls, value: str | None) -> str | None:
        # Only runs when the client actually sends a value (Pydantic doesn't
        # validate unset defaults), so omitting `name` is still fine - this
        # only rejects an explicit `{"name": null}`, which would otherwise
        # pass validation and crash as a raw 500 on Project.name's NOT NULL
        # constraint once applied via `model_dump(exclude_unset=True)`.
        if value is None:
            raise ValueError("name cannot be null")
        return value


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime


class ProjectSummary(ProjectRead):
    document_count: int = 0
    conversation_count: int = 0
