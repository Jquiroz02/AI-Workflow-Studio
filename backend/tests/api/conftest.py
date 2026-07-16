"""Fixtures for API tests that need a real Postgres+pgvector database.

Tests here run against DATABASE_URL (defaults to a `_test` database, see
tests/conftest.py). If that database isn't reachable, tests are skipped
with a clear message rather than failing — see the "Running tests"
section of the README for how to bring up the test database locally.
"""

import shutil
from pathlib import Path

import pytest
import pytest_asyncio
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.db import Base, get_db
from app.main import app
from app.models.document import Document, DocumentChunk, DocumentStatus
from app.models.project import Project
from app.models.user import User

_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent


def _alembic_config() -> Config:
    cfg = Config(str(_BACKEND_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(_BACKEND_ROOT / "alembic"))
    cfg.set_main_option("sqlalchemy.url", settings.sync_database_url)
    return cfg


@pytest.fixture(scope="session")
def _schema_ready():
    """Build the schema once per test session by running the *real* Alembic
    migration, not Base.metadata.create_all().

    This matters: create_all() derives DDL straight from the current model
    definitions, so it's self-consistent even if a model and its migration
    have drifted apart - which is exactly what happened here once (a
    Postgres ENUM column whose migration used lowercase values while the
    ORM's default enum encoding bound uppercase member names; create_all()
    silently "fixed" the mismatch instead of catching it). Running the
    actual migration is what production does, so it's the only way this
    suite would have caught that bug.
    """
    cfg = _alembic_config()
    sync_engine = create_engine(settings.sync_database_url)
    try:
        with sync_engine.connect():
            pass
    except Exception as exc:  # noqa: BLE001
        sync_engine.dispose()
        pytest.skip(
            f"Test database not reachable at {settings.sync_database_url} ({exc}). "
            "Run `docker compose up -d db`, then "
            "`createdb -h localhost -U aiws ai_workflow_studio_test` to enable API tests."
        )
    sync_engine.dispose()

    command.upgrade(cfg, "head")
    yield
    command.downgrade(cfg, "base")


@pytest_asyncio.fixture
async def db_engine(_schema_ready):
    """A fresh async engine per test, scoped to that test's own event loop."""
    engine = create_async_engine(settings.async_database_url)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def _clean_tables(db_engine):
    yield
    async with db_engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())


@pytest.fixture(autouse=True, scope="session")
def _clean_upload_dir():
    yield
    shutil.rmtree(Path(settings.upload_dir), ignore_errors=True)


@pytest_asyncio.fixture
async def db_session(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def test_user(db_session) -> User:
    user = User(clerk_user_id="test_clerk_user", email="test@example.com")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def client(db_engine, db_session, test_user, monkeypatch):
    async def _override_get_db():
        yield db_session

    async def _override_get_current_user():
        return test_user

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _override_get_current_user

    # Background tasks (document processing) open their own session via
    # app.core.db.AsyncSessionLocal rather than the get_db dependency, since
    # they run outside the request/response cycle. In production there's one
    # long-lived event loop so the module-level engine is fine; in tests each
    # test function gets its own loop, so point this at the current test's
    # engine to avoid reusing asyncpg connections across loops.
    test_session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    monkeypatch.setattr("app.services.document_service.AsyncSessionLocal", test_session_factory)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def unauthenticated_client(db_session):
    """A client with the DB wired up but no auth override — for testing that
    protected routes actually reject unauthenticated requests."""

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def project(db_session, test_user) -> Project:
    project = Project(user_id=test_user.id, name="Test Project", description="A project for tests")
    db_session.add(project)
    await db_session.commit()
    await db_session.refresh(project)
    return project


@pytest_asyncio.fixture
async def ready_document(db_session, project) -> Document:
    """A document with one pre-embedded chunk, skipping upload + background processing."""
    document = Document(
        project_id=project.id,
        original_filename="sample.txt",
        content_type="text/plain",
        file_path="unused/for/this/fixture.txt",
        file_size_bytes=42,
        status=DocumentStatus.READY,
    )
    db_session.add(document)
    await db_session.flush()

    db_session.add(
        DocumentChunk(
            document_id=document.id,
            chunk_index=0,
            content="The mitochondria is the powerhouse of the cell.",
            token_count=10,
            embedding=[0.01] * settings.embedding_dimensions,
        )
    )
    await db_session.commit()
    await db_session.refresh(document)
    return document
