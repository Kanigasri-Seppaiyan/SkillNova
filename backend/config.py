import os
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List

_BACKEND_DIR = Path(__file__).resolve().parent
_ENV_PATH = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://skillnova:skillnova_secret@localhost:5432/skillnova"

    # JWT
    secret_key: str = "change-me-in-production"
    jwt_secret: str = ""
    algorithm: str = "HS256"
    access_token_expire_days: int = 7

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    allowed_email_domain: str = "bitsathy.ac.in"

    # Admin Access — stored in env var only, never hardcoded
    skillnova_admin_email: str = ""

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-lite-latest"

    # App
    environment: str = "development"
    upload_dir: str = "./uploads"
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://127.0.0.1:5500,http://localhost:5500"

    @property
    def effective_jwt_secret(self) -> str:
        return self.jwt_secret or self.secret_key

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def ai_enabled(self) -> bool:
        """Returns True when either Gemini or OpenAI is configured."""
        return bool(self.gemini_api_key or self.openai_api_key)

    @property
    def admin_email_normalized(self) -> str:
        """Returns the configured admin email, lowercased and stripped."""
        return self.skillnova_admin_email.strip().lower()

    class Config:
        env_file = (str(_ENV_PATH), ".env")
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
