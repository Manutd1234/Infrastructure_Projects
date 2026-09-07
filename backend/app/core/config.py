"""Environment-driven configuration via pydantic-settings."""

from __future__ import annotations

from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_prefix="NUSSIF_", extra="ignore"
    )

    database_url: str = f"sqlite:///{REPO_ROOT / 'database' / 'nussif.db'}"
    pipelines_dir: Path = REPO_ROOT
    enable_run_endpoint: bool = False
    run_timeout_seconds: int = 600
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    log_level: str = "INFO"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                return v
            return [part.strip() for part in v.split(",") if part.strip()]
        return v

    @field_validator("pipelines_dir", mode="before")
    @classmethod
    def resolve_pipelines_dir(cls, v):
        path = Path(v) if v else REPO_ROOT
        if not path.is_absolute():
            path = (REPO_ROOT / path).resolve()
        # Stale env from the old data/pipelines layout
        if path.name == "pipelines" or not any(
            (path / name).is_dir()
            for name in ("CryptoCycle", "HedgeFund13F", "CongressTrades")
        ):
            return REPO_ROOT
        return path


settings = Settings()
