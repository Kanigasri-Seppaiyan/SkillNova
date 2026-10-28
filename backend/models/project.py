"""
models/project.py — Project catalog, skills mapping, and student project tracking.
"""
from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean,
    ForeignKey, DateTime, JSON, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class ProjectStatus(str, enum.Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"
    paused = "paused"


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    difficulty = Column(String(20), default="intermediate")
    estimated_hours = Column(Float, default=20.0)
    domain = Column(String(255), nullable=True)
    tech_stack = Column(JSON, nullable=True)         # ["Python", "React", ...]
    github_template_url = Column(String(512), nullable=True)
    thumbnail_url = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    project_skills = relationship("ProjectSkill", back_populates="project", cascade="all, delete-orphan")
    student_projects = relationship("StudentProject", back_populates="project", cascade="all, delete-orphan")


class ProjectSkill(Base):
    __tablename__ = "project_skills"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    skill_weight = Column(Float, default=1.0)        # relative importance 0-1

    # Relationships
    project = relationship("Project", back_populates="project_skills")
    skill = relationship("Skill", back_populates="project_skills")


class StudentProject(Base):
    __tablename__ = "student_projects"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    status = Column(SAEnum(ProjectStatus), default=ProjectStatus.not_started)
    progress_pct = Column(Float, default=0.0)        # 0-100
    github_url = Column(String(512), nullable=True)
    notes = Column(Text, nullable=True)
    progress_data = Column(JSON, nullable=True)      # Detailed milestones and task checklist
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    student = relationship("StudentProfile", back_populates="student_projects")
    project = relationship("Project", back_populates="student_projects")
