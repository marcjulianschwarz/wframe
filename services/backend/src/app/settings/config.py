import os
from functools import cached_property
from typing import ClassVar, Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["LOCAL", "DEV", "PROD"]

_env = os.getenv("ENVIRONMENT")
_env_files = (".env", f".env.{_env}") if _env else ".env"


class Settings(BaseSettings):
    """Application settings, loaded from environment variables and a .env file.

    Environment variables take precedence over values in .env. See .env.example
    for the supported keys.
    """

    model_config: ClassVar[SettingsConfigDict] = SettingsConfigDict(
        env_file=_env_files,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "wframe"
    IMAGE_TAG: str = ""

    # Runtime
    ENVIRONMENT: Environment = "LOCAL"
    DEBUG: bool = False

    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"

    # DB
    DB_USER: str = "wframe"
    DB_PASSWORD: str = "wframe"
    DB_NAME: str = "wframe"
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_POOL_SIZE: int = 5

    OPENAI_API_KEY: str = ""
    # Optional. Lifts the GitHub API rate limit from 60 to 5,000 req/hr for the
    # github dashboard. Only public data is read, so any token (or none) works.
    GITHUB_TOKEN: str = ""

    # Auth. JWT_SECRET MUST be overridden in production via env.
    JWT_SECRET: str = "dev-insecure-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 14  # 14 days

    @cached_property
    def database_url(self) -> str:
        """SQLAlchemy / Alembic async connection URL (asyncpg)."""
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"


settings = Settings()
