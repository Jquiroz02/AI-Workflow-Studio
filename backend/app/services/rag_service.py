"""Retrieval-augmented generation: similarity search + prompt assembly + answer generation."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.openai_client import get_openai_client, with_openai_retry
from app.models.document import Document, DocumentChunk, DocumentStatus
from app.schemas.conversation import AnswerMode

TOP_K = 5

DOCUMENT_ONLY_SYSTEM_PROMPT = (
    "You are a research assistant answering questions strictly using the provided "
    "document excerpts. Cite excerpts you rely on with the notation [n], matching "
    "the excerpt numbers given. If the excerpts don't contain enough information "
    "to answer, say so plainly instead of guessing."
)

AI_KNOWLEDGE_SYSTEM_PROMPT = (
    "You are a research assistant answering questions using the provided document "
    "excerpts as your primary source. Cite excerpts you rely on with the notation "
    "[n], matching the excerpt numbers given. If the excerpts fully answer the "
    "question, rely on them alone and do not add unrequested outside information. "
    "Only when the excerpts don't contain enough information to answer, you may "
    "supplement with your own general knowledge - but that portion of the answer "
    "must start with the literal prefix 'General knowledge:' on its own line, so "
    "the reader can always tell which parts came from the documents and which "
    "didn't. Never blend an unlabeled guess into a document-grounded answer."
)

SYSTEM_PROMPTS: dict[AnswerMode, str] = {
    "document_only": DOCUMENT_ONLY_SYSTEM_PROMPT,
    "ai_knowledge": AI_KNOWLEDGE_SYSTEM_PROMPT,
}

ContextChunk = tuple[DocumentChunk, Document, float]


async def retrieve_relevant_chunks(
    db: AsyncSession,
    project_id: UUID,
    query_embedding: list[float],
    document_id: UUID | None = None,
    top_k: int = TOP_K,
) -> list[ContextChunk]:
    distance_expr = DocumentChunk.embedding.cosine_distance(query_embedding)

    stmt = (
        select(DocumentChunk, Document, distance_expr.label("distance"))
        .join(Document, Document.id == DocumentChunk.document_id)
        .where(Document.project_id == project_id, Document.status == DocumentStatus.READY)
    )
    if document_id is not None:
        stmt = stmt.where(Document.id == document_id)
    stmt = stmt.order_by(distance_expr).limit(top_k)

    rows = (await db.execute(stmt)).all()
    return [(chunk, document, distance) for chunk, document, distance in rows]


def build_chat_messages(
    question: str, context_chunks: list[ContextChunk], answer_mode: AnswerMode = "document_only"
) -> list[dict]:
    if not context_chunks:
        context_block = "No relevant excerpts were found in this project's documents."
    else:
        context_block = "\n\n".join(
            f"[{i + 1}] (from {document.original_filename}): {chunk.content}"
            for i, (chunk, document, _distance) in enumerate(context_chunks)
        )

    user_prompt = f"Document excerpts:\n{context_block}\n\nQuestion: {question}"
    return [
        {"role": "system", "content": SYSTEM_PROMPTS[answer_mode]},
        {"role": "user", "content": user_prompt},
    ]


@with_openai_retry
async def generate_answer(
    question: str, context_chunks: list[ContextChunk], answer_mode: AnswerMode = "document_only"
) -> str:
    client = get_openai_client()
    messages = build_chat_messages(question, context_chunks, answer_mode)
    response = await client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=messages,
        temperature=0.2,
    )
    return response.choices[0].message.content or ""
