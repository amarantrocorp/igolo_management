from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "IntDesignERP"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # Database
    DB_USER: str = "erp_admin"
    DB_PASSWORD: str = "changeme_strong_password"
    DB_HOST: str = "db"
    DB_PORT: int = 5432
    DB_NAME: str = "int_design_erp"

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def DATABASE_URL_SYNC(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    # JWT
    SECRET_KEY: str = "changeme_generate_a_real_secret_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_NAME: str = "IntDesignERP"

    # S3
    S3_BUCKET_NAME: str = "int-design-erp"
    S3_REGION: str = "ap-south-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""

    # Sentry
    SENTRY_DSN: str = ""

    # Standard Project Sprints Configuration
    DEFAULT_SPRINTS: list = [
        {"name": "Sprint 1: Design & Approvals", "days": 10},
        {"name": "Sprint 2: Civil & Demolition", "days": 15},
        {"name": "Sprint 3: MEP (Mech, Elec, Plumb)", "days": 10},
        {"name": "Sprint 4: Woodwork & Carpentry", "days": 25},
        {"name": "Sprint 5: Finishing & Painting", "days": 12},
        {"name": "Sprint 6: Handover & Snag List", "days": 5},
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
