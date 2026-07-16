import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.conversation import MessageRole

# "document_only": answer strictly from retrieved document excerpts, and say
# so plainly if they don't cover the question (today's default behavior).
# "ai_knowledge": prefer document excerpts when they answer the question, but
# fall back to the model's general knowledge - clearly labeled - when they
# don't, instead of just refusing.
AnswerMode = Literal["document_only", "ai_knowledge"]


class Citation(BaseModel):
    document_id: uuid.UUID
    document_filename: str
    chunk_id: uuid.UUID
    snippet: str


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: MessageRole
    content: str
    citations: list[Citation] | None
    created_at: datetime


class ConversationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    document_id: uuid.UUID | None
    title: str
    created_at: datetime
    updated_at: datetime


class ConversationWithMessages(ConversationRead):
    messages: list[MessageRead] = []


class ChatRequest(BaseModel):
    conversation_id: uuid.UUID | None = None
    document_id: uuid.UUID | None = Field(
        default=None, description="Scope retrieval to a single document; omit to search the whole project."
    )
    message: str = Field(min_length=1, max_length=4000)
    answer_mode: AnswerMode = "document_only"


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    message: MessageRead
