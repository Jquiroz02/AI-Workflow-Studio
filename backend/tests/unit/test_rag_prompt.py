import uuid

from app.models.document import Document, DocumentChunk, DocumentStatus
from app.services import rag_service


def _make_context_chunk(filename: str, content: str, distance: float):
    document = Document(
        id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        original_filename=filename,
        content_type="text/plain",
        file_path="unused",
        file_size_bytes=0,
        status=DocumentStatus.READY,
    )
    chunk = DocumentChunk(
        id=uuid.uuid4(),
        document_id=document.id,
        chunk_index=0,
        content=content,
        token_count=len(content.split()),
        embedding=[0.0] * 1536,
    )
    return chunk, document, distance


def test_build_chat_messages_includes_system_and_context():
    chunks = [_make_context_chunk("notes.txt", "The sky is blue.", 0.1)]
    messages = rag_service.build_chat_messages("Why is the sky blue?", chunks)

    assert messages[0]["role"] == "system"
    assert messages[1]["role"] == "user"
    assert "[1] (from notes.txt): The sky is blue." in messages[1]["content"]
    assert "Why is the sky blue?" in messages[1]["content"]


def test_build_chat_messages_numbers_excerpts_in_order():
    chunks = [
        _make_context_chunk("a.txt", "First excerpt.", 0.1),
        _make_context_chunk("b.txt", "Second excerpt.", 0.2),
    ]
    messages = rag_service.build_chat_messages("question", chunks)
    content = messages[1]["content"]

    assert content.index("[1]") < content.index("[2]")
    assert "First excerpt." in content
    assert "Second excerpt." in content


def test_build_chat_messages_with_no_context_says_so():
    messages = rag_service.build_chat_messages("question", [])

    assert "No relevant excerpts" in messages[1]["content"]


def test_build_chat_messages_defaults_to_document_only_prompt():
    messages = rag_service.build_chat_messages("question", [])

    assert messages[0]["content"] == rag_service.DOCUMENT_ONLY_SYSTEM_PROMPT


def test_build_chat_messages_document_only_mode_never_permits_general_knowledge():
    messages = rag_service.build_chat_messages("question", [], answer_mode="document_only")

    assert "General knowledge" not in messages[0]["content"]
    assert "say so plainly instead of guessing" in messages[0]["content"]


def test_build_chat_messages_ai_knowledge_mode_permits_labeled_fallback():
    messages = rag_service.build_chat_messages("question", [], answer_mode="ai_knowledge")

    assert messages[0]["content"] == rag_service.AI_KNOWLEDGE_SYSTEM_PROMPT
    assert "General knowledge:" in messages[0]["content"]
    assert "rely on them alone" in messages[0]["content"]
