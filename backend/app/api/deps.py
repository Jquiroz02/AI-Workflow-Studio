import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import verify_clerk_token
from app.models.document import Document, DocumentStatus
from app.models.project import Project
from app.models.user import User

# auto_error=False so a missing/malformed Authorization header falls through
# to our own 401 below, instead of HTTPBearer's default 403 - both mean "not
# authenticated" and should return the same status code as an invalid token.
_bearer_scheme = HTTPBearer(auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
    db: DbSession,
) -> User:
    """Verify the Clerk session token and just-in-time provision a local User row."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    token_payload = verify_clerk_token(credentials.credentials)

    result = await db.execute(select(User).where(User.clerk_user_id == token_payload.clerk_user_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(clerk_user_id=token_payload.clerk_user_id, email=token_payload.email)
        db.add(user)
        try:
            await db.commit()
        except IntegrityError:
            # Lost a race with a concurrent request JIT-provisioning the same
            # user (e.g. two tabs signing in at the same instant) - the other
            # request's row won, so just read it back.
            await db.rollback()
            result = await db.execute(
                select(User).where(User.clerk_user_id == token_payload.clerk_user_id)
            )
            user = result.scalar_one()
        else:
            await db.refresh(user)
    elif token_payload.email and user.email != token_payload.email:
        user.email = token_payload.email
        await db.commit()
        await db.refresh(user)

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_owned_project(
    project_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


OwnedProject = Annotated[Project, Depends(get_owned_project)]


async def get_owned_document(
    document_id: uuid.UUID,
    project: OwnedProject,
    db: DbSession,
) -> Document:
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.project_id == project.id)
    )
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


OwnedDocument = Annotated[Document, Depends(get_owned_document)]


async def get_ready_document(document: OwnedDocument) -> Document:
    """An owned document that has finished ingestion and has retrievable chunks."""
    if document.status != DocumentStatus.READY:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document is still processing; try again once it's ready.",
        )
    return document


ReadyDocument = Annotated[Document, Depends(get_ready_document)]
