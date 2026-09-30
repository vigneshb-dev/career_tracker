import sqlite3

conn = sqlite3.connect("skilltrace.db")
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE trainees ADD COLUMN evidence_level VARCHAR(50) DEFAULT 'self_reported'")
    conn.commit()
    print("Column evidence_level added successfully!")
except Exception as e:
    print("Notice:", e)

conn.close()
