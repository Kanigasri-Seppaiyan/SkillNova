"""
models/skill.py — Skills, career goals, and student skill tracking.
"""
from sqlalchemy import (
    Column, String, Integer, Float, Text, Boolean,
    ForeignKey, DateTime, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base
from models.skill_gap import SkillGap, GapPriority



class SkillCategory(str, enum.Enum):
    technical = "technical"
    dsa = "dsa"
    soft = "soft"
    domain = "domain"


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    domain = Column(String(255), nullable=True)   # e.g. "Web Dev", "Data Science"
    category = Column(SAEnum(SkillCategory), default=SkillCategory.technical)
    description = Column(Text, nullable=True)
    icon = Column(String(100), nullable=True)     # lucide icon name
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    career_requirements = relationship("CareerSkillRequirement", back_populates="skill", cascade="all, delete-orphan")
    student_skills = relationship("StudentSkill", back_populates="skill", cascade="all, delete-orphan")
    assessments = relationship("Assessment", back_populates="skill")
    skill_gaps = relationship("SkillGap", back_populates="skill", cascade="all, delete-orphan")
    roadmap_items = relationship("RoadmapItem", back_populates="skill")
    resources = relationship("Resource", back_populates="skill", cascade="all, delete-orphan")
    project_skills = relationship("ProjectSkill", back_populates="skill")
    mentor_skills = relationship("MentorSkill", back_populates="skill")


class CareerGoal(Base):
    __tablename__ = "career_goals"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    goal_type = Column(String(50), default="job_title")  # job_title | domain
    title = Column(String(255), nullable=False)           # e.g. "Full Stack Developer"
    description = Column(Text, nullable=True)
    target_date = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    student = relationship("StudentProfile", back_populates="career_goals")
    skill_requirements = relationship("CareerSkillRequirement", back_populates="career_goal", cascade="all, delete-orphan")
    roadmaps = relationship("Roadmap", back_populates="career_goal")


class CareerSkillRequirement(Base):
    __tablename__ = "career_skill_requirements"

    id = Column(Integer, primary_key=True, index=True)
    career_goal_id = Column(Integer, ForeignKey("career_goals.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    required_level = Column(Float, default=70.0)   # 0-100 scale
    is_mandatory = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    career_goal = relationship("CareerGoal", back_populates="skill_requirements")
    skill = relationship("Skill", back_populates="career_requirements")


class StudentSkill(Base):
    __tablename__ = "student_skills"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    self_rating = Column(Float, default=0.0)        # 0-100, student self-reported
    assessed_level = Column(Float, nullable=True)   # 0-100, from assessments
    blended_level = Column(Float, default=0.0)      # 0-100, computed blend
    evidence_count = Column(Integer, default=0)     # resume/project evidence items
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    student = relationship("StudentProfile", back_populates="student_skills")
    skill = relationship("Skill", back_populates="student_skills")
