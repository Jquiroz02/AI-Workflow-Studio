import io

from sqlalchemy import select

from app.models.document import DocumentChunk


async def test_upload_document_processes_in_background_and_becomes_ready(client, project, monkeypatch):
    async def fake_embed_texts(texts):
        return [[0.01] * 1536 for _ in texts]

    monkeypatch.setattr("app.services.embedding_service.embed_texts", fake_embed_texts)

    files = {"file": ("notes.txt", io.BytesIO(b"Hello world. This is a test document."), "text/plain")}
    resp = await client.post(f"/api/v1/projects/{project.id}/documents", files=files)
    assert resp.status_code == 201
    document_id = resp.json()["id"]

    # Background task runs within the ASGI call, so the state is settled by now.
    get_resp = await client.get(f"/api/v1/projects/{project.id}/documents/{document_id}")
    assert get_resp.json()["status"] == "ready"


async def test_upload_marks_document_failed_with_generic_message_for_unexpected_errors(
    client, project, monkeypatch
):
    async def failing_embed_texts(texts):
        raise RuntimeError("embedding service unavailable: connection reset by db-internal-host-7")

    monkeypatch.setattr("app.services.embedding_service.embed_texts", failing_embed_texts)

    files = {"file": ("notes.txt", io.BytesIO(b"Some content to embed."), "text/plain")}
    resp = await client.post(f"/api/v1/projects/{project.id}/documents", files=files)
    document_id = resp.json()["id"]

    get_resp = await client.get(f"/api/v1/projects/{project.id}/documents/{document_id}")
    body = get_resp.json()
    assert body["status"] == "failed"
    # Unexpected exception types (anything not a ValueError) get a generic,
    # client-facing message rather than echoing internal error text.
    assert body["processing_error"] == "An unexpected error occurred while processing this document."
    assert "db-internal-host-7" not in body["processing_error"]


async def test_upload_marks_document_failed_with_specific_message_for_known_errors(
    client, project, monkeypatch
):
    monkeypatch.setattr(
        "app.services.document_service.chunking_service.chunk_text", lambda text, **kwargs: []
    )

    files = {"file": ("notes.txt", io.BytesIO(b"Some content."), "text/plain")}
    resp = await client.post(f"/api/v1/projects/{project.id}/documents", files=files)
    document_id = resp.json()["id"]

    get_resp = await client.get(f"/api/v1/projects/{project.id}/documents/{document_id}")
    body = get_resp.json()
    assert body["status"] == "failed"
    assert body["processing_error"] == "Document produced no usable text chunks."


async def test_processing_failure_after_partial_chunks_leaves_no_orphaned_chunks(
    client, project, monkeypatch, db_session
):
    async def fake_embed_texts(texts):
        return [[0.01] * 1536 for _ in texts]

    monkeypatch.setattr("app.services.embedding_service.embed_texts", fake_embed_texts)
    monkeypatch.setattr(
        "app.services.document_service.chunking_service.chunk_text",
        lambda text, **kwargs: ["chunk one", "chunk two", "chunk three"],
    )

    call_count = 0

    def flaky_count_tokens(text):
        nonlocal call_count
        call_count += 1
        if call_count == 2:
            raise RuntimeError("simulated failure partway through persisting chunks")
        return 5

    monkeypatch.setattr(
        "app.services.document_service.chunking_service.count_tokens", flaky_count_tokens
    )

    files = {"file": ("notes.txt", io.BytesIO(b"content"), "text/plain")}
    resp = await client.post(f"/api/v1/projects/{project.id}/documents", files=files)
    document_id = resp.json()["id"]

    get_resp = await client.get(f"/api/v1/projects/{project.id}/documents/{document_id}")
    assert get_resp.json()["status"] == "failed"

    chunks_result = await db_session.execute(
        select(DocumentChunk).where(DocumentChunk.document_id == document_id)
    )
    # The first chunk was `db.add()`-ed before the second one blew up; the
    # failure handler must roll that back rather than committing it
    # alongside the FAILED status.
    assert chunks_result.scalars().all() == []


async def test_upload_rejects_unsupported_content_type(client, project):
    files = {"file": ("data.zip", io.BytesIO(b"binary"), "application/zip")}
    resp = await client.post(f"/api/v1/projects/{project.id}/documents", files=files)
    assert resp.status_code == 415


async def test_upload_rejects_empty_file(client, project):
    files = {"file": ("empty.txt", io.BytesIO(b""), "text/plain")}
    resp = await client.post(f"/api/v1/projects/{project.id}/documents", files=files)
    assert resp.status_code == 400


async def test_upload_rejects_file_over_size_limit(client, project, monkeypatch):
    from app.core.config import settings

    # 1KB limit so the test doesn't need to actually send a multi-MB payload.
    monkeypatch.setattr(settings, "max_upload_size_mb", 1 / 1024)

    files = {"file": ("big.txt", io.BytesIO(b"x" * 4096), "text/plain")}
    resp = await client.post(f"/api/v1/projects/{project.id}/documents", files=files)
    assert resp.status_code == 413


async def test_upload_rejects_pdf_content_type_with_non_pdf_bytes(client, project):
    files = {"file": ("fake.pdf", io.BytesIO(b"this is not a real pdf"), "application/pdf")}
    resp = await client.post(f"/api/v1/projects/{project.id}/documents", files=files)
    assert resp.status_code == 415


async def test_list_and_delete_document(client, ready_document, project):
    list_resp = await client.get(f"/api/v1/projects/{project.id}/documents")
    assert len(list_resp.json()) == 1

    delete_resp = await client.delete(f"/api/v1/projects/{project.id}/documents/{ready_document.id}")
    assert delete_resp.status_code == 204

    list_resp_after = await client.get(f"/api/v1/projects/{project.id}/documents")
    assert list_resp_after.json() == []
