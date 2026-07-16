def _mock_rag(monkeypatch, answer: str = "Mocked answer. [1]", received_modes: list | None = None):
    async def fake_embed_text(text):
        return [0.01] * 1536

    async def fake_generate_answer(question, context_chunks, answer_mode="document_only"):
        if received_modes is not None:
            received_modes.append(answer_mode)
        return answer

    monkeypatch.setattr("app.services.embedding_service.embed_text", fake_embed_text)
    monkeypatch.setattr("app.services.rag_service.generate_answer", fake_generate_answer)


async def test_send_chat_message_creates_conversation_with_citations(client, ready_document, project, monkeypatch):
    _mock_rag(monkeypatch)

    resp = await client.post(
        f"/api/v1/projects/{project.id}/chat", json={"message": "What is the mitochondria?"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["message"]["role"] == "assistant"
    assert body["message"]["content"] == "Mocked answer. [1]"
    assert len(body["message"]["citations"]) == 1
    assert body["message"]["citations"][0]["document_id"] == str(ready_document.id)

    list_resp = await client.get(f"/api/v1/projects/{project.id}/conversations")
    assert len(list_resp.json()) == 1

    get_resp = await client.get(f"/api/v1/projects/{project.id}/conversations/{body['conversation_id']}")
    assert len(get_resp.json()["messages"]) == 2


async def test_chat_defaults_to_document_only_answer_mode(client, ready_document, project, monkeypatch):
    received_modes: list = []
    _mock_rag(monkeypatch, received_modes=received_modes)

    resp = await client.post(
        f"/api/v1/projects/{project.id}/chat", json={"message": "What is the mitochondria?"}
    )
    assert resp.status_code == 200
    assert received_modes == ["document_only"]


async def test_chat_passes_through_ai_knowledge_answer_mode(client, ready_document, project, monkeypatch):
    received_modes: list = []
    _mock_rag(monkeypatch, received_modes=received_modes)

    resp = await client.post(
        f"/api/v1/projects/{project.id}/chat",
        json={"message": "What is the mitochondria?", "answer_mode": "ai_knowledge"},
    )
    assert resp.status_code == 200
    assert received_modes == ["ai_knowledge"]


async def test_chat_rejects_unknown_answer_mode(client, ready_document, project, monkeypatch):
    _mock_rag(monkeypatch)

    resp = await client.post(
        f"/api/v1/projects/{project.id}/chat",
        json={"message": "What is the mitochondria?", "answer_mode": "made_up_mode"},
    )
    assert resp.status_code == 422


async def test_chat_message_order_is_user_then_assistant(client, ready_document, project, monkeypatch):
    """Regression test: both messages commit in the same transaction, and
    Postgres's now() (the created_at server_default) is fixed for the whole
    transaction - without an explicit created_at per message, they'd tie and
    ordering by created_at alone wouldn't reliably put the question first."""
    _mock_rag(monkeypatch, answer="the answer")

    resp = await client.post(f"/api/v1/projects/{project.id}/chat", json={"message": "the question"})
    conv_id = resp.json()["conversation_id"]

    get_resp = await client.get(f"/api/v1/projects/{project.id}/conversations/{conv_id}")
    messages = get_resp.json()["messages"]
    assert [m["role"] for m in messages] == ["user", "assistant"]
    assert messages[0]["content"] == "the question"
    assert messages[1]["content"] == "the answer"


async def test_chat_reuses_existing_conversation(client, ready_document, project, monkeypatch):
    _mock_rag(monkeypatch)

    first = await client.post(f"/api/v1/projects/{project.id}/chat", json={"message": "first"})
    conv_id = first.json()["conversation_id"]

    second = await client.post(
        f"/api/v1/projects/{project.id}/chat",
        json={"conversation_id": conv_id, "message": "second"},
    )
    assert second.json()["conversation_id"] == conv_id

    get_resp = await client.get(f"/api/v1/projects/{project.id}/conversations/{conv_id}")
    assert len(get_resp.json()["messages"]) == 4


async def test_chat_with_unknown_conversation_id_returns_404(client, ready_document, project, monkeypatch):
    _mock_rag(monkeypatch)

    resp = await client.post(
        f"/api/v1/projects/{project.id}/chat",
        json={"conversation_id": "00000000-0000-0000-0000-000000000000", "message": "hi"},
    )
    assert resp.status_code == 404


async def test_delete_conversation(client, ready_document, project, monkeypatch):
    _mock_rag(monkeypatch)

    resp = await client.post(f"/api/v1/projects/{project.id}/chat", json={"message": "hi"})
    conv_id = resp.json()["conversation_id"]

    delete_resp = await client.delete(f"/api/v1/projects/{project.id}/conversations/{conv_id}")
    assert delete_resp.status_code == 204

    get_resp = await client.get(f"/api/v1/projects/{project.id}/conversations/{conv_id}")
    assert get_resp.status_code == 404


async def test_deleting_scoped_document_unscopes_conversation_instead_of_deleting_it(
    client, ready_document, project, monkeypatch
):
    """A conversation scoped to one document should survive that document's
    deletion (just losing its scope), not cascade-delete along with it."""
    _mock_rag(monkeypatch)

    resp = await client.post(
        f"/api/v1/projects/{project.id}/chat",
        json={"message": "hi", "document_id": str(ready_document.id)},
    )
    conv_id = resp.json()["conversation_id"]

    delete_resp = await client.delete(f"/api/v1/projects/{project.id}/documents/{ready_document.id}")
    assert delete_resp.status_code == 204

    get_resp = await client.get(f"/api/v1/projects/{project.id}/conversations/{conv_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["document_id"] is None
    assert len(get_resp.json()["messages"]) == 2
