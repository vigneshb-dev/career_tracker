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

def get_vector_type(dim: int = 1536):
    """
    Returns pgvector Vector type when available on PostgreSQL,
    otherwise falls back to JSON representation for seamless development.
    """
    if HAS_PGVECTOR:
        return PgVector(dim)
    return JSON

# Determine Database Engine (Postgres primary with SQLite fallback)
engine = None
is_postgres = False

try:
    if settings.DATABASE_URL.startswith("postgresql"):
        # Test connection with a short timeout
        test_engine = create_engine(
            settings.DATABASE_URL,
            connect_args={"connect_timeout": 3},
            pool_pre_ping=True
        )
        with test_engine.connect() as conn:
            # Enable pgvector extension on PostgreSQL
            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.commit()
                logger.info("pgvector extension verified/enabled on PostgreSQL.")
            except Exception as ext_err:
                logger.warning(f"Could not enable pgvector extension: {ext_err}")
        engine = test_engine
        is_postgres = True
        logger.info(f"Connected to primary PostgreSQL database at {settings.DATABASE_URL.split('@')[-1]}")
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
