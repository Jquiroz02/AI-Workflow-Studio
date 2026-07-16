import json

from app.core.config import settings
from app.core.openai_client import get_openai_client, with_openai_retry

SYSTEM_PROMPT = (
    "You create multiple-choice quiz questions from a document. Respond ONLY with "
    'a JSON object of the shape {"questions": [{"question": str, "choices": '
    '[str, str, str, str], "correct_index": int, "explanation": str}, ...]}. '
    "Each question must have exactly 4 choices, correct_index must be 0-3, and "
    "explanation should briefly justify the correct answer using the text. Base "
    "every question strictly on the provided text."
)


class QuizGenerationError(RuntimeError):
    pass


def _parse_quiz_response(raw: str, count: int) -> list[dict]:
    try:
        parsed = json.loads(raw)
        questions = parsed["questions"]
        cleaned = []
        for q in questions:
            choices = [str(c).strip() for c in q["choices"]]
            correct_index = int(q["correct_index"])
            if len(choices) != 4 or not (0 <= correct_index <= 3):
                continue
            cleaned.append(
                {
                    "question": str(q["question"]).strip(),
                    "choices": choices,
                    "correct_index": correct_index,
                    "explanation": str(q.get("explanation") or "").strip() or None,
                }
            )
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        raise QuizGenerationError("Model returned an unexpected response shape.") from exc

    if not cleaned:
        raise QuizGenerationError("Model did not return any usable quiz questions.")

    return cleaned[:count]


@with_openai_retry
async def generate_quiz(document_text: str, count: int) -> list[dict]:
    client = get_openai_client()
    response = await client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Create exactly {count} quiz questions from this document:\n\n{document_text}",
            },
        ],
        temperature=0.4,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content or "{}"
    return _parse_quiz_response(raw, count)
