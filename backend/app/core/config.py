import os
import json
from typing import Union
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SkillTrace Intelligence Platform"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Primary PostgreSQL Database URL with pgvector support
    # In Docker: postgresql://postgres:postgres@db:5432/skilltrace
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/skilltrace"
    )
    SQLITE_FALLBACK_URL: str = "sqlite:///./skilltrace.db"
    
    # Redis Cache & Message Queue
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Vector Search Configuration
    VECTOR_DIMENSION: int = 1536
    
    # CORS Origins (accepts JSON array string, comma-separated string, wildcard, or list)
    CORS_ORIGINS: Union[list[str], str] = os.getenv(
        "CORS_ORIGINS",
        "https://skilltracer.onrender.com,https://skilltrace.onrender.com,http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
    )

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def assemble_database_url(cls, v: str) -> str:
        if not v:
            return v
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql://", 1)
        
        # Graceful driver fallback between psycopg (v3) and psycopg2
        if v.startswith("postgresql+psycopg://"):
            try:
                import psycopg  # noqa: F401
            except ImportError:
                try:
                    import psycopg2  # noqa: F401
                    v = v.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)
                except ImportError:
                    pass
        elif v.startswith("postgresql://") or v.startswith("postgresql+psycopg2://"):
            try:
                import psycopg2  # noqa: F401
            except ImportError:
                try:
                    import psycopg  # noqa: F401
                    if v.startswith("postgresql+psycopg2://"):
                        v = v.replace("postgresql+psycopg2://", "postgresql+psycopg://", 1)
                    elif v.startswith("postgresql://"):
                        v = v.replace("postgresql://", "postgresql+psycopg://", 1)
                except ImportError:
                    pass
        return v


    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, list[str]]) -> list[str]:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed]
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, tuple, set)):
            return [str(i).strip() for i in v]
        return v

    class Config:
        case_sensitive = True
        extra = "ignore"
        env_file = ".env"

settings = Settings()

