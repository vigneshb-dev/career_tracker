import logging
from sqlalchemy import create_engine, text, Column, JSON, String
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger("skilltrace.database")

# Prepare pgvector support for semantic search
try:
    from pgvector.sqlalchemy import Vector as PgVector
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False
    PgVector = None

from typing import Optional, List, Any
import json

def get_vector_type(dim: Optional[int] = None):
    """
    Returns pgvector Vector type when available on PostgreSQL,
    otherwise falls back to JSON representation for seamless development.
    Defaults to settings.VECTOR_DIMENSION (384).
    """
    effective_dim = dim if dim is not None else settings.VECTOR_DIMENSION
    if HAS_PGVECTOR:
        return PgVector(effective_dim)
    return JSON


def validate_and_serialize_vector(
    vec: Any,
    expected_dim: Optional[int] = None,
    allow_none: bool = True
) -> Optional[List[float]]:
    """
    Validates vector length and ensures correct serialization format (List[float]).
    Converts numpy arrays, lists, tuples, or parsed JSON strings.
    Raises ValueError with a clear actionable message if vector dimension does not match expected_dim.
    """
    if vec is None:
        if allow_none:
            return None
        raise ValueError("Vector cannot be None.")

    target_dim = expected_dim if expected_dim is not None else settings.VECTOR_DIMENSION

    # If it's a string, attempt to parse JSON
    if isinstance(vec, str):
        vec_str = vec.strip()
        if vec_str.startswith("[") and vec_str.endswith("]"):
            try:
                vec = json.loads(vec_str)
            except Exception as e:
                raise ValueError(f"Invalid vector string format: could not parse as JSON array ({e})")
        else:
            raise ValueError(f"Invalid vector string format: expected JSON array string, got {vec_str[:50]}")

    # Handle iterables (numpy array, list, tuple)
    if hasattr(vec, "__iter__") and not isinstance(vec, (str, bytes, dict)):
        try:
            vec_list = [float(x) for x in vec]
        except (ValueError, TypeError) as e:
            raise ValueError(f"Invalid vector elements: all elements must be convertible to float ({e})")
    else:
        raise ValueError(f"Invalid vector type: expected iterable of numbers, got {type(vec).__name__}")

    actual_dim = len(vec_list)
    if actual_dim != target_dim:
        raise ValueError(
            f"Embedding dimension mismatch: expected {target_dim} dimensions, got {actual_dim}. "
            f"Please verify model configuration (VECTOR_DIMENSION={settings.VECTOR_DIMENSION})."
        )

    return vec_list

# Determine Database Engine (Postgres primary with SQLite fallback)
engine = None
is_postgres = False

import os

try:
    if settings.DATABASE_URL.startswith("postgresql"):
        # Bounded connection pool tailored for Render 512 MiB limit
        pool_size = int(os.getenv("DB_POOL_SIZE", "3"))
        max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "2"))
        engine = create_engine(
            settings.DATABASE_URL,
            connect_args={"connect_timeout": 5},
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_recycle=1800,
            pool_pre_ping=True
        )
        with engine.connect() as conn:
            # Enable pgvector extension on PostgreSQL
            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.commit()
                logger.info("pgvector extension verified/enabled on PostgreSQL.")
            except Exception as ext_err:
                logger.warning(f"Could not enable pgvector extension: {ext_err}")
        is_postgres = True
        logger.info(f"Connected to primary PostgreSQL database at {settings.DATABASE_URL.split('@')[-1]} (pool_size={pool_size}, max_overflow={max_overflow})")
    else:
        engine = create_engine(
            settings.DATABASE_URL,
            connect_args={"check_same_thread": False}
        )
except Exception as e:
    logger.error(f"PostgreSQL connection failed: {e}")

    if settings.ENVIRONMENT == "production":
        raise

    logger.warning("Falling back to SQLite for local development.")
    engine = create_engine(
        settings.SQLITE_FALLBACK_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
