"""
models/resource.py — Admin-managed learning resource catalog.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    url = Column(String(512), nullable=False)
    resource_type = Column(String(50), default="article")  # article/video/course/book/practice
    difficulty = Column(String(20), default="intermediate")
    duration_minutes = Column(Integer, nullable=True)
    is_free = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    skill = relationship("Skill", back_populates="resources")

