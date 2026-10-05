import os
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
    
    # CORS Origins
    CORS_ORIGINS = https://skilltrace.onrender.com

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
