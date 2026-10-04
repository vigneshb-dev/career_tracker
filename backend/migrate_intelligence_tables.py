import sqlite3
import os

def migrate_db(db_path: str):
    if not os.path.exists(db_path):
        return
    print(f"Migrating {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    def add_col(table: str, col_def: str):
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_def}")
            conn.commit()
            print(f"Added column {col_def} to {table}")
        except Exception as e:
            # Column might already exist
            pass

    # skills
    add_col("skills", "status VARCHAR(50) DEFAULT 'ACTIVE'")

    # trainee_skills
    add_col("trainee_skills", "source VARCHAR(50) DEFAULT 'ASSESSMENT'")

    # skill_gaps
    add_col("skill_gaps", "course_id VARCHAR(50)")
    add_col("skill_gaps", "skill_id VARCHAR(50)")
    add_col("skill_gaps", "skill_name VARCHAR(100)")
    add_col("skill_gaps", "required_level FLOAT DEFAULT 0.0")
    add_col("skill_gaps", "current_level FLOAT DEFAULT 0.0")
    add_col("skill_gaps", "gap_level FLOAT DEFAULT 0.0")
    add_col("skill_gaps", "gap_category VARCHAR(50) DEFAULT 'NO_GAP'")
    add_col("skill_gaps", "source VARCHAR(50) DEFAULT 'JOB_REQUIREMENT'")
    add_col("skill_gaps", "detected_at VARCHAR(50)")

    conn.close()
    print(f"Migration completed for {db_path}.")

if __name__ == "__main__":
    migrate_db("skilltrace.db")
    migrate_db("test_skilltrace.db")
