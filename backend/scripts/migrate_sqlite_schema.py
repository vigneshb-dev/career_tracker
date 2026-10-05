import sqlite3
import os

def migrate_db(db_path):
    if not os.path.exists(db_path):
        return
    print(f"Migrating {db_path}...")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    statements = [
        "ALTER TABLE coach_profiles ADD COLUMN training_institute_id VARCHAR(50)",
        "ALTER TABLE coach_profiles ADD COLUMN designation VARCHAR(100)",
        "ALTER TABLE coach_profiles ADD COLUMN verification_status VARCHAR(50) DEFAULT 'VERIFIED'",
        "ALTER TABLE employer_profiles ADD COLUMN company_id VARCHAR(50)",
        "ALTER TABLE employer_profiles ADD COLUMN department VARCHAR(100)",
        "ALTER TABLE employer_profiles ADD COLUMN verification_status VARCHAR(50) DEFAULT 'VERIFIED'",
        "ALTER TABLE courses ADD COLUMN training_institute_id VARCHAR(50)",
        "ALTER TABLE courses ADD COLUMN category VARCHAR(100)",
        "ALTER TABLE courses ADD COLUMN duration VARCHAR(50)",
        "ALTER TABLE courses ADD COLUMN mode VARCHAR(50) DEFAULT 'Hybrid'",
        "ALTER TABLE courses ADD COLUMN eligibility VARCHAR(255)",
        "ALTER TABLE courses ADD COLUMN capacity INTEGER DEFAULT 30",
        "ALTER TABLE courses ADD COLUMN status VARCHAR(50) DEFAULT 'active'",
        "ALTER TABLE courses ADD COLUMN created_by VARCHAR(50)"
    ]
    
    for stmt in statements:
        try:
            cur.execute(stmt)
            print(f"Applied: {stmt}")
        except Exception:
            # Column already exists
            pass
            
    conn.commit()
    conn.close()
    print(f"Completed {db_path}.")

if __name__ == "__main__":
    migrate_db("skilltrace.db")
    migrate_db("backend/skilltrace.db")
