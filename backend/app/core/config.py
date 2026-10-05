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
    # In Docker: postgresql://vigneshb:CB9uRRDvglD986DGdJWK7RpUAXFmrGj0@db:5432/skilltrace
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://vigneshb:CB9uRRDvglD986DGdJWK7RpUAXFmrGj0@localhost:5432/skilltrace"
    )
    SQLITE_FALLBACK_URL: str = "sqlite:///./skilltrace.db"
    
    # Redis Cache & Message Queue
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Vector Search Configuration (default 384 for all-MiniLM-L6-v2 & deterministic fallback)
    VECTOR_DIMENSION: int = int(os.getenv("VECTOR_DIMENSION", "384"))
    
    # CORS Origins (accepts JSON array string, comma-separated string, wildcard, or list)
    CORS_ORIGINS: Union[list[str], str] = os.getenv(
        "CORS_ORIGINS",
        "https://skilltracer-app.onrender.com,https://skilltracer.onrender.com,https://skilltrace.onrender.com,http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
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
        raw_items: list[str] = []
        if isinstance(v, str):
            v = v.strip()
            if not v:
                raw_items = []
            elif v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        raw_items = [str(item) for item in parsed]
                except Exception:
                    pass
            if not raw_items and v:
                raw_items = [i for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, tuple, set)):
            raw_items = [str(i) for i in v]

        cleaned: list[str] = []
        for item in raw_items:
            norm = item.strip().rstrip("/")
            if norm and norm not in cleaned:
                cleaned.append(norm)

        # Guarantee canonical app domains are always permitted
        canonical_origins = [
            "https://skilltracer-app.onrender.com",
            "https://skilltracer.onrender.com",
            "https://skilltrace.onrender.com",
        ]
        if "*" not in cleaned:
            for origin in canonical_origins:
                if origin not in cleaned:
                    cleaned.append(origin)

        return cleaned

    class Config:
        case_sensitive = True
        extra = "ignore"
        env_file = ".env"

settings = Settings()

