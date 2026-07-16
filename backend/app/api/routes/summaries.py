from datetime import datetime, timezone

from fastapi import APIRouter, Request

from app.api.deps import DbSession, ReadyDocument
from app.core.rate_limit import limiter
from app.models.document import Document
from app.schemas.document import DocumentRead
from app.services import document_service, summary_service

router = APIRouter(prefix="/projects/{project_id}/documents/{document_id}/summary", tags=["summaries"])


@router.post("", response_model=DocumentRead, summary="Generate (or regenerate) a document summary")
@limiter.limit("10/minute")
async def create_summary(request: Request, document: ReadyDocument, db: DbSession) -> Document:
    context = await document_service.get_document_context_text(db, document.id)
    summary = await summary_service.generate_summary(context)

    document.summary = summary
    document.summary_generated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(document)
    return document
