from functools import lru_cache

import openai
from openai import AsyncOpenAI
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import settings


class OpenAINotConfiguredError(RuntimeError):
    """Raised instead of ever attempting a real call with a placeholder key.

    Every OpenAI-touching service function goes through get_openai_client(),
    so raising here (rather than letting a placeholder key hit OpenAI's API
    and fail with a confusing auth error) is the single place that needs to
    know about this - see main.py's exception handler for how it's turned
    into a clean, actionable response.
    """


@lru_cache
def get_openai_client() -> AsyncOpenAI:
    if not settings.is_openai_configured:
        raise OpenAINotConfiguredError(
            "OPENAI_API_KEY is not configured. Set a real key in the backend "
            "environment to enable AI features (chat, summaries, flashcards, "
            "quizzes, search)."
        )
    return AsyncOpenAI(api_key=settings.openai_api_key)


# Shared retry policy for every OpenAI call in the app: retries only on
# transient failures (connection issues, timeouts, rate limits, and 5xx from
# OpenAI's side) with exponential backoff, not on errors that will never
# succeed on retry (bad request, auth, content policy).
with_openai_retry = retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type(
        (
            openai.APIConnectionError,
            openai.APITimeoutError,
            openai.RateLimitError,
            openai.InternalServerError,
        )
    ),
)
