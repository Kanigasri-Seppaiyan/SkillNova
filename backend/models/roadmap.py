"""
models/roadmap.py — Learning roadmap, roadmap items, and resources.
"""
from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean,
    ForeignKey, DateTime, JSON, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class RoadmapItemStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    skipped = "skipped"
    revision = "revision"


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    career_goal_id = Column(Integer, ForeignKey("career_goals.id", ondelete="SET NULL"), nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    version = Column(Integer, default=1)
    total_weeks = Column(Integer, default=12)
    is_active = Column(Boolean, default=True)

    # Relationships
    student = relationship("StudentProfile", back_populates="roadmaps")
    career_goal = relationship("CareerGoal", back_populates="roadmaps")
    items = relationship("RoadmapItem", back_populates="roadmap", cascade="all, delete-orphan", order_by="RoadmapItem.week_number")


class RoadmapItem(Base):
    __tablename__ = "roadmap_items"

    id = Column(Integer, primary_key=True, index=True)
    roadmap_id = Column(Integer, ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="SET NULL"), nullable=True)
    skill_gap_id = Column(Integer, ForeignKey("skill_gaps.id", ondelete="SET NULL"), nullable=True)
    week_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SAEnum(RoadmapItemStatus), default=RoadmapItemStatus.pending)
    priority = Column(String(20), default="medium")   # high/medium/low
    item_type = Column(String(50), default="learn")   # learn/practice/build/interview_prep/assess/revision
    difficulty = Column(String(20), default="medium")  # easy/medium/hard
    target_improvement = Column(String(255), nullable=True)  # e.g. "Closes gap: System Design (62% → 71%)"
    resources = Column(JSON, nullable=True)            # [{"title": "...", "url": "...", "type": "video"|"article"|"practice"}]
    proof = Column(JSON, nullable=True)                # {"type": "quiz"|"github"|"note", "data": ..., "verified": True, "completed_at": ...}
    phase = Column(String(100), nullable=True)         # "Foundations", "Backend Core", etc.
    estimated_hours = Column(Float, default=2.0)
    resource_ids = Column(JSON, nullable=True)         # [resource_id, ...] legacy support
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    roadmap = relationship("Roadmap", back_populates="items")
    skill = relationship("Skill", back_populates="roadmap_items")


