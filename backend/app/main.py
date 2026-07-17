import logging

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.routes import chat, documents, flashcards, projects, quizzes, search, summaries, users
from app.core.config import settings
from app.core.openai_client import OpenAINotConfiguredError
from app.core.rate_limit import limiter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aiws")

app = FastAPI(
    title="AI Workflow Studio API",
    description="RAG-powered document chat, summaries, flashcards, and quizzes.",
    version="0.1.0",
    # Interactive docs are handy for reviewers but also hand an attacker a
    # map of the API surface - keep them off in production. The raw
    # openapi.json schema stays reachable either way (no "try it out"
    # execution surface, just a schema).
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "X-Requested-With",
    ],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    # Mirrors FastAPI's default HTTPException handler, but explicit so it's
    # obvious this is the one place response shape for API errors is decided.
    # Must forward exc.headers (e.g. a 401's WWW-Authenticate) like the
    # default handler does - dropping them here would be a silent regression
    # for any future HTTPException raised with headers set.
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=exc.headers)


@app.exception_handler(OpenAINotConfiguredError)
async def openai_not_configured_handler(
    request: Request, exc: OpenAINotConfiguredError
) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error."},
    )


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


app.include_router(users.router, prefix=settings.api_v1_prefix)
app.include_router(projects.router, prefix=settings.api_v1_prefix)
app.include_router(documents.router, prefix=settings.api_v1_prefix)
app.include_router(chat.router, prefix=settings.api_v1_prefix)
app.include_router(summaries.router, prefix=settings.api_v1_prefix)
app.include_router(flashcards.router, prefix=settings.api_v1_prefix)
app.include_router(quizzes.router, prefix=settings.api_v1_prefix)
app.include_router(search.router, prefix=settings.api_v1_prefix)
