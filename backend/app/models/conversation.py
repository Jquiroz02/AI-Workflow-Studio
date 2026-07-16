from __future__ import annotations

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"


class Conversation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "conversations"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # SET NULL, not CASCADE: this is an optional "which document was this
    # chat scoped to" filter, not ownership - deleting the document should
    # unscope the conversation (it can keep going project-wide), not delete
    # the whole conversation and every message in it.
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), default="New conversation", nullable=False)

    project: Mapped["Project"] = relationship(back_populates="conversations")  # noqa: F821
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at"
    )


class Message(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[MessageRole] = mapped_column(
        # values_callable, see the same note on Document.status - binds/reads
        # using the lowercase `.value` ("user") to match the Postgres enum
        # type, not the uppercase Python member name ("USER").
        Enum(MessageRole, name="message_role", values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # List of {"document_id", "document_filename", "chunk_id", "snippet"}
    # (see Citation in app/schemas/conversation.py) used as RAG citations.
    citations: Mapped[list | None] = mapped_column(JSON, nullable=True)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
