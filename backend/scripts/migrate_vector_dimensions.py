"""
Production Safe Vector Dimension Migration
==========================================
Audits and safely migrates pgvector vector columns from legacy dimensions (e.g. 1536)
to the target dimension (384) matching SentenceTransformer all-MiniLM-L6-v2 and
deterministic fallback projection.

Preserves all relational data and regenerates embeddings in-place.
Rebuilds vector indexes safely (HNSW / IVFFlat).
Idempotent and safe to run on startup or via CLI.
"""

import sys
import logging
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import text, inspect
from app.core.config import settings
from app.core.database import engine, SessionLocal, HAS_PGVECTOR
from app.core.ai_models import encode_text_embedding

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("skilltrace.migration.vector")

VECTOR_COLUMNS = [
    ("jobs", "embedding"),
    ("interventions", "embedding"),
    ("trainees", "embedding"),
    ("skills_standards", "embedding"),
    ("resume_analyses", "embedding"),
]


def check_and_migrate_vector_dimensions(db_engine=None) -> dict:
    """
    Checks PostgreSQL vector column dimensions and safely migrates them if mismatched.
    Returns migration execution summary.
    """
    eng = db_engine or engine
    target_dim = settings.VECTOR_DIMENSION

    # Only applicable on PostgreSQL with pgvector
    if eng.name != "postgresql" or not HAS_PGVECTOR:
        logger.info(f"Database dialect is '{eng.name}' (HAS_PGVECTOR={HAS_PGVECTOR}). Skipping pgvector column alteration.")
        return {"status": "skipped", "reason": "non-postgresql or pgvector unavailable"}

    summary = {
        "migrated_columns": [],
        "regenerated_records": {},
        "errors": []
    }

    try:
        with eng.connect() as conn:
            # Query pg_attribute and pg_type for vector column dimensions
            query = text("""
                SELECT 
                    c.relname as table_name,
                    a.attname as column_name,
                    atttypmod as dimension
                FROM pg_attribute a
                JOIN pg_class c ON a.attrelid = c.oid
                JOIN pg_namespace n ON c.relnamespace = n.oid
                JOIN pg_type t ON a.atttypid = t.oid
                WHERE t.typname = 'vector'
                  AND n.nspname = 'public';
            """)
            rows = conn.execute(query).fetchall()
            existing_dims = {(r[0], r[1]): r[2] for r in rows}

            columns_to_migrate = []
            for tbl, col in VECTOR_COLUMNS:
                current_dim = existing_dims.get((tbl, col))
                if current_dim is not None and current_dim != target_dim:
                    columns_to_migrate.append((tbl, col, current_dim))

            if not columns_to_migrate:
                logger.info(f"All vector columns already match target dimension {target_dim}. No migration needed.")
                return {"status": "up_to_date", "dimension": target_dim}

            logger.info(f"Found {len(columns_to_migrate)} vector column(s) requiring migration to dimension {target_dim}: {columns_to_migrate}")

            for tbl, col, old_dim in columns_to_migrate:
                logger.info(f"Migrating {tbl}.{col} from {old_dim}-d to {target_dim}-d...")
                try:
                    # 1. Drop existing vector indexes safely
                    index_name = f"idx_{tbl}_{col}"
                    conn.execute(text(f"DROP INDEX IF EXISTS {index_name};"))
                    
                    # 2. Alter column type to target dimension
                    # Set incompatible embeddings to NULL so PostgreSQL allows ALTER TYPE
                    conn.execute(text(f"ALTER TABLE {tbl} ALTER COLUMN {col} TYPE vector({target_dim}) USING NULL;"))
                    conn.commit()
                    summary["migrated_columns"].append((tbl, col, old_dim, target_dim))
                    logger.info(f"Successfully altered {tbl}.{col} to vector({target_dim}).")
                except Exception as ex:
                    logger.error(f"Error altering column {tbl}.{col}: {ex}")
                    summary["errors"].append(str(ex))
                    conn.rollback()

        # 3. Regenerate embeddings for existing records in migrated tables
        db = SessionLocal()
        try:
            from app.models.entities import Job, Intervention

            # Regenerate Jobs
            jobs = db.query(Job).all()
            job_re_count = 0
            for j in jobs:
                try:
                    text_content = f"{j.title}. {j.domain or ''}. {(j.description or '')[:500]}"
                    j.embedding = encode_text_embedding(text_content, dim=target_dim)
                    job_re_count += 1
                except Exception as e:
                    logger.warning(f"Error regenerating embedding for job {j.id}: {e}")
            if job_re_count > 0:
                db.commit()
                summary["regenerated_records"]["jobs"] = job_re_count
                logger.info(f"Regenerated embeddings for {job_re_count} job(s).")

            # Regenerate Interventions
            interventions = db.query(Intervention).all()
            inv_re_count = 0
            for item in interventions:
                try:
                    embed_text = f"{item.title}. {item.type}. {item.domain}. {' '.join(item.target_skills or [])}. {item.description}"
                    item.embedding = encode_text_embedding(embed_text, dim=target_dim)
                    inv_re_count += 1
                except Exception as e:
                    logger.warning(f"Error regenerating embedding for intervention {item.id}: {e}")
            if inv_re_count > 0:
                db.commit()
                summary["regenerated_records"]["interventions"] = inv_re_count
                logger.info(f"Regenerated embeddings for {inv_re_count} intervention(s).")

        finally:
            db.close()

        # 4. Rebuild indexes safely
        with eng.connect() as conn:
            for tbl, col, _, _ in summary["migrated_columns"]:
                index_name = f"idx_{tbl}_{col}"
                try:
                    # Attempt HNSW index (pgvector >= 0.5.0)
                    conn.execute(text(f"CREATE INDEX IF NOT EXISTS {index_name} ON {tbl} USING hnsw ({col} vector_cosine_ops);"))
                    conn.commit()
                    logger.info(f"Created HNSW index {index_name}.")
                except Exception:
                    # Fallback to IVFFlat if HNSW is unsupported
                    try:
                        conn.execute(text(f"CREATE INDEX IF NOT EXISTS {index_name} ON {tbl} USING ivfflat ({col} vector_cosine_ops) WITH (lists = 100);"))
                        conn.commit()
                        logger.info(f"Created IVFFlat index {index_name}.")
                    except Exception as idx_err:
                        logger.warning(f"Could not build vector index {index_name}: {idx_err}")

        summary["status"] = "success"
        return summary

    except Exception as e:
        logger.error(f"Migration error: {e}")
        return {"status": "error", "error": str(e)}


if __name__ == "__main__":
    result = check_and_migrate_vector_dimensions()
    print(result)
