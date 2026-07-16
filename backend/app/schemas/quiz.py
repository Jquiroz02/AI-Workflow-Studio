import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class QuizQuestionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    question: str
    choices: list[str]
    correct_index: int
    explanation: str | None
    order_index: int


class QuizRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    title: str
    created_at: datetime
    questions: list[QuizQuestionRead] = []


class QuizCreate(BaseModel):
    question_count: int = Field(default=5, ge=3, le=20)
