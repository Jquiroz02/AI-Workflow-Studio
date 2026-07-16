from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration, loaded from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173"

    # Accepts either a plain `postgresql://` URL (what Render's managed
    # Postgres and most hosts give you) or an explicit `postgresql+asyncpg://`
    # one. The async/sync engines each derive the driver they need below,
    # so only one URL has to be configured.
    database_url: str

    # Only JWKS-based verification is used (see app/core/security.py) - no
    # Clerk secret/publishable key is needed on the backend for that, so
    # neither is collected here.
    clerk_jwks_url: str = ""
    clerk_issuer: str = ""

    openai_api_key: str = "sk-placeholder"
    openai_chat_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536

    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 20

    @property
    def async_database_url(self) -> str:
        url = self.database_url

        if url.startswith("postgresql://"):
            url = url.replace(
                "postgresql://",
                "postgresql+asyncpg://",
                1,
            )

        parts = urlsplit(url)

        query_items = [
            (key, value)
            for key, value in parse_qsl(parts.query, keep_blank_values=True)
            if key not in {"sslmode", "channel_binding"}
        ]

        return urlunsplit(
            (
                parts.scheme,
                parts.netloc,
                parts.path,
                urlencode(query_items),
                parts.fragment,
            )
        )

    @property
    def sync_database_url(self) -> str:
        """Connection string for Alembic and psycopg2."""

        if self.database_url.startswith("postgresql+asyncpg://"):
            return self.database_url.replace(
                "postgresql+asyncpg://",
                "postgresql://",
                1,
            )

        return self.database_url

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def is_openai_configured(self) -> bool:
        # Both the real default ("sk-placeholder") and the test-suite's
        # sentinel ("sk-test-placeholder") contain "placeholder" - real
        return bool(self.openai_api_key) and "placeholder" not in self.openai_api_key.lower()


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
