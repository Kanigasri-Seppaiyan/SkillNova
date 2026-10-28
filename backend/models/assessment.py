"""
models/assessment.py — Assessment question bank, attempts, and answers.
"""
from sqlalchemy import (
    Column, String, Integer, Float, Text, Boolean,
    ForeignKey, DateTime, JSON, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class AttemptStatus(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"
    abandoned = "abandoned"


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    difficulty = Column(String(20), default="intermediate")  # beginner/intermediate/advanced
    question_count = Column(Integer, default=10)
    time_limit_minutes = Column(Integer, default=30)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    skill = relationship("Skill", back_populates="assessments")
    questions = relationship("AssessmentQuestion", back_populates="assessment", cascade="all, delete-orphan")
    attempts = relationship("AssessmentAttempt", back_populates="assessment", cascade="all, delete-orphan")


class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)          # [{"id": "a", "text": "..."}]
    correct_answer = Column(String(10), nullable=False)  # option id e.g. "b"
    explanation = Column(Text, nullable=True)
    difficulty = Column(String(20), default="intermediate")
    order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    assessment = relationship("Assessment", back_populates="questions")
    answers = relationship("AssessmentAnswer", back_populates="question", cascade="all, delete-orphan")


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, nullable=True)            # 0-100 percentage
    raw_score = Column(Integer, nullable=True)      # correct answers count
    total_questions = Column(Integer, nullable=True)
    status = Column(SAEnum(AttemptStatus), default=AttemptStatus.in_progress)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    student = relationship("StudentProfile", back_populates="assessment_attempts")
    assessment = relationship("Assessment", back_populates="attempts")
    answers = relationship("AssessmentAnswer", back_populates="attempt", cascade="all, delete-orphan")


class AssessmentAnswer(Base):
    __tablename__ = "assessment_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("assessment_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("assessment_questions.id", ondelete="CASCADE"), nullable=False)
    selected_answer = Column(String(10), nullable=True)   # option id chosen
    is_correct = Column(Boolean, nullable=True)
    time_taken_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    attempt = relationship("AssessmentAttempt", back_populates="answers")
    question = relationship("AssessmentQuestion", back_populates="answers")
