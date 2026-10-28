"""
tests/test_three_portals.py — Verification of Student, Staff, and Admin Portals
Validates all 7 criteria specified in Section 8 of the requirements:
1. Authorized student login.
2. Authorized staff login using a @bitsathy.ac.in email.
3. Login using the configured Admin email (skillnova.admin@gmail.com).
4. Another Gmail account attempting Admin access (denied).
5. A student attempting Staff access (denied).
6. A user selecting a role they are not authorized to use (denied).
7. Direct navigation to protected dashboards without authentication (denied).
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch

from database import Base, get_db
from main import app
from models.user import User, StudentProfile, MentorProfile, MentorStatus, UserRole
from models.mentor import MentorMatch, MatchStatus
from models.placement import PlacementReadiness
from services.auth_service import hash_password, create_access_token
from config import get_settings

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_portals.db"
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
def seed_test_data():
    app.dependency_overrides[get_db] = override_get_db
    db = TestingSessionLocal()
    db.query(MentorMatch).delete()
    db.query(PlacementReadiness).delete()
    db.query(StudentProfile).delete()
    db.query(MentorProfile).delete()
    db.query(User).delete()
    db.commit()

    # 1. Student User
    student_user = User(
        id=101,
        email="student.test@bitsathy.ac.in",
        password_hash=hash_password("Password123!"),
        role=UserRole.student,
        is_active=True
    )
    # 2. Staff User
    staff_user = User(
        id=102,
        email="faculty.staff@bitsathy.ac.in",
        password_hash=hash_password("Password123!"),
        role=UserRole.staff,
        is_active=True
    )
    # 3. Admin User (Configured Admin)
    admin_user = User(
        id=103,
        email="skillnova.admin@gmail.com",
        password_hash=hash_password("Password123!"),
        role=UserRole.admin,
        is_active=True
    )

    db.add_all([student_user, staff_user, admin_user])
    db.commit()

    # Student Profile
    st_prof = StudentProfile(
        user_id=student_user.id,
        name="Test Student",
        target_role="Software Engineer",
        onboarding_completed=True
    )
    # Staff Profile
    staff_prof = MentorProfile(
        user_id=staff_user.id,
        name="Dr. Faculty Advisor",
        domain="Computer Science & Engineering",
        years_experience=10,
        status=MentorStatus.approved
    )
    db.add_all([st_prof, staff_prof])
    db.commit()

    # Match connection between staff and student
    match = MentorMatch(
        student_id=st_prof.id,
        mentor_id=staff_prof.id,
        match_score=92.0,
        status=MatchStatus.accepted,
        student_message="Looking forward to career mentorship"
    )
    db.add(match)
    db.commit()
    db.close()


# ==============================================================================
# Criterion 1: Authorized Student Login
# ==============================================================================
def test_1_authorized_student_login():
    res = client.post("/api/auth/login", json={
        "email": "student.test@bitsathy.ac.in",
        "password": "Password123!",
        "account_type": "student"
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "student"
    assert data["user"]["email"] == "student.test@bitsathy.ac.in"


# ==============================================================================
# Criterion 2: Authorized Staff Login using @bitsathy.ac.in
# ==============================================================================
def test_2_authorized_staff_login():
    res = client.post("/api/auth/login", json={
        "email": "faculty.staff@bitsathy.ac.in",
        "password": "Password123!",
        "account_type": "staff"
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] in ["staff", "mentor"]
    assert data["user"]["email"] == "faculty.staff@bitsathy.ac.in"


# ==============================================================================
# Criterion 3: Login using the configured Admin email
# ==============================================================================
def test_3_login_configured_admin_email():
    res = client.post("/api/auth/login", json={
        "email": "skillnova.admin@gmail.com",
        "password": "Password123!",
        "account_type": "admin"
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"
    assert data["user"]["email"] == "skillnova.admin@gmail.com"


# ==============================================================================
# Criterion 4: Another Gmail account attempting Admin access
# ==============================================================================
def test_4_unauthorized_gmail_attempting_admin_access():
    # 4a: Password login attempt
    res = client.post("/api/auth/login", json={
        "email": "other.intruder@gmail.com",
        "password": "Password123!",
        "account_type": "admin"
    })
    assert res.status_code in [401, 403]

    # 4b: Google login attempt with unauthorized Gmail
    mock_id_info = {
        "email": "other.intruder@gmail.com",
        "email_verified": True,
        "name": "Intruder User"
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_id_info):
        g_res = client.post("/api/auth/google", json={
            "credential": "mock_intruder_token",
            "account_type": "admin"
        })
        assert g_res.status_code == 403
        assert "Access restricted" in g_res.json()["detail"] or "Access denied" in g_res.json()["detail"]


# ==============================================================================
# Criterion 5: A student attempting Staff access
# ==============================================================================
def test_5_student_attempting_staff_access():
    # 5a: Attempting to select Staff at login with a student account
    res = client.post("/api/auth/login", json={
        "email": "student.test@bitsathy.ac.in",
        "password": "Password123!",
        "account_type": "staff"
    })
    assert res.status_code == 403
    assert "does not have the Staff role" in res.json()["detail"]

    # 5b: Student attempting to call staff API endpoints directly
    token = create_access_token({"sub": "101", "email": "student.test@bitsathy.ac.in", "role": "student"})
    staff_res = client.get("/api/mentor-dashboard/roster", headers={"Authorization": f"Bearer {token}"})
    assert staff_res.status_code == 403


# ==============================================================================
# Criterion 6: A user selecting a role they are not authorized to use
# ==============================================================================
def test_6_user_selecting_unauthorized_role():
    # 6a: Student selecting Admin
    res_st_admin = client.post("/api/auth/login", json={
        "email": "student.test@bitsathy.ac.in",
        "password": "Password123!",
        "account_type": "admin"
    })
    assert res_st_admin.status_code == 403
    assert "Access denied" in res_st_admin.json()["detail"]

    # 6b: Staff selecting Student
    res_staff_student = client.post("/api/auth/login", json={
        "email": "faculty.staff@bitsathy.ac.in",
        "password": "Password123!",
        "account_type": "student"
    })
    assert res_staff_student.status_code == 403
    assert "not authorized for the Student portal" in res_staff_student.json()["detail"]


# ==============================================================================
# Criterion 7: Direct navigation to protected dashboards without authentication
# ==============================================================================
def test_7_direct_navigation_without_authentication():
    # 7a: Staff roster endpoint without token
    res_staff = client.get("/api/mentor-dashboard/roster")
    assert res_staff.status_code in [401, 403]

    # 7b: Admin users endpoint without token
    res_admin = client.get("/api/admin/users")
    assert res_admin.status_code in [401, 403]

    # 7c: Student profile endpoint without token
    res_student = client.get("/api/student/profile")
    assert res_student.status_code in [401, 403]
