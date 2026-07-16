"""Background document processing: extract -> chunk -> embed -> persist.

Runs via FastAPI's BackgroundTasks after the upload request returns, so the
user gets an immediate response while ingestion happens asynchronously. A
solo-dev MVP tradeoff: this runs in-process rather than on a dedicated queue
(Celery/RQ), which is the natural next step once ingestion volume or
latency requirements grow (see README "Known limitations").
"""

import asyncio
import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import AsyncSessionLocal
from app.core.openai_client import OpenAINotConfiguredError
from app.models.document import Document, DocumentChunk, DocumentStatus
from app.services import chunking_service, embedding_service, extraction_service, storage_service
from app.services.extraction_service import (
    EmptyDocumentError,
    TooManyPagesError,
    UnsupportedFileTypeError,
)

logger = logging.getLogger("aiws.document_service")

EMBEDDING_BATCH_SIZE = 50
DEFAULT_CONTEXT_TOKEN_BUDGET = 12_000


async def process_document(document_id: UUID) -> None:
    async with AsyncSessionLocal() as db:
        document = await db.get(Document, document_id)
        if document is None:
            logger.warning("process_document called for missing document %s", document_id)
            return

        document.status = DocumentStatus.PROCESSING
        await db.commit()

        try:
            raw_bytes = storage_service.read_file(document.file_path)
            text = extraction_service.extract_text(raw_bytes, document.content_type)
            chunks = chunking_service.chunk_text(text)

            if not chunks:
                raise EmptyDocumentError("Document produced no usable text chunks.")

            batches = [
                chunks[i : i + EMBEDDING_BATCH_SIZE] for i in range(0, len(chunks), EMBEDDING_BATCH_SIZE)
            ]
            batch_results = await asyncio.gather(*(embedding_service.embed_texts(batch) for batch in batches))
            embeddings = [embedding for batch_result in batch_results for embedding in batch_result]

            for index, (chunk_content, embedding) in enumerate(zip(chunks, embeddings)):
                db.add(
                    DocumentChunk(
                        document_id=document.id,
                        chunk_index=index,
                        content=chunk_content,
                        token_count=chunking_service.count_tokens(chunk_content),
                        embedding=embedding,
                    )
                )

            document.status = DocumentStatus.READY
            document.processing_error = None
            await db.commit()
        except (
            UnsupportedFileTypeError,
            EmptyDocumentError,
            TooManyPagesError,
            OpenAINotConfiguredError,
        ) as exc:
            # These are the only expected, user-facing failure modes - their
            # message is safe to show as-is. Any other exception (e.g. a bug
            # surfacing from chunking/embedding) falls through to the generic
            # Exception branch below instead of leaking internals here.
            logger.exception("Failed to process document %s", document_id)
            await _mark_failed(db, document, str(exc)[:2000])
        except Exception:  # noqa: BLE001 - isolate unexpected failures onto the document row
            logger.exception("Failed to process document %s", document_id)
            await _mark_failed(db, document, "An unexpected error occurred while processing this document.")


async def _mark_failed(db: AsyncSession, document: Document, error_message: str) -> None:
    # Roll back first: the try block may have already added DocumentChunk
    # rows before failing partway through the embedding/persist loop, and
    # committing here must not leave those partial chunks behind alongside
    # a FAILED document.
    await db.rollback()
    document.status = DocumentStatus.FAILED
    document.processing_error = error_message
    await db.commit()


async def get_document_context_text(
    db: AsyncSession, document_id: UUID, max_tokens: int = DEFAULT_CONTEXT_TOKEN_BUDGET
) -> str:
    """Concatenate a document's chunks (in order) up to a token budget.

    Simplification: for very long documents this takes the first N chunks
    rather than summarizing in a map-reduce pass. That's the natural next
    step if documents routinely exceed the budget (see README).
    """
    result = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
    )
    chunks = result.scalars().all()

    pieces: list[str] = []
    used_tokens = 0
    for chunk in chunks:
        if used_tokens + chunk.token_count > max_tokens:
            break
        pieces.append(chunk.content)
        used_tokens += chunk.token_count

    return "\n\n".join(pieces)
