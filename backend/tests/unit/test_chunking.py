from app.services import chunking_service as cs


def test_chunks_stay_within_token_budget():
    text = "\n\n".join(f"Paragraph {i}. " + ("word " * 50) for i in range(20))
    chunks = cs.chunk_text(text, chunk_tokens=100, overlap_tokens=20)

    assert len(chunks) > 1
    for chunk in chunks:
        assert cs.count_tokens(chunk) <= 100


def test_oversized_single_paragraph_is_hard_split():
    big_paragraph = "sentence word " * 2000
    chunks = cs.chunk_text(big_paragraph, chunk_tokens=100, overlap_tokens=20)

    assert len(chunks) > 1
    for chunk in chunks:
        assert cs.count_tokens(chunk) <= 100


def test_empty_input_produces_no_chunks():
    assert cs.chunk_text("   \n\n   ") == []


def test_paragraph_order_is_preserved():
    text = "Paragraph ONE marker.\n\nParagraph TWO marker.\n\nParagraph THREE marker."
    chunks = cs.chunk_text(text, chunk_tokens=5, overlap_tokens=1)

    joined = " ".join(chunks)
    assert joined.index("ONE") < joined.index("TWO") < joined.index("THREE")


def test_small_document_produces_single_chunk():
    text = "Just one short paragraph."
    chunks = cs.chunk_text(text, chunk_tokens=800, overlap_tokens=100)

    assert chunks == ["Just one short paragraph."]
