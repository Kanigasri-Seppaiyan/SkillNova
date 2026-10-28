"""
migrate_v2.py — Non-destructive schema migration for Phase 1.
Adds:
- availability_slots table
- mentoring_sessions table
- mentor_profiles: status, max_students, rejection_reason
"""
import sqlite3
import os
from database import Base, engine
import models

def migrate():
    print("Creating new tables...")
    Base.metadata.create_all(bind=engine)

    db_path = os.path.join(os.path.dirname(__file__), "skillnova.db")
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cols = [c[1] for c in cursor.execute("PRAGMA table_info(mentor_profiles)").fetchall()]
        print("Existing mentor_profiles cols:", cols)

        new_cols = [
            ("status", "VARCHAR(20) DEFAULT 'approved'"),
            ("max_students", "INTEGER DEFAULT 5"),
            ("rejection_reason", "TEXT")
        ]
        for name, col_def in new_cols:
            if name not in cols:
                cursor.execute(f"ALTER TABLE mentor_profiles ADD COLUMN {name} {col_def}")
                print(f"Added column {name} to mentor_profiles")

        conn.commit()
        conn.close()
    print("[SUCCESS] Schema migration complete!")

if __name__ == "__main__":
    migrate()
