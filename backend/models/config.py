"""
models/config.py — App configuration table for configurable thresholds and weights.
"""
from sqlalchemy import Column, String, JSON, DateTime
from sqlalchemy.sql import func
from database import Base


class AppConfig(Base):
    __tablename__ = "app_config"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(JSON, nullable=False)
    description = Column(String(500), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
