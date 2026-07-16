from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class FlashcardSet(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "flashcard_sets"

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)

    document: Mapped["Document"] = relationship(back_populates="flashcard_sets")  # noqa: F821
    cards: Mapped[list["Flashcard"]] = relationship(
        back_populates="flashcard_set", cascade="all, delete-orphan", order_by="Flashcard.order_index"
    )


class Flashcard(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "flashcards"

    flashcard_set_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("flashcard_sets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)

    flashcard_set: Mapped["FlashcardSet"] = relationship(back_populates="cards")
