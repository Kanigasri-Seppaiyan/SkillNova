"""
models/skill_gap.py — Skill gap tracking with explanation breakdown.
"""
from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, JSON, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class GapPriority(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"
    none = "none"


class SkillGap(Base):
    __tablename__ = "skill_gaps"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    gap_value = Column(Float, default=0.0)           # 0-100 gap percentage
    priority = Column(SAEnum(GapPriority), default=GapPriority.none)
    breakdown = Column(JSON, nullable=True)          # Full explanation JSON
    computed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("StudentProfile", back_populates="skill_gaps")
    skill = relationship("Skill", back_populates="skill_gaps")
