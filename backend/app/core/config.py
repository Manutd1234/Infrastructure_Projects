"""Environment-driven configuration via pydantic-settings."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_prefix="NUSSIF_", extra="ignore"
    )

    # Database
    database_url: str = f"sqlite:///{Path(__file__).resolve().parents[2] / 'database' / 'nussif.db'}"

    # Pipelines
    pipelines_dir: Path = Path(__file__).resolve().parents[2] / "data" / "pipelines"

    # Ops
    enable_run_endpoint: bool = False
    run_timeout_seconds: int = 600

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Logging
    log_level: str = "INFO"


settings = Settings()
