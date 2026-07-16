import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.document import DocumentStatus


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    original_filename: str
    content_type: str
    file_size_bytes: int
    status: DocumentStatus
    processing_error: str | None
    summary: str | None
    summary_generated_at: datetime | None
    created_at: datetime


class DocumentSearchResult(BaseModel):
    document_id: uuid.UUID
    document_filename: str
    chunk_id: uuid.UUID
    snippet: str
    similarity: float
