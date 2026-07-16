import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, OwnedProject
from app.core.rate_limit import limiter
from app.models.conversation import Conversation, Message, MessageRole
from app.models.document import Document
from app.schemas.conversation import (
    ChatRequest,
    ChatResponse,
    Citation,
    ConversationRead,
    ConversationWithMessages,
    MessageRead,
)
from app.services import embedding_service, rag_service

router = APIRouter(prefix="/projects/{project_id}", tags=["chat"])


@router.get("/conversations", response_model=list[ConversationRead], summary="List a project's conversations")
async def list_conversations(
    project: OwnedProject,
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[Conversation]:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.project_id == project.id)
        .order_by(Conversation.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationWithMessages,
    summary="Get a conversation with its full message history",
)
async def get_conversation(
    conversation_id: uuid.UUID, project: OwnedProject, db: DbSession
) -> Conversation:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id, Conversation.project_id == project.id)
        .options(selectinload(Conversation.messages))
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conversation


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a conversation",
)
async def delete_conversation(conversation_id: uuid.UUID, project: OwnedProject, db: DbSession) -> None:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id, Conversation.project_id == project.id
        )
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    await db.delete(conversation)
    await db.commit()


@router.post("/chat", response_model=ChatResponse, summary="Send a chat message (RAG)")
@limiter.limit("15/minute")
async def send_chat_message(
    request: Request, payload: ChatRequest, project: OwnedProject, db: DbSession
) -> ChatResponse:
    conversation: Conversation | None = None

    if payload.conversation_id is not None:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == payload.conversation_id, Conversation.project_id == project.id
            )
        )
        conversation = result.scalar_one_or_none()
        if conversation is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if payload.document_id is not None:
        doc_result = await db.execute(
            select(Document).where(Document.id == payload.document_id, Document.project_id == project.id)
        )
        if doc_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if conversation is None:
        conversation = Conversation(
            project_id=project.id,
            document_id=payload.document_id,
            title=payload.message[:80],
        )
        db.add(conversation)
        await db.flush()

    # Explicit created_at (rather than relying on the column's server_default):
    # both messages commit in the same transaction below, and Postgres's
    # now() is fixed for the whole transaction, so the default would give
    # the user and assistant messages an identical timestamp - making their
    # relative order (Message.created_at) undefined instead of user-then-assistant.
    db.add(
        Message(
            conversation_id=conversation.id,
            role=MessageRole.USER,
            content=payload.message,
            created_at=datetime.now(timezone.utc),
        )
    )

    query_embedding = await embedding_service.embed_text(payload.message)
    context_chunks = await rag_service.retrieve_relevant_chunks(
        db,
        project_id=project.id,
        query_embedding=query_embedding,
        document_id=payload.document_id,
    )
    answer = await rag_service.generate_answer(payload.message, context_chunks, payload.answer_mode)

    citations = [
        Citation(
            document_id=document.id,
            document_filename=document.original_filename,
            chunk_id=chunk.id,
            snippet=chunk.content[:300],
        ).model_dump(mode="json")
        for chunk, document, _distance in context_chunks
    ]

    assistant_message = Message(
        conversation_id=conversation.id,
        role=MessageRole.ASSISTANT,
        content=answer,
        citations=citations,
        created_at=datetime.now(timezone.utc),
    )
    db.add(assistant_message)
    conversation.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(assistant_message)

    return ChatResponse(
        conversation_id=conversation.id, message=MessageRead.model_validate(assistant_message)
    )
