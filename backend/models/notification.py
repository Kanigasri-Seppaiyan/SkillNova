"""
models/notification.py — Notification model for real-time alerts.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)          # assessment_result/skill_drop/roadmap_updated/mentor_request/etc.
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=True)
    action_url = Column(String(512), nullable=True)   # Frontend route to navigate to
    meta_data = Column("metadata", JSON, nullable=True)  # Extra context
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="notifications")
