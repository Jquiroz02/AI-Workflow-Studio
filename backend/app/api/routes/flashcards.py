import uuid

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, OwnedDocument, ReadyDocument
from app.core.rate_limit import limiter
from app.models.flashcard import Flashcard, FlashcardSet
from app.schemas.flashcard import FlashcardSetCreate, FlashcardSetRead
from app.services import document_service, flashcard_service
from app.services.flashcard_service import FlashcardGenerationError

router = APIRouter(
    prefix="/projects/{project_id}/documents/{document_id}/flashcards", tags=["flashcards"]
)


@router.get("", response_model=list[FlashcardSetRead], summary="List flashcard sets for a document")
async def list_flashcard_sets(document: OwnedDocument, db: DbSession) -> list[FlashcardSet]:
    result = await db.execute(
        select(FlashcardSet)
        .where(FlashcardSet.document_id == document.id)
        .options(selectinload(FlashcardSet.cards))
        .order_by(FlashcardSet.created_at.desc())
    )
    return list(result.scalars().all())


@router.post(
    "",
    response_model=FlashcardSetRead,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a flashcard set for a document",
)
@limiter.limit("10/minute")
async def create_flashcard_set(
    request: Request, payload: FlashcardSetCreate, document: ReadyDocument, db: DbSession
) -> FlashcardSet:
    context = await document_service.get_document_context_text(db, document.id)
    try:
        cards_data = await flashcard_service.generate_flashcards(context, payload.card_count)
    except FlashcardGenerationError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    flashcard_set = FlashcardSet(
        document_id=document.id, title=f"Flashcards - {document.original_filename}"
    )
    db.add(flashcard_set)
    await db.flush()

    for index, card in enumerate(cards_data):
        db.add(
            Flashcard(
                flashcard_set_id=flashcard_set.id,
                order_index=index,
                question=card["question"],
                answer=card["answer"],
            )
        )

    await db.commit()

    result = await db.execute(
        select(FlashcardSet)
        .where(FlashcardSet.id == flashcard_set.id)
        .options(selectinload(FlashcardSet.cards))
    )
    return result.scalar_one()


@router.get("/{set_id}", response_model=FlashcardSetRead, summary="Get a flashcard set")
async def get_flashcard_set(set_id: uuid.UUID, document: OwnedDocument, db: DbSession) -> FlashcardSet:
    result = await db.execute(
        select(FlashcardSet)
        .where(FlashcardSet.id == set_id, FlashcardSet.document_id == document.id)
        .options(selectinload(FlashcardSet.cards))
    )
    flashcard_set = result.scalar_one_or_none()
    if flashcard_set is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard set not found")
    return flashcard_set


@router.delete(
    "/{set_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a flashcard set"
)
async def delete_flashcard_set(set_id: uuid.UUID, document: OwnedDocument, db: DbSession) -> None:
    result = await db.execute(
        select(FlashcardSet).where(FlashcardSet.id == set_id, FlashcardSet.document_id == document.id)
    )
    flashcard_set = result.scalar_one_or_none()
    if flashcard_set is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard set not found")
    await db.delete(flashcard_set)
    await db.commit()
