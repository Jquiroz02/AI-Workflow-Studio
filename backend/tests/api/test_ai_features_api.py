from app.models.document import Document, DocumentStatus


async def test_summary_without_openai_configured_returns_503(client, ready_document, project):
    """Regression test for the real (unmocked) code path: the test suite's
    OPENAI_API_KEY is a placeholder, so this should hit get_openai_client()'s
    guard and come back as a clean 503, not attempt a real OpenAI call or
    crash as a generic 500."""
    resp = await client.post(f"/api/v1/projects/{project.id}/documents/{ready_document.id}/summary")
    assert resp.status_code == 503
    assert "OPENAI_API_KEY" in resp.json()["detail"]


async def test_generate_summary(client, ready_document, project, monkeypatch):
    async def fake_generate_summary(text):
        return "A short summary."

    monkeypatch.setattr("app.services.summary_service.generate_summary", fake_generate_summary)

    resp = await client.post(f"/api/v1/projects/{project.id}/documents/{ready_document.id}/summary")
    assert resp.status_code == 200
    assert resp.json()["summary"] == "A short summary."


async def test_summary_requires_ready_document(client, project, db_session):
    pending_doc = Document(
        project_id=project.id,
        original_filename="x.txt",
        content_type="text/plain",
        file_path="unused",
        file_size_bytes=1,
        status=DocumentStatus.PENDING,
    )
    db_session.add(pending_doc)
    await db_session.commit()
    await db_session.refresh(pending_doc)

    resp = await client.post(f"/api/v1/projects/{project.id}/documents/{pending_doc.id}/summary")
    assert resp.status_code == 409


async def test_generate_list_and_delete_flashcards(client, ready_document, project, monkeypatch):
    async def fake_generate_flashcards(text, count):
        return [{"question": f"Q{i}", "answer": f"A{i}"} for i in range(count)]

    monkeypatch.setattr("app.services.flashcard_service.generate_flashcards", fake_generate_flashcards)

    resp = await client.post(
        f"/api/v1/projects/{project.id}/documents/{ready_document.id}/flashcards",
        json={"card_count": 4},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert len(body["cards"]) == 4

    list_resp = await client.get(
        f"/api/v1/projects/{project.id}/documents/{ready_document.id}/flashcards"
    )
    assert len(list_resp.json()) == 1

    delete_resp = await client.delete(
        f"/api/v1/projects/{project.id}/documents/{ready_document.id}/flashcards/{body['id']}"
    )
    assert delete_resp.status_code == 204


async def test_generate_flashcards_maps_generation_error_to_502(client, ready_document, project, monkeypatch):
    """A malformed model response is an expected, named failure mode
    (FlashcardGenerationError) - it should surface as a 502, not fall
    through to the generic unhandled-exception 500 handler."""

    async def fake_generate_flashcards(text, count):
        from app.services.flashcard_service import FlashcardGenerationError

        raise FlashcardGenerationError("Model returned an unexpected response shape.")

    monkeypatch.setattr("app.services.flashcard_service.generate_flashcards", fake_generate_flashcards)

    resp = await client.post(
        f"/api/v1/projects/{project.id}/documents/{ready_document.id}/flashcards",
        json={"card_count": 4},
    )
    assert resp.status_code == 502


async def test_generate_and_list_quiz(client, ready_document, project, monkeypatch):
    async def fake_generate_quiz(text, count):
        return [
            {
                "question": f"Q{i}",
                "choices": ["A", "B", "C", "D"],
                "correct_index": 0,
                "explanation": None,
            }
            for i in range(count)
        ]

    monkeypatch.setattr("app.services.quiz_service.generate_quiz", fake_generate_quiz)

    resp = await client.post(
        f"/api/v1/projects/{project.id}/documents/{ready_document.id}/quizzes",
        json={"question_count": 3},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert len(body["questions"]) == 3

    list_resp = await client.get(f"/api/v1/projects/{project.id}/documents/{ready_document.id}/quizzes")
    assert len(list_resp.json()) == 1


async def test_generate_quiz_maps_generation_error_to_502(client, ready_document, project, monkeypatch):
    async def fake_generate_quiz(text, count):
        from app.services.quiz_service import QuizGenerationError

        raise QuizGenerationError("Model returned an unexpected response shape.")

    monkeypatch.setattr("app.services.quiz_service.generate_quiz", fake_generate_quiz)

    resp = await client.post(
        f"/api/v1/projects/{project.id}/documents/{ready_document.id}/quizzes",
        json={"question_count": 3},
    )
    assert resp.status_code == 502


async def test_search_documents(client, ready_document, project, monkeypatch):
    async def fake_embed_text(text):
        return [0.01] * 1536

    monkeypatch.setattr("app.services.embedding_service.embed_text", fake_embed_text)

    resp = await client.get(f"/api/v1/projects/{project.id}/search", params={"q": "mitochondria"})
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) == 1
    assert results[0]["document_id"] == str(ready_document.id)
    assert 0.0 <= results[0]["similarity"] <= 1.0


async def test_search_excludes_chunks_from_non_ready_documents(
    client, ready_document, project, db_session, monkeypatch
):
    """Defense in depth: retrieval must filter on Document.status == READY at
    the query level, not just rely on ingestion never leaving stray chunks
    on a non-ready document."""
    from app.models.document import Document, DocumentChunk, DocumentStatus

    failed_document = Document(
        project_id=project.id,
        original_filename="failed.txt",
        content_type="text/plain",
        file_path="unused",
        file_size_bytes=1,
        status=DocumentStatus.FAILED,
    )
    db_session.add(failed_document)
    await db_session.flush()
    db_session.add(
        DocumentChunk(
            document_id=failed_document.id,
            chunk_index=0,
            content="This stray chunk should never be retrievable.",
            token_count=5,
            embedding=[0.01] * 1536,
        )
    )
    await db_session.commit()

    async def fake_embed_text(text):
        return [0.01] * 1536

    monkeypatch.setattr("app.services.embedding_service.embed_text", fake_embed_text)

    resp = await client.get(
        f"/api/v1/projects/{project.id}/search", params={"q": "mitochondria", "limit": 10}
    )
    results = resp.json()

    assert all(r["document_id"] != str(failed_document.id) for r in results)
    assert results[0]["document_id"] == str(ready_document.id)
