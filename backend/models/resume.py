"""
models/resume.py — Resume storage and extracted skill results.
"""
from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)    # Server-side path
    raw_text = Column(Text, nullable=True)             # PyMuPDF extracted text
    parsed_data = Column(JSON, nullable=True)          # GPT-structured output
    analysis_score = Column(Float, nullable=True)      # 0-100 resume quality
    analysis_feedback = Column(Text, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    analyzed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    student = relationship("StudentProfile", back_populates="resumes")
    resume_skills = relationship("ResumeSkill", back_populates="resume", cascade="all, delete-orphan")


class ResumeSkill(Base):
    __tablename__ = "resume_skills"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    skill_name = Column(String(255), nullable=False)
    proficiency = Column(String(50), nullable=True)    # beginner/intermediate/advanced
    confidence = Column(Float, default=0.8)            # AI confidence in extraction
    accepted = Column(Boolean, default=False)          # Student accepted this item

    # Relationships
    resume = relationship("Resume", back_populates="resume_skills")
