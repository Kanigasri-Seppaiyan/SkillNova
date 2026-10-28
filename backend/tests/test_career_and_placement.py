"""
tests/test_career_and_placement.py — Tests for Career GPS, Career Twin, Simulator, and Placement Readiness.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app
from models.user import User, UserRole, StudentProfile
from models.roadmap import Roadmap, RoadmapItem, RoadmapItemStatus
from models.placement import PlacementReadiness
from models.skill_gap import SkillGap, GapPriority
from models.skill import Skill, SkillCategory
from services.auth_service import hash_password, create_access_token

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_career.db"
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
    db.query(RoadmapItem).delete()
    db.query(Roadmap).delete()
    db.query(PlacementReadiness).delete()
    db.query(SkillGap).delete()
    db.query(Skill).delete()
    db.query(StudentProfile).delete()
    db.query(User).delete()
    db.commit()
    db.close()

    yield

    db = TestingSessionLocal()
    db.query(RoadmapItem).delete()
    db.query(Roadmap).delete()
    db.query(PlacementReadiness).delete()
    db.query(SkillGap).delete()
    db.query(Skill).delete()
    db.query(StudentProfile).delete()
    db.query(User).delete()
    db.commit()
    db.close()


@pytest.fixture
def student_auth_header():
    db = TestingSessionLocal()
    user = User(
        email="test_career_student@bitsathy.ac.in",
        password_hash=hash_password("Password123!"),
        role=UserRole.student,
        is_active=True,
    )
    db.add(user)
    db.flush()

    profile = StudentProfile(
        user_id=user.id,
        name="Career Student",
        target_role="Full Stack Developer",
        daily_learning_hours=2.0,
        onboarding_completed=True,
    )
    db.add(profile)
    db.commit()

    token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role.value})
    headers = {"Authorization": f"Bearer {token}"}
    student_id = profile.id
    db.close()
    return headers, student_id


def test_career_gps_empty_and_populated(student_auth_header):
    headers, student_id = student_auth_header
    client = TestClient(app)

    # Initially without roadmap
    resp = client.get("/career/gps", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["career_goal"] == "Full Stack Developer"
    assert data["milestones"] == []
    assert data["total_weeks"] == 0

    # Populate roadmap and placement readiness
    db = TestingSessionLocal()
    roadmap = Roadmap(
        student_id=student_id,
        total_weeks=12,
        is_active=True,
    )
    db.add(roadmap)
    db.flush()

    item1 = RoadmapItem(
        roadmap_id=roadmap.id,
        week_number=1,
        title="HTML & Modern CSS",
        item_type="learn",
        status=RoadmapItemStatus.completed,
    )
    item2 = RoadmapItem(
        roadmap_id=roadmap.id,
        week_number=2,
        title="JavaScript Async & DOM",
        item_type="project",
        status=RoadmapItemStatus.in_progress,
    )
    item3 = RoadmapItem(
        roadmap_id=roadmap.id,
        week_number=3,
        title="React Components & State",
        item_type="assessment",
        status=RoadmapItemStatus.pending,
    )
    db.add_all([item1, item2, item3])

    readiness = PlacementReadiness(
        student_id=student_id,
        overall_score=65.0,
        breakdown={"scores": {"technical": 70, "dsa": 60, "projects": 65}},
    )
    db.add(readiness)
    db.commit()
    db.close()

    resp = client.get("/career/gps", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["placement_readiness"] == 65.0
    assert len(data["milestones"]) == 3
    assert data["milestones"][0]["status"] == "completed"
    assert data["milestones"][1]["status"] == "current"
    assert data["milestones"][2]["status"] == "upcoming"


def test_career_twin_endpoint(student_auth_header):
    headers, student_id = student_auth_header
    client = TestClient(app)

    db = TestingSessionLocal()
    skill = Skill(name="Python", category=SkillCategory.technical)
    db.add(skill)
    db.flush()

    gap = SkillGap(
        student_id=student_id,
        skill_id=skill.id,
        gap_value=20.0,
        priority=GapPriority.high,
    )
    db.add(gap)

    readiness = PlacementReadiness(
        student_id=student_id,
        overall_score=55.0,
        breakdown={"scores": {"technical": 50, "dsa": 60}},
    )
    db.add(readiness)
    db.commit()
    db.close()

    resp = client.get("/career/twin", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["you"]["readiness_score"] == 55.0
    assert len(data["you"]["top_gaps"]) == 1
    assert data["twin"]["readiness_score"] == 80.0
    assert data["gap_to_close"] == 25.0


def test_career_simulator_endpoint(student_auth_header):
    headers, student_id = student_auth_header
    client = TestClient(app)

    db = TestingSessionLocal()
    readiness = PlacementReadiness(
        student_id=student_id,
        overall_score=60.0,
        breakdown={"scores": {"technical": 60, "dsa": 50}},
    )
    db.add(readiness)
    db.commit()
    db.close()

    # Test DSA + practice scenario
    resp = client.post(
        "/career/simulator",
        json={"scenario": "I practice DSA algorithms daily"},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["current_readiness"] == 60.0
    assert data["projected_readiness"] == 72.0
    assert data["estimated_gain"] == 12.0
    assert len(data["predictions"]) == 2

    # Test project scenario
    resp2 = client.post(
        "/career/simulator",
        json={"scenario": "I build a full stack web project"},
        headers=headers,
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["projected_readiness"] == 66.0
    assert data2["estimated_gain"] == 6.0
