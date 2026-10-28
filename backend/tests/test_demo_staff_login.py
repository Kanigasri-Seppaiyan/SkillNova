"""
tests/test_demo_staff_login.py — Integration test for demo staff account and login flow.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app
from models.user import User, StudentProfile, MentorProfile, MentorStatus, UserRole
from models.mentor import MentorMatch, MatchStatus
from services.auth_service import hash_password

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_demo_staff.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def seed_demo_staff():
    app.dependency_overrides[get_db] = override_get_db
    db = TestingSessionLocal()
    db.query(MentorMatch).delete()
    db.query(StudentProfile).delete()
    db.query(MentorProfile).delete()
    db.query(User).delete()
    db.commit()

    # Create demo staff account
    staff_user = User(
        id=201,
        email="staff@bitsathy.ac.in",
        password_hash=hash_password("Faculty@123"),
        role=UserRole.staff,
        is_active=True
    )
    db.add(staff_user)
    db.commit()

    staff_profile = MentorProfile(
        id=201,
        user_id=staff_user.id,
        name="Prof. Staff Advisor",
        bio="Senior Faculty & Advisor",
        domain="Computer Science & Engineering",
        years_experience=12,
        availability_hours_per_week=10.0,
        status=MentorStatus.approved,
        max_students=15
    )
    db.add(staff_profile)

    # Student
    student_user = User(
        id=202,
        email="student@bitsathy.ac.in",
        password_hash=hash_password("password123"),
        role=UserRole.student,
        is_active=True
    )
    db.add(student_user)
    db.commit()

    student_profile = StudentProfile(
        id=202,
        user_id=student_user.id,
        name="Alex Chen",
        target_role="Full Stack Developer"
    )
    db.add(student_profile)
    db.commit()

    db.add(MentorMatch(
        student_id=student_profile.id,
        mentor_id=staff_profile.id,
        status=MatchStatus.accepted
    ))
    db.commit()
    db.close()


def test_demo_staff_successful_login():
    """Verify staff can log in with staff@bitsathy.ac.in and account_type='staff'"""
    response = client.post("/api/auth/login", json={
        "email": "staff@bitsathy.ac.in",
        "password": "Faculty@123",
        "account_type": "staff"
    })
    assert response.status_code == 200, response.text
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "staff@bitsathy.ac.in"
    assert data["user"]["role"] == "staff"


def test_staff_portal_access_with_token():
    """Verify staff token can access staff profile and roster"""
    login_res = client.post("/api/auth/login", json={
        "email": "staff@bitsathy.ac.in",
        "password": "Faculty@123",
        "account_type": "staff"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    profile_res = client.get("/api/mentor/profile", headers=headers)
    assert profile_res.status_code == 200
    assert profile_res.json()["full_name"] == "Prof. Staff Advisor"

    roster_res = client.get("/api/mentor-dashboard/roster", headers=headers)
    assert roster_res.status_code == 200
    roster = roster_res.json()
    assert len(roster) >= 1
    assert roster[0]["full_name"] == "Alex Chen"


def test_student_cannot_login_as_staff():
    """Verify student account cannot log in with account_type='staff'"""
    response = client.post("/api/auth/login", json={
        "email": "student@bitsathy.ac.in",
        "password": "password123",
        "account_type": "staff"
    })
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]
