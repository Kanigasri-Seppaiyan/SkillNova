"""
schemas/student.py — Student profile schemas.
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class StudentOnboardingRequest(BaseModel):
    full_name: str
    register_number: str
    mobile_number: str
    department: str
    academic_year: str
    college_email: Optional[str] = None
    career_goal: Optional[str] = None
    technical_skills: Optional[List[str]] = None
    skills: Optional[List[dict]] = None


class StudentProfileUpdate(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    register_number: Optional[str] = None
    mobile_number: Optional[str] = None
    department: Optional[str] = None
    academic_year: Optional[str] = None
    career_goal: Optional[str] = None
    target_role: Optional[str] = None
    technical_skills: Optional[List[str]] = None
    bio: Optional[str] = None
    daily_learning_hours: Optional[float] = None
    preferred_language: Optional[str] = None
    preferred_content_types: Optional[str] = None


class StudentProfileOut(BaseModel):
    id: int
    user_id: int
    name: str
    bio: Optional[str] = None
    target_role: Optional[str] = None
    daily_learning_hours: float = 1.0
    preferred_language: str = "en"
    register_number: Optional[str] = None
    mobile_number: Optional[str] = None
    department: Optional[str] = None
    academic_year: Optional[str] = None
    onboarding_completed: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CareerGoalCreate(BaseModel):
    title: str
    goal_type: str = "job_title"
    description: Optional[str] = None
    target_date: Optional[datetime] = None


class CareerGoalOut(BaseModel):
    id: int
    student_id: int
    title: str
    goal_type: str
    description: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SkillRating(BaseModel):
    skill_id: int
    self_rating: float  # 0-100


class SkillRatingBatch(BaseModel):
    ratings: List[SkillRating]


class StudentSkillOut(BaseModel):
    id: int
    skill_id: int
    skill_name: str
    self_rating: float
    assessed_level: Optional[float]
    blended_level: float
    evidence_count: int

    class Config:
        from_attributes = True


class LearningPreferences(BaseModel):
    daily_learning_hours: float
    preferred_content_types: Optional[str] = None
    preferred_language: str = "en"
