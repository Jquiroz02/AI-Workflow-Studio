import logging

from fastapi import APIRouter, status
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession, OwnedProject
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectRead, ProjectSummary, ProjectUpdate
from app.services import storage_service

logger = logging.getLogger("aiws.projects")

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectSummary], summary="List the current user's projects")
async def list_projects(db: DbSession, current_user: CurrentUser) -> list[ProjectSummary]:
    doc_counts = (
        select(Document.project_id, func.count(Document.id).label("count"))
        .group_by(Document.project_id)
        .subquery()
    )
    convo_counts = (
        select(Conversation.project_id, func.count(Conversation.id).label("count"))
        .group_by(Conversation.project_id)
        .subquery()
    )

    stmt = (
        select(Project, doc_counts.c.count, convo_counts.c.count)
        .outerjoin(doc_counts, doc_counts.c.project_id == Project.id)
        .outerjoin(convo_counts, convo_counts.c.project_id == Project.id)
        .where(Project.user_id == current_user.id)
        .order_by(Project.updated_at.desc())
    )
    rows = (await db.execute(stmt)).all()

    return [
        ProjectSummary(
            **ProjectRead.model_validate(project).model_dump(),
            document_count=doc_count or 0,
            conversation_count=convo_count or 0,
        )
        for project, doc_count, convo_count in rows
    ]


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED, summary="Create a project")
async def create_project(payload: ProjectCreate, db: DbSession, current_user: CurrentUser) -> Project:
    project = Project(user_id=current_user.id, name=payload.name, description=payload.description)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectRead, summary="Get a project")
async def get_project(project: OwnedProject) -> Project:
    return project


@router.patch("/{project_id}", response_model=ProjectRead, summary="Rename or re-describe a project")
async def update_project(
    payload: ProjectUpdate, project: OwnedProject, db: DbSession
) -> Project:
    # exclude_unset (not `is not None`) so `{"description": null}` can
    # explicitly clear the field instead of being indistinguishable from
    # "field omitted".
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await db.commit()
    await db.refresh(project)
    return project


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a project and everything in it",
)
async def delete_project(project: OwnedProject, db: DbSession) -> None:
    project_id = project.id
    await db.delete(project)
    await db.commit()
    # The DB delete (and its cascades) already succeeded and committed here;
    # a disk error cleaning up files shouldn't surface as a client-facing
    # 500 for what is actually a completed deletion.
    try:
        storage_service.delete_project_files(project_id)
    except OSError:
        logger.exception("Failed to delete files for deleted project %s", project_id)
