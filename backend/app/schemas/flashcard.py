import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FlashcardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    question: str
    answer: str
    order_index: int


class FlashcardSetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    title: str
    created_at: datetime
    cards: list[FlashcardRead] = []


class FlashcardSetCreate(BaseModel):
    card_count: int = Field(default=10, ge=3, le=30)
