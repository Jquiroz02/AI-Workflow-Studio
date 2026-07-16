import json

import pytest

from app.services import quiz_service as qs


def _question(correct_index=1, choices=None):
    return {
        "question": "What color is the sky?",
        "choices": choices or ["Red", "Blue", "Green", "Yellow"],
        "correct_index": correct_index,
        "explanation": "Rayleigh scattering.",
    }


def test_parses_well_formed_response():
    raw = json.dumps({"questions": [_question()]})
    questions = qs._parse_quiz_response(raw, count=5)

    assert len(questions) == 1
    assert questions[0]["correct_index"] == 1
    assert questions[0]["choices"] == ["Red", "Blue", "Green", "Yellow"]


def test_truncates_to_requested_count():
    raw = json.dumps({"questions": [_question() for _ in range(10)]})
    questions = qs._parse_quiz_response(raw, count=4)

    assert len(questions) == 4


def test_drops_questions_with_wrong_choice_count():
    bad = _question(choices=["Only", "Three", "Choices"])
    raw = json.dumps({"questions": [_question(), bad]})
    questions = qs._parse_quiz_response(raw, count=5)

    assert len(questions) == 1


def test_drops_questions_with_out_of_range_correct_index():
    bad = _question(correct_index=9)
    raw = json.dumps({"questions": [_question(), bad]})
    questions = qs._parse_quiz_response(raw, count=5)

    assert len(questions) == 1


def test_missing_explanation_becomes_none():
    q = _question()
    del q["explanation"]
    raw = json.dumps({"questions": [q]})
    questions = qs._parse_quiz_response(raw, count=5)

    assert questions[0]["explanation"] is None


def test_malformed_json_raises():
    with pytest.raises(qs.QuizGenerationError):
        qs._parse_quiz_response("not json", count=5)


def test_all_questions_dropped_raises():
    bad = _question(correct_index=9)
    raw = json.dumps({"questions": [bad]})
    with pytest.raises(qs.QuizGenerationError):
        qs._parse_quiz_response(raw, count=5)
