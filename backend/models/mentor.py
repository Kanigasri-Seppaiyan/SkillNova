import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, JSON, Boolean, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from database import Base


class MatchStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    completed = "completed"


class MentorSkill(Base):
    __tablename__ = "mentor_skills"

    id = Column(Integer, primary_key=True, index=True)
    mentor_id = Column(Integer, ForeignKey("mentor_profiles.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    proficiency_level = Column(Float, default=80.0)
    expertise_years = Column(Float, default=1.0)

    skill = relationship("Skill", back_populates="mentor_skills")
    mentor = relationship("MentorProfile", back_populates="mentor_skills")


class MentorMatch(Base):
    __tablename__ = "mentor_matches"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    mentor_id = Column(Integer, ForeignKey("mentor_profiles.id", ondelete="CASCADE"), nullable=False)
    match_score = Column(Float, default=0.0)
    breakdown = Column(JSON, nullable=True)
    status = Column(SAEnum(MatchStatus), default=MatchStatus.pending)
    student_message = Column(Text, nullable=True)
    mentor_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    student = relationship("StudentProfile", foreign_keys=[student_id], back_populates="mentor_matches")
    mentor = relationship("MentorProfile", foreign_keys=[mentor_id], back_populates="mentor_matches")
    feedbacks = relationship("MentorFeedback", back_populates="match", cascade="all, delete-orphan")



class MentorFeedback(Base):
    __tablename__ = "mentor_feedback"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("mentor_matches.id", ondelete="CASCADE"), nullable=False)
    student_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mentor_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Float, default=5.0)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    actionable_recommendations = Column(Text, nullable=True)
    priority_level = Column(String(20), default="medium")  # high, medium, low
    created_at = Column(DateTime, default=datetime.utcnow)

    match = relationship("MentorMatch", back_populates="feedbacks")



class MentorTask(Base):
    __tablename__ = "mentor_tasks"

    id = Column(Integer, primary_key=True, index=True)
    student_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mentor_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="pending")  # pending, completed, overdue
    feedback_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("User", foreign_keys=[student_user_id])
    mentor = relationship("User", foreign_keys=[mentor_user_id])


class SessionStatus(str, enum.Enum):
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"

    id = Column(Integer, primary_key=True, index=True)
    mentor_id = Column(Integer, ForeignKey("mentor_profiles.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(String(20), nullable=False)  # Monday, Tuesday, ...
    start_time = Column(String(10), nullable=False)   # "14:00"
    end_time = Column(String(10), nullable=False)     # "15:00"
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    mentor = relationship("MentorProfile", back_populates="availability_slots")
    sessions = relationship("MentoringSession", back_populates="slot")


class MentoringSession(Base):
    __tablename__ = "mentoring_sessions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    mentor_id = Column(Integer, ForeignKey("mentor_profiles.id", ondelete="CASCADE"), nullable=False)
    slot_id = Column(Integer, ForeignKey("availability_slots.id", ondelete="SET NULL"), nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, default=45, nullable=False)
    status = Column(SAEnum(SessionStatus), default=SessionStatus.scheduled, nullable=False)
    agenda = Column(Text, nullable=True)
    meeting_link = Column(String(512), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    student = relationship("StudentProfile", back_populates="sessions")
    mentor = relationship("MentorProfile", back_populates="sessions")
    slot = relationship("AvailabilitySlot", back_populates="sessions")

