"""
models/progress.py — Weekly progress snapshots.
"""
from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, JSON, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class WeeklyProgress(Base):
    __tablename__ = "weekly_progress"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    week_start = Column(Date, nullable=False)          # Monday of the week
    readiness_score = Column(Float, nullable=True)     # Placement readiness at week end
    skills_improved = Column(Integer, default=0)       # Count of skills that improved
    assessments_taken = Column(Integer, default=0)
    roadmap_items_completed = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    details = Column(JSON, nullable=True)              # Additional breakdown details
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    student = relationship("StudentProfile", back_populates="weekly_progress")
