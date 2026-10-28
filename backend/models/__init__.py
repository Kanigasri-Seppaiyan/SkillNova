"""
models/__init__.py — Imports all SQLAlchemy models for auto-detection.
"""
from models.user import User, StudentProfile, MentorProfile, MentorStatus
from models.career import Career, CareerBenchmarkRequirement
from models.skill import Skill, StudentSkill, CareerGoal, CareerSkillRequirement
from models.skill_gap import SkillGap, GapPriority
from models.assessment import Assessment, AssessmentQuestion, AssessmentAttempt, AssessmentAnswer
from models.roadmap import Roadmap, RoadmapItem
from models.project import Project, ProjectSkill, StudentProject
from models.resource import Resource
from models.mentor import MentorSkill, MentorMatch, MentorFeedback, MentorTask, SessionStatus, AvailabilitySlot, MentoringSession
from models.progress import WeeklyProgress
from models.resume import Resume, ResumeSkill
from models.placement import PlacementReadiness
from models.ai import AIConversation, AIMessage
from models.notification import Notification
from models.config import AppConfig
from models.audit import AuditLog
