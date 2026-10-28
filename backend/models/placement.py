"""
models/placement.py — Placement readiness with full breakdown.
"""
from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class PlacementReadiness(Base):
    __tablename__ = "placement_readiness"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    overall_score = Column(Float, default=0.0)         # 0-100 weighted composite
    breakdown = Column(JSON, nullable=True)            # Always stored — never recomputed client-side
    # Breakdown structure:
    # {
    #   "weights": {technical: 0.35, dsa: 0.15, ...},
    #   "scores": {technical: 65, dsa: 40, ...},
    #   "weighted_scores": {technical: 22.75, ...},
    #   "overall": 72.5,
    #   "limiting_factors": [{"factor": "DSA", "current": 40, "weight": 0.15, "impact": "high"}]
    # }
    computed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("StudentProfile", back_populates="placement_readiness")
