from __future__ import annotations

import enum
import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.core.db import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class DocumentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class Document(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "documents"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(
        # values_callable: without it, SQLAlchemy binds/reads enum columns
        # using the Python member *name* (e.g. "READY"), not `.value`
        # ("ready") - which would mismatch the lowercase values the
        # Postgres enum type was actually created with (see the initial
        # migration) and break every insert/filter against a real database.
        Enum(DocumentStatus, name="document_status", values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        default=DocumentStatus.PENDING,
        nullable=False,
    )
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    project: Mapped["Project"] = relationship(back_populates="documents")  # noqa: F821
    chunks: Mapped[list["DocumentChunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan", order_by="DocumentChunk.chunk_index"
    )
    flashcard_sets: Mapped[list["FlashcardSet"]] = relationship(  # noqa: F821
        back_populates="document", cascade="all, delete-orphan"
    )
    quizzes: Mapped[list["Quiz"]] = relationship(  # noqa: F821
        back_populates="document", cascade="all, delete-orphan"
    )


class DocumentChunk(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "document_chunks"

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(settings.embedding_dimensions), nullable=False)

    document: Mapped["Document"] = relationship(back_populates="chunks")
