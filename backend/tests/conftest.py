"""Session-wide test setup.

Sets required env vars *before* anything under app/ is imported, since
app.core.config.Settings is instantiated at import time. Individual env
vars can still be overridden by a real .env or the shell environment.
"""

import os

# Disables the rate limiter (app/core/rate_limit.py) - the whole suite shares
# one in-memory counter since it reuses one FastAPI app instance, so limits
# meant for real clients would otherwise trip partway through a test run.
os.environ.setdefault("ENVIRONMENT", "test")

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://aiws:aiws_local_password@localhost:5432/ai_workflow_studio_test",
)
os.environ.setdefault("CLERK_JWKS_URL", "https://example-test.clerk.accounts.dev/.well-known/jwks.json")
os.environ.setdefault("CLERK_ISSUER", "https://example-test.clerk.accounts.dev")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-placeholder")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")
os.environ.setdefault("UPLOAD_DIR", "./tests/.tmp_uploads")
