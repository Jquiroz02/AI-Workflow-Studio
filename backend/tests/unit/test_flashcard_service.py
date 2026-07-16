import json

import pytest

from app.services import flashcard_service as fs


def test_parses_well_formed_response():
    raw = json.dumps({"flashcards": [{"question": "Q1", "answer": "A1"}, {"question": "Q2", "answer": "A2"}]})
    cards = fs._parse_flashcards_response(raw, count=5)

    assert cards == [{"question": "Q1", "answer": "A1"}, {"question": "Q2", "answer": "A2"}]


def test_truncates_to_requested_count():
    raw = json.dumps({"flashcards": [{"question": f"Q{i}", "answer": f"A{i}"} for i in range(10)]})
    cards = fs._parse_flashcards_response(raw, count=3)

    assert len(cards) == 3


def test_drops_cards_missing_fields():
    raw = json.dumps(
        {"flashcards": [{"question": "Q1", "answer": "A1"}, {"question": "", "answer": "A2"}]}
    )
    cards = fs._parse_flashcards_response(raw, count=5)

    assert len(cards) == 1
    assert cards[0]["question"] == "Q1"


def test_malformed_json_raises():
    with pytest.raises(fs.FlashcardGenerationError):
        fs._parse_flashcards_response("not json", count=5)


def test_missing_key_raises():
    with pytest.raises(fs.FlashcardGenerationError):
        fs._parse_flashcards_response(json.dumps({"unexpected": []}), count=5)


def test_all_cards_dropped_raises():
    raw = json.dumps({"flashcards": [{"question": "", "answer": ""}]})
    with pytest.raises(fs.FlashcardGenerationError):
        fs._parse_flashcards_response(raw, count=5)
