from collections.abc import AsyncGenerator
import ssl

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

ssl_context = ssl.create_default_context() if settings.is_production else None

engine = create_async_engine(
    settings.async_database_url,
    echo=False,
    pool_pre_ping=True,
    connect_args={"ssl": ssl_context} if ssl_context else {},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session