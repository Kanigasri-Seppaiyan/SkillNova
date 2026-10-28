"""
models/user.py — Core user, student profile, and mentor profile models.
"""
from sqlalchemy import (
    Column, String, Boolean, Integer, Float, Text,
    ForeignKey, DateTime, Enum as SAEnum
)
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
import enum
from database import Base
from utils.validate_email import normalize_email, is_allowed_institute_email


class UserRole(str, enum.Enum):
    student = "student"
    mentor = "mentor"
    staff = "staff"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.student, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @validates("email")
    def validate_email_address(self, key, address):
        from config import get_settings
        settings = get_settings()
        normalized = normalize_email(address)
        if settings.admin_email_normalized and normalized == settings.admin_email_normalized:
            return normalized
        if not is_allowed_institute_email(normalized):
            raise ValueError("Only @bitsathy.ac.in email addresses are allowed.")
        return normalized

    @validates("role")
    def validate_user_role(self, key, role):
        from config import get_settings
        settings = get_settings()
        role_val = role.value if hasattr(role, "value") else str(role)
        if hasattr(self, "email") and self.email:
            clean_email = normalize_email(self.email)
            if settings.admin_email_normalized and clean_email == settings.admin_email_normalized:
                return role
            if not is_allowed_institute_email(clean_email):
                raise ValueError("Only @bitsathy.ac.in email addresses are allowed.")
        return role

    @property
    def full_name(self) -> str:
        if self.student_profile and self.student_profile.name:
            return self.student_profile.name
        if self.mentor_profile and self.mentor_profile.name:
            return self.mentor_profile.name
        return self.email.split("@")[0].replace(".", " ").title()

    @property
    def mentor_status(self):
        if self.mentor_profile and hasattr(self.mentor_profile, "status"):
            st = self.mentor_profile.status
            return st.value if hasattr(st, "value") else str(st)
        return None

    @property
    def onboarding_completed(self) -> bool:
        if self.student_profile:
            return bool(
                self.student_profile.onboarding_completed
                and self.student_profile.register_number
                and self.student_profile.department
                and self.student_profile.academic_year
            )
        return False

    # Relationships
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    mentor_profile = relationship("MentorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    ai_conversations = relationship("AIConversation", back_populates="user", cascade="all, delete-orphan")





class MentorStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    suspended = "suspended"


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(512), nullable=True)
    target_role = Column(String(255), nullable=True)
    daily_learning_hours = Column(Float, default=1.0)
    preferred_language = Column(String(10), default="en")
    preferred_content_types = Column(Text, nullable=True)  # JSON string e.g. ["video","article"]
    register_number = Column(String(64), nullable=True)
    mobile_number = Column(String(20), nullable=True)
    department = Column(String(128), nullable=True)
    academic_year = Column(String(64), nullable=True)
    onboarding_completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="student_profile")
    career_goals = relationship("CareerGoal", back_populates="student", cascade="all, delete-orphan")
    student_skills = relationship("StudentSkill", back_populates="student", cascade="all, delete-orphan")
    assessment_attempts = relationship("AssessmentAttempt", back_populates="student", cascade="all, delete-orphan")
    skill_gaps = relationship("SkillGap", back_populates="student", cascade="all, delete-orphan")
    roadmaps = relationship("Roadmap", back_populates="student", cascade="all, delete-orphan")
    student_projects = relationship("StudentProject", back_populates="student", cascade="all, delete-orphan")
    weekly_progress = relationship("WeeklyProgress", back_populates="student", cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="student", cascade="all, delete-orphan")
    placement_readiness = relationship("PlacementReadiness", back_populates="student", cascade="all, delete-orphan")
    mentor_matches = relationship("MentorMatch", foreign_keys="MentorMatch.student_id", back_populates="student", cascade="all, delete-orphan")
    sessions = relationship("MentoringSession", back_populates="student", cascade="all, delete-orphan")


class MentorProfile(Base):
    __tablename__ = "mentor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(512), nullable=True)
    years_experience = Column(Integer, default=0)
    availability_hours_per_week = Column(Float, default=5.0)
    domain = Column(String(255), nullable=True)
    linkedin_url = Column(String(512), nullable=True)
    status = Column(SAEnum(MentorStatus), default=MentorStatus.pending, nullable=False)
    max_students = Column(Integer, default=5, nullable=False)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="mentor_profile")
    mentor_skills = relationship("MentorSkill", back_populates="mentor", cascade="all, delete-orphan")
    mentor_matches = relationship("MentorMatch", foreign_keys="MentorMatch.mentor_id", back_populates="mentor", cascade="all, delete-orphan")
    availability_slots = relationship("AvailabilitySlot", back_populates="mentor", cascade="all, delete-orphan")
    sessions = relationship("MentoringSession", back_populates="mentor", cascade="all, delete-orphan")

