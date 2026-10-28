"""
models/career.py — Career master data and career skill requirements.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Career(Base):
    __tablename__ = "careers"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), default="Software Engineering")
    target_tier = Column(String(50), default="Tier 1 Product")
    created_at = Column(DateTime, default=datetime.utcnow)

    skill_requirements = relationship("CareerBenchmarkRequirement", back_populates="career", cascade="all, delete-orphan")


class CareerBenchmarkRequirement(Base):
    __tablename__ = "career_benchmark_requirements"

    id = Column(Integer, primary_key=True, index=True)
    career_id = Column(Integer, ForeignKey("careers.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    required_level = Column(Float, default=4.0)  # Numeric target level e.g. 4.0 out of 5.0 (or 80/100)
    importance_weight = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    career = relationship("Career", back_populates="skill_requirements")
    skill = relationship("Skill")


# Alias for backward compatibility
CareerSkillRequirement = CareerBenchmarkRequirement
