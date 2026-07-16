import json

from app.core.config import settings
from app.core.openai_client import get_openai_client, with_openai_retry

SYSTEM_PROMPT = (
    "You create study flashcards from a document. Respond ONLY with a JSON object "
    'of the shape {"flashcards": [{"question": str, "answer": str}, ...]}. '
    "Questions should be specific and testable; answers should be short and precise. "
    "Base every card strictly on the provided text."
)


class FlashcardGenerationError(RuntimeError):
    pass


def _parse_flashcards_response(raw: str, count: int) -> list[dict[str, str]]:
    try:
        parsed = json.loads(raw)
        cards = parsed["flashcards"]
        cleaned = [
            {"question": str(card["question"]).strip(), "answer": str(card["answer"]).strip()}
            for card in cards
            if card.get("question") and card.get("answer")
        ]
    except (json.JSONDecodeError, KeyError, TypeError, AttributeError) as exc:
        raise FlashcardGenerationError("Model returned an unexpected response shape.") from exc

    if not cleaned:
        raise FlashcardGenerationError("Model did not return any usable flashcards.")

    return cleaned[:count]


@with_openai_retry
async def generate_flashcards(document_text: str, count: int) -> list[dict[str, str]]:
    client = get_openai_client()
    response = await client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Create exactly {count} flashcards from this document:\n\n{document_text}",
            },
        ],
        temperature=0.4,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content or "{}"
    return _parse_flashcards_response(raw, count)
