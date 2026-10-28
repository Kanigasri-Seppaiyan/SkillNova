import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "skillnova.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cols = [c[1] for c in cursor.execute("PRAGMA table_info(roadmap_items)").fetchall()]
print("Existing cols:", cols)

new_cols = [
    ("skill_gap_id", "INTEGER"),
    ("difficulty", "VARCHAR(20) DEFAULT 'medium'"),
    ("target_improvement", "VARCHAR(255)"),
    ("resources", "JSON"),
    ("proof", "JSON"),
    ("phase", "VARCHAR(100)"),
]

for name, dtype in new_cols:
    if name not in cols:
        cursor.execute(f"ALTER TABLE roadmap_items ADD COLUMN {name} {dtype}")
        print(f"Added column {name}")

conn.commit()
updated_cols = [c[1] for c in cursor.execute("PRAGMA table_info(roadmap_items)").fetchall()]
print("Updated cols:", updated_cols)
conn.close()
