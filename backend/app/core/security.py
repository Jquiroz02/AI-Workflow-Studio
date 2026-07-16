"""Clerk session-token verification.

Clerk issues a short-lived JWT to the frontend on every authenticated request.
We verify it statelessly against Clerk's JWKS (no call back to Clerk, no
server-side session store) and trust the `sub` claim as the Clerk user id.
"""

import logging
from functools import lru_cache

import jwt
from fastapi import HTTPException, status
from jwt import PyJWKClient

from app.core.config import settings

logger = logging.getLogger("aiws.security")


class TokenPayload:
    def __init__(self, clerk_user_id: str, email: str | None):
        self.clerk_user_id = clerk_user_id
        self.email = email


@lru_cache
def _jwks_client() -> PyJWKClient:
    return PyJWKClient(settings.clerk_jwks_url)


def verify_clerk_token(token: str) -> TokenPayload:
    if not settings.clerk_jwks_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Auth is not configured (CLERK_JWKS_URL missing).",
        )

    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.clerk_issuer or None,
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as exc:
        # Log the real (potentially library-internal) error server-side, but
        # don't hand it to the client - every other internal failure path in
        # this app (main.py's global handlers, document_service) deliberately
        # returns a fixed safe message instead of leaking exception text.
        logger.warning("Clerk token verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        ) from exc

    clerk_user_id = payload.get("sub")
    if not clerk_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing a subject claim.",
        )

    return TokenPayload(clerk_user_id=clerk_user_id, email=payload.get("email"))
