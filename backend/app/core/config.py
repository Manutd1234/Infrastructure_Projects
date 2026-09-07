"""Environment-driven configuration via pydantic-settings."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_prefix="NUSSIF_", extra="ignore"
    )

    # Database
    database_url: str = f"sqlite:///{(REPO_ROOT / 'database' / 'nussif.db')}"

    # Pipelines — the three analysis modules live at the repo root as
    # PascalCase folders (CryptoBullCycle, ThirteenFFilings, CongressTrading).
    # pipelines_dir is the repo root; the ops runner joins it with the
    # module name.
    pipelines_dir: Path = REPO_ROOT

    # Ops
    enable_run_endpoint: bool = False
    run_timeout_seconds: int = 600

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Logging
    log_level: str = "INFO"


settings = Settings()
