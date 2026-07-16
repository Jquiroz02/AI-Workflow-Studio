import uuid

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, OwnedDocument, ReadyDocument
from app.core.rate_limit import limiter
from app.models.quiz import Quiz, QuizQuestion
from app.schemas.quiz import QuizCreate, QuizRead
from app.services import document_service, quiz_service
from app.services.quiz_service import QuizGenerationError

router = APIRouter(prefix="/projects/{project_id}/documents/{document_id}/quizzes", tags=["quizzes"])


@router.get("", response_model=list[QuizRead], summary="List quizzes for a document")
async def list_quizzes(document: OwnedDocument, db: DbSession) -> list[Quiz]:
    result = await db.execute(
        select(Quiz)
        .where(Quiz.document_id == document.id)
        .options(selectinload(Quiz.questions))
        .order_by(Quiz.created_at.desc())
    )
    return list(result.scalars().all())


@router.post(
    "",
    response_model=QuizRead,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a multiple-choice quiz for a document",
)
@limiter.limit("10/minute")
async def create_quiz(
    request: Request, payload: QuizCreate, document: ReadyDocument, db: DbSession
) -> Quiz:
    context = await document_service.get_document_context_text(db, document.id)
    try:
        questions_data = await quiz_service.generate_quiz(context, payload.question_count)
    except QuizGenerationError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    quiz = Quiz(document_id=document.id, title=f"Quiz - {document.original_filename}")
    db.add(quiz)
    await db.flush()

    for index, q in enumerate(questions_data):
        db.add(
            QuizQuestion(
                quiz_id=quiz.id,
                order_index=index,
                question=q["question"],
                choices=q["choices"],
                correct_index=q["correct_index"],
                explanation=q["explanation"],
            )
        )

    await db.commit()

    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz.id).options(selectinload(Quiz.questions))
    )
    return result.scalar_one()


@router.get("/{quiz_id}", response_model=QuizRead, summary="Get a quiz")
async def get_quiz(quiz_id: uuid.UUID, document: OwnedDocument, db: DbSession) -> Quiz:
    result = await db.execute(
        select(Quiz)
        .where(Quiz.id == quiz_id, Quiz.document_id == document.id)
        .options(selectinload(Quiz.questions))
    )
    quiz = result.scalar_one_or_none()
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz


@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a quiz")
async def delete_quiz(quiz_id: uuid.UUID, document: OwnedDocument, db: DbSession) -> None:
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id, Quiz.document_id == document.id)
    )
    quiz = result.scalar_one_or_none()
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    await db.delete(quiz)
    await db.commit()
