"""
models/audit.py — Audit logs for admin corrections and sensitive operations.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from datetime import datetime
from database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action_type = Column(String(100), nullable=False)  # e.g., "SCORE_CORRECTION", "PROGRESS_OVERRIDE"
    target_table = Column(String(100), nullable=False)
    target_id = Column(Integer, nullable=False)
    before_value = Column(JSON, nullable=True)
    after_value = Column(JSON, nullable=True)
    reason = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
