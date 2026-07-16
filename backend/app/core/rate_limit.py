"""Per-client rate limiting for endpoints that trigger billed OpenAI calls.

Keyed by client IP (slowapi's default), not authenticated user - simpler to
set up and still meaningfully caps abuse from a single client. Storage is
in-memory, which is fine for the single-instance deployment this project
targets (see README); a multi-instance deployment would need a shared
backend (e.g. Redis) so limits are enforced across processes.

Disabled in the test environment so the suite's rapid-fire requests (which
all share one in-memory counter, since tests reuse one FastAPI app instance)
don't trip limits meant for real clients.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

limiter = Limiter(key_func=get_remote_address, enabled=settings.environment != "test")
