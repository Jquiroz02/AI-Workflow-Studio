from app.core.config import settings
from app.core.openai_client import get_openai_client, with_openai_retry

SYSTEM_PROMPT = (
    "You write clear, concise study summaries of documents. Produce 3-6 short "
    "paragraphs (or a tight bulleted list if that fits the content better) "
    "covering the document's key points. Do not invent information that isn't "
    "in the text."
)


@with_openai_retry
async def generate_summary(document_text: str) -> str:
    client = get_openai_client()
    response = await client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Summarize this document:\n\n{document_text}"},
        ],
        temperature=0.3,
    )
    return response.choices[0].message.content or ""
