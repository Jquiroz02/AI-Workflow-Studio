import logging

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import select

from app.api.deps import DbSession, OwnedDocument, OwnedProject
from app.core.config import settings
from app.core.rate_limit import limiter
from app.models.document import Document, DocumentStatus
from app.schemas.document import DocumentRead
from app.services import document_service, extraction_service, storage_service

logger = logging.getLogger("aiws.documents")

router = APIRouter(prefix="/projects/{project_id}/documents", tags=["documents"])

_UPLOAD_READ_CHUNK_SIZE = 1024 * 1024  # 1MB
_PDF_MAGIC_BYTES = b"%PDF-"


@router.get("", response_model=list[DocumentRead], summary="List documents in a project")
async def list_documents(
    project: OwnedProject,
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[Document]:
    result = await db.execute(
        select(Document)
        .where(Document.project_id == project.id)
        .order_by(Document.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED, summary="Upload a document")
@limiter.limit("20/minute")
async def upload_document(
    request: Request,
    project: OwnedProject,
    db: DbSession,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
) -> Document:
    if file.content_type not in extraction_service.SUPPORTED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF and plain text (.pdf, .txt) files are supported.",
        )

    # Read in bounded chunks and abort as soon as the limit is exceeded,
    # rather than buffering an arbitrarily large upload into memory before
    # ever checking its size.
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    pieces: list[bytes] = []
    total_size = 0
    while chunk := await file.read(_UPLOAD_READ_CHUNK_SIZE):
        total_size += len(chunk)
        if total_size > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"File exceeds the {settings.max_upload_size_mb}MB upload limit.",
            )
        pieces.append(chunk)
    content = b"".join(pieces)

    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    if file.content_type == "application/pdf" and not content.startswith(_PDF_MAGIC_BYTES):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File content doesn't look like a PDF (missing the PDF signature).",
        )

    relative_path = storage_service.save_file(project.id, file.filename or "upload", content)

    document = Document(
        project_id=project.id,
        original_filename=file.filename or "upload",
        content_type=file.content_type,
        file_path=relative_path,
        file_size_bytes=len(content),
        status=DocumentStatus.PENDING,
    )
    db.add(document)
    try:
        await db.commit()
    except Exception:
        # The file was already written to disk above; if the row never
        # makes it into the DB, don't leave it behind as an orphan with
        # nothing to reference or clean it up later.
        storage_service.delete_file(relative_path)
        raise
    await db.refresh(document)

    background_tasks.add_task(document_service.process_document, document.id)

    return document


@router.get("/{document_id}", response_model=DocumentRead, summary="Get a document")
async def get_document(document: OwnedDocument) -> Document:
    return document


@router.delete(
    "/{document_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a document"
)
async def delete_document(document: OwnedDocument, db: DbSession) -> None:
    file_path = document.file_path
    await db.delete(document)
    await db.commit()
    # The DB delete is the source of truth and has already succeeded here;
    # a disk error removing the file shouldn't turn a successful deletion
    # into a client-facing 500 (a retry would just 404 on the already-gone
    # document, so leaving the request to fail here would be misleading).
    try:
        storage_service.delete_file(file_path)
    except OSError:
        logger.exception("Failed to delete file for deleted document at %s", file_path)
