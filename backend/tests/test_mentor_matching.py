"""
tests/test_mentor_matching.py — Tests for mentor discovery, recommendations, request creation, and feedback.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app
from models.user import User, UserRole, StudentProfile, MentorProfile
from models.mentor import MentorMatch, MentorFeedback, MentorSkill, MatchStatus
from models.skill import Skill, SkillCategory, StudentSkill
from services.auth_service import hash_password, create_access_token

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_mentors.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    db = TestingSessionLocal()
    db.query(MentorFeedback).delete()
    db.query(MentorMatch).delete()
    db.query(MentorSkill).delete()
    db.query(StudentSkill).delete()
    db.query(Skill).delete()
    db.query(MentorProfile).delete()
    db.query(StudentProfile).delete()
    db.query(User).delete()
    db.commit()
    db.close()

    yield

    db = TestingSessionLocal()
    db.query(MentorFeedback).delete()
    db.query(MentorMatch).delete()
    db.query(MentorSkill).delete()
    db.query(StudentSkill).delete()
    db.query(Skill).delete()
    db.query(MentorProfile).delete()
    db.query(StudentProfile).delete()
    db.query(User).delete()
    db.commit()
    db.close()


@pytest.fixture
def mentor_matching_fixture():
    db = TestingSessionLocal()

    # Create Student
    student_user = User(
        email="mentor_student@bitsathy.ac.in",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.student,
        is_active=True,
    )
    db.add(student_user)
    db.flush()

    student_profile = StudentProfile(
        user_id=student_user.id,
        name="Mentee Student",
        target_role="Backend Developer",
        onboarding_completed=True,
    )
    db.add(student_profile)

    # Create Mentor
    mentor_user = User(
        email="expert_mentor@bitsathy.ac.in",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.mentor,
        is_active=True,
    )
    db.add(mentor_user)
    db.flush()

    mentor_profile = MentorProfile(
        user_id=mentor_user.id,
        name="Senior Mentor",
        bio="10+ years building scalable systems",
        domain="Backend & Cloud",
        years_experience=10,
        availability_hours_per_week=5.0,
        status="approved",
    )
    db.add(mentor_profile)

    skill = Skill(name="FastAPI", category=SkillCategory.technical)
    db.add(skill)
    db.flush()

    student_skill = StudentSkill(student_id=student_profile.id, skill_id=skill.id, self_rating=50.0)
    mentor_skill = MentorSkill(mentor_id=mentor_profile.id, skill_id=skill.id, proficiency_level=95.0)
    db.add_all([student_skill, mentor_skill])
    db.commit()

    student_token = create_access_token(data={"sub": str(student_user.id), "email": student_user.email, "role": student_user.role.value})
    headers = {"Authorization": f"Bearer {student_token}"}
    mentor_id = mentor_profile.id
    student_id = student_profile.id
    db.close()

    return {
        "headers": headers,
        "mentor_id": mentor_id,
        "student_id": student_id,
    }


def test_list_and_recommend_mentors(mentor_matching_fixture):
    client = TestClient(app)
    headers = mentor_matching_fixture["headers"]
    mentor_id = mentor_matching_fixture["mentor_id"]

    # List all mentors
    resp = client.get("/mentors/", headers=headers)
    assert resp.status_code == 200
    mentors = resp.json()
    assert len(mentors) >= 1
    assert mentors[0]["name"] == "Senior Mentor"

    # Get recommended mentors
    rec_resp = client.get("/mentors/recommended", headers=headers)
    assert rec_resp.status_code == 200
    recs = rec_resp.json()
    assert "recommendations" in recs
    assert len(recs["recommendations"]) >= 1
    assert recs["recommendations"][0]["mentor_id"] == mentor_id
    assert "match_score" in recs["recommendations"][0]


def test_request_mentor_and_duplicate_check(mentor_matching_fixture):
    client = TestClient(app)
    headers = mentor_matching_fixture["headers"]
    mentor_id = mentor_matching_fixture["mentor_id"]

    # Send mentorship request
    req_resp = client.post(
        f"/mentors/{mentor_id}/request",
        json={"message": "I would love guidance on microservices and FastAPI architecture."},
        headers=headers,
    )
    assert req_resp.status_code == 201
    data = req_resp.json()
    assert data["message"] == "Request sent"
    assert "match_id" in data
    assert "match_score" in data

    # Verify match appears in matches endpoint with pending status
    matches_resp = client.get("/mentors/matches", headers=headers)
    assert matches_resp.status_code == 200
    matches = matches_resp.json()
    assert len(matches) == 1
    assert matches[0]["mentor_id"] == mentor_id
    assert matches[0]["status"] == "pending"

    # Duplicate request while pending should return 400
    dup_resp = client.post(
        f"/mentors/{mentor_id}/request",
        json={"message": "Another request."},
        headers=headers,
    )
    assert dup_resp.status_code == 400
    assert "already exists" in dup_resp.json()["detail"]
