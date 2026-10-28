import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import get_settings

settings = get_settings()

db_url = settings.database_url
connect_args = {}

# Fallback to SQLite if DATABASE_URL starts with sqlite
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(db_url, connect_args=connect_args)
else:
    try:
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
        )
    except Exception:
        # Fallback to SQLite local db for standalone testing
        db_url = "sqlite:///./skillnova.db"
        connect_args = {"check_same_thread": False}
        engine = create_engine(db_url, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency yielding database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
