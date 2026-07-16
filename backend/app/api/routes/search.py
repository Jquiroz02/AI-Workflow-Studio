from fastapi import APIRouter, Query, Request

from app.api.deps import DbSession, OwnedProject
from app.core.rate_limit import limiter
from app.schemas.document import DocumentSearchResult
from app.services import embedding_service, rag_service

router = APIRouter(prefix="/projects/{project_id}/search", tags=["search"])


@router.get("", response_model=list[DocumentSearchResult], summary="Semantic search across a project's documents")
@limiter.limit("30/minute")
async def search_documents(
    request: Request,
    project: OwnedProject,
    db: DbSession,
    q: str = Query(min_length=1, max_length=500),
    limit: int = Query(default=10, ge=1, le=50),
) -> list[DocumentSearchResult]:
    query_embedding = await embedding_service.embed_text(q)
    context_chunks = await rag_service.retrieve_relevant_chunks(
        db, project_id=project.id, query_embedding=query_embedding, top_k=limit
    )

    return [
        DocumentSearchResult(
            document_id=document.id,
            document_filename=document.original_filename,
            chunk_id=chunk.id,
            snippet=chunk.content[:300],
            similarity=max(0.0, 1 - distance),
        )
        for chunk, document, distance in context_chunks
    ]
