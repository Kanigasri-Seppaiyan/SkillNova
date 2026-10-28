"""
tests/test_rbac.py — Automated tests for Role-Based Access Control (RBAC) security boundaries.
Verifies:
  1. Student calling /api/admin/* returns HTTP 403 Forbidden.
  2. Student calling /api/mentor/* returns HTTP 403 Forbidden.
  3. Mentor calling /api/admin/* returns HTTP 403 Forbidden.
  4. Mentor calling /api/mentor/students/{unassigned_id} returns HTTP 403 Forbidden.
  5. Admin access allowed.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app
from models.user import User, StudentProfile, MentorProfile
from models.mentor import MentorMatch
from models.audit import AuditLog
from services.auth_service import hash_password, create_access_token

# Test database setup (SQLite in-memory)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_rbac.db"
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
def setup_test_users():
    app.dependency_overrides[get_db] = override_get_db
    db = TestingSessionLocal()
    db.query(MentorMatch).delete()
    db.query(StudentProfile).delete()
    db.query(MentorProfile).delete()
    db.query(User).delete()
    db.query(AuditLog).delete()
    db.commit()

    # Seed test users with allowed institute emails
    student1 = User(id=1, email="st1@bitsathy.ac.in", password_hash=hash_password("pass"), role="student", is_active=True)
    student2 = User(id=2, email="st2@bitsathy.ac.in", password_hash=hash_password("pass"), role="student", is_active=True)
    mentor1 = User(id=3, email="men1@bitsathy.ac.in", password_hash=hash_password("pass"), role="mentor", is_active=True)
    admin1 = User(id=4, email="adm1@bitsathy.ac.in", password_hash=hash_password("pass"), role="admin", is_active=True)

    db.add_all([student1, student2, mentor1, admin1])
    db.commit()

    # Add profiles
    sp1 = StudentProfile(id=1, user_id=1, name="Student One")
    sp2 = StudentProfile(id=2, user_id=2, name="Student Two")
    mp1 = MentorProfile(id=1, user_id=3, name="Mentor One", status="approved")
    db.add_all([sp1, sp2, mp1])
    db.commit()

    # Assign student1 to mentor1, leaving student2 UNASSIGNED
    match = MentorMatch(student_id=1, mentor_id=1, status="accepted")
    db.add(match)
    db.commit()
    db.close()



def get_headers(user_id: int, email: str, role: str):
    token = create_access_token({"sub": str(user_id), "email": email, "role": role})
    return {"Authorization": f"Bearer {token}"}


def test_student_cannot_access_admin_routes():
    headers = get_headers(1, "st1@bitsathy.ac.in", "student")
    response = client.get("/api/admin/dashboard", headers=headers)
    assert response.status_code == 403
    assert "Admin role required" in response.json()["detail"]


def test_student_cannot_access_mentor_routes():
    headers = get_headers(1, "st1@bitsathy.ac.in", "student")
    response = client.get("/api/mentor/students", headers=headers)
    assert response.status_code == 403
    assert "Mentor role required" in response.json()["detail"]


def test_mentor_cannot_access_admin_routes():
    headers = get_headers(3, "men1@bitsathy.ac.in", "mentor")
    response = client.get("/api/admin/dashboard", headers=headers)
    assert response.status_code == 403
    assert "Admin role required" in response.json()["detail"]


def test_mentor_cannot_access_unassigned_student():
    headers = get_headers(3, "men1@bitsathy.ac.in", "mentor")
    # Student #2 is NOT assigned to Mentor #1
    response = client.get("/api/mentor/students/2", headers=headers)
    assert response.status_code == 403
    assert "not assigned to you" in response.json()["detail"]


def test_mentor_can_access_assigned_student():
    headers = get_headers(3, "men1@bitsathy.ac.in", "mentor")
    # Student #1 IS assigned to Mentor #1
    response = client.get("/api/mentor/students/1", headers=headers)
    assert response.status_code == 200
    assert response.json()["student_id"] == 1


def test_admin_access_allowed():
    headers = get_headers(4, "adm1@bitsathy.ac.in", "admin")
    response = client.get("/api/admin/dashboard", headers=headers)
    assert response.status_code == 200
    assert "total_users" in response.json()


def test_pending_mentor_blocked_from_approved_features():
    db = TestingSessionLocal()
    pending_user = User(id=5, email="pending.mentor@bitsathy.ac.in", password_hash=hash_password("pass"), role="mentor", is_active=True)
    db.add(pending_user)
    db.commit()
    pending_profile = MentorProfile(id=2, user_id=5, name="Pending Mentor", status="pending")
    db.add(pending_profile)
    db.commit()
    db.close()

    headers = get_headers(5, "pending.mentor@bitsathy.ac.in", "mentor")
    response = client.get("/api/mentor/students", headers=headers)
    assert response.status_code == 403
    assert "pending admin approval" in response.json()["detail"].lower()


def test_role_injection_at_registration_ignored():
    # Client tries to inject role: admin during public registration
    payload = {
        "email": "hacker.admin@bitsathy.ac.in",
        "password": "Password123!",
        "full_name": "Injected Admin",
        "role": "admin"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["role"] == "student"

    # Verify directly from database that role is student
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "hacker.admin@bitsathy.ac.in").first()
    assert user is not None
    assert user.role == "student"
    db.close()


def test_mentor_apply_and_admin_approval_flow():
    # 1. Mentor applies via dedicated application flow
    apply_payload = {
        "email": "applicant.mentor@bitsathy.ac.in",
        "password": "Password123!",
        "full_name": "Dr. Applicant",
        "bio": "Experienced architect",
        "domain": "Cloud Architecture",
        "years_experience": 10
    }
    res_apply = client.post("/api/auth/mentor-apply", json=apply_payload)
    assert res_apply.status_code == 201
    assert res_apply.json()["status"] == "pending"

    # 2. Verify applicant cannot access approved mentor endpoints
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "applicant.mentor@bitsathy.ac.in").first()
    mentor_id = user.mentor_profile.id
    db.close()

    mentor_headers = get_headers(user.id, user.email, "mentor")
    blocked_res = client.get("/api/mentor/students", headers=mentor_headers)
    assert blocked_res.status_code == 403

    # 3. Admin approves mentor
    admin_headers = get_headers(4, "adm1@bitsathy.ac.in", "admin")
    approve_res = client.post(f"/api/admin/mentors/{mentor_id}/approve", headers=admin_headers)
    assert approve_res.status_code == 200
    assert "approved successfully" in approve_res.json()["message"]

    # 4. Now mentor can access approved mentor endpoints
    approved_res = client.get("/api/mentor/students", headers=mentor_headers)
    assert approved_res.status_code == 200


def test_admin_search_and_pagination():
    admin_headers = get_headers(4, "adm1@bitsathy.ac.in", "admin")
    res = client.get("/api/admin/users?page=1&limit=2", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) <= 2

    # Search filter
    res_search = client.get("/api/admin/users?search=Student", headers=admin_headers)
    assert res_search.status_code == 200
    assert any("Student" in u["full_name"] for u in res_search.json()["items"])


def test_admin_csv_report_export():
    admin_headers = get_headers(4, "adm1@bitsathy.ac.in", "admin")
    res = client.get("/api/admin/reports/export-csv?report_type=students", headers=admin_headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "Student ID,Email,Name" in res.text

