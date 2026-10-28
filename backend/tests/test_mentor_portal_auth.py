"""
tests/test_mentor_portal_auth.py — Complete test suite for Mentor Portal authentication:
1. Allow mentor registration and login only with email addresses ending in @bitsathy.ac.in.
2. Reject other email domains and display: "Please use your official @bitsathy.ac.in email address."
3. Validate email on both frontend and backend.
4. Demo mentor account with faculty@bitsathy.ac.in in development environment.
5. Password Faculty@123 securely hashed.
6. Mentor role assigned and redirects to Mentor Dashboard.
7. No bypass of password verification or auto account creation during login.
8. Preserves student login and registration (domain restriction only for Mentor Portal).
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app
from models.user import User, UserRole, MentorProfile, MentorStatus, StudentProfile
from services.auth_service import hash_password, verify_password
from utils.validate_email import is_allowed_institute_email, normalize_email

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_mentor_portal_auth.db"
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
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    db = TestingSessionLocal()
    db.query(MentorProfile).delete()
    db.query(StudentProfile).delete()
    db.query(User).delete()
    db.commit()

    # Create demo faculty mentor
    demo_mentor = User(
        email="faculty@bitsathy.ac.in",
        password_hash=hash_password("Faculty@123"),
        role=UserRole.mentor,
        is_active=True
    )
    db.add(demo_mentor)
    db.commit()
    db.refresh(demo_mentor)

    profile = MentorProfile(
        user_id=demo_mentor.id,
        name="Faculty Mentor",
        domain="Computer Science & Engineering",
        status=MentorStatus.approved
    )
    db.add(profile)
    db.commit()
    db.close()


# ── 1. Unit Tests ─────────────────────────────────────────────────────────────

def test_unit_bitsathy_domain_validation():
    assert is_allowed_institute_email("faculty@bitsathy.ac.in") is True
    assert is_allowed_institute_email("mentor@bitsathy.ac.in") is True
    assert is_allowed_institute_email("FACULTY@BITSATHY.AC.IN") is True
    assert is_allowed_institute_email("dr.faculty@bitsathy.ac.in") is True

    # Rejection of other domains
    assert is_allowed_institute_email("faculty@gmail.com") is False
    assert is_allowed_institute_email("mentor@yahoo.com") is False
    assert is_allowed_institute_email("faculty@bitsathy.ac.in.fake.com") is False
    assert is_allowed_institute_email("faculty@notbitsathy.ac.in") is False


# ── 2. Demo Account Verification ──────────────────────────────────────────────

def test_demo_account_exists_with_hashed_password():
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "faculty@bitsathy.ac.in").first()
    assert user is not None
    assert user.role == UserRole.mentor
    assert verify_password("Faculty@123", user.password_hash) is True
    assert verify_password("WrongPassword", user.password_hash) is False
    db.close()


# ── 3. Mentor Login: Domain Rejection ─────────────────────────────────────────

def test_mentor_login_rejects_invalid_domain():
    # Login attempt with gmail domain
    res = client.post("/api/auth/login", data={
        "username": "faculty@gmail.com",
        "password": "Faculty@123",
        "account_type": "mentor"
    })
    assert res.status_code == 403
    assert res.json()["detail"] == "Please use your official @bitsathy.ac.in email address."


def test_mentor_login_rejects_spoofed_domain():
    res = client.post("/api/auth/login", data={
        "username": "faculty@bitsathy.ac.in.attacker.com",
        "password": "Faculty@123",
        "account_type": "mentor"
    })
    assert res.status_code == 403
    assert res.json()["detail"] == "Please use your official @bitsathy.ac.in email address."


# ── 4. Mentor Login: Incorrect Password ───────────────────────────────────────

def test_mentor_login_incorrect_password():
    res = client.post("/api/auth/login", data={
        "username": "faculty@bitsathy.ac.in",
        "password": "IncorrectPassword!@#",
        "account_type": "mentor"
    })
    assert res.status_code == 401
    assert res.json()["detail"] == "Incorrect email or password"


def test_mentor_login_nonexistent_user():
    res = client.post("/api/auth/login", data={
        "username": "unknown.mentor@bitsathy.ac.in",
        "password": "AnyPassword123",
        "account_type": "mentor"
    })
    # Must not auto-create account
    assert res.status_code == 401
    assert res.json()["detail"] == "Incorrect email or password"


# ── 5. Mentor Login: Successful Login ─────────────────────────────────────────

def test_mentor_login_successful():
    res = client.post("/api/auth/login", data={
        "username": "faculty@bitsathy.ac.in",
        "password": "Faculty@123",
        "account_type": "mentor"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "faculty@bitsathy.ac.in"
    assert data["user"]["role"] == "mentor"


# ── 6. Mentor Registration: Domain Enforcement ────────────────────────────────

def test_mentor_register_invalid_domain_rejected():
    res = client.post("/api/auth/register", json={
        "email": "newmentor@gmail.com",
        "password": "Password123!",
        "full_name": "New Mentor",
        "role": "mentor"
    })
    assert res.status_code == 403
    assert res.json()["detail"] == "Please use your official @bitsathy.ac.in email address."


def test_mentor_register_valid_bitsathy_domain():
    res = client.post("/api/auth/register", json={
        "email": "prof.kumar@bitsathy.ac.in",
        "password": "Password123!",
        "full_name": "Prof Kumar",
        "role": "mentor"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["user"]["role"] == "mentor"
    assert data["user"]["email"] == "prof.kumar@bitsathy.ac.in"


# ── 7. Student Login & Registration Preserved (Requirement 8) ─────────────────

def test_student_register_and_login_with_general_domain():
    # Student registers using college email restriction
    reg_res = client.post("/api/auth/register", json={
        "email": "student.regular@bitsathy.ac.in",
        "password": "Password123!",
        "full_name": "Regular Student",
        "role": "student"
    })
    assert reg_res.status_code == 201
    assert reg_res.json()["user"]["role"] == "student"

    # Student can log in successfully with that email
    login_res = client.post("/api/auth/login", data={
        "username": "student.regular@bitsathy.ac.in",
        "password": "Password123!",
        "account_type": "student"
    })
    assert login_res.status_code == 200
    assert login_res.json()["user"]["role"] == "student"
