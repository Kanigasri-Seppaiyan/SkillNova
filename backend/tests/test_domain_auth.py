"""
tests/test_domain_auth.py — Complete Test Matrix for @bitsathy.ac.in Domain Enforcement.
Verifies unit validation, API registration & login endpoints, and database model defense-in-depth.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app
from models.user import User, StudentProfile, MentorProfile
from utils.validate_email import normalize_email, is_allowed_institute_email, ALLOWED_DOMAIN

# SQLite in-memory test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_domain_auth.db"
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
def clean_db():
    app.dependency_overrides[get_db] = override_get_db
    db = TestingSessionLocal()
    db.query(StudentProfile).delete()
    db.query(MentorProfile).delete()
    db.query(User).delete()
    db.commit()
    db.close()


# ==========================================
# 1. UNIT TESTS: validate_email helper
# ==========================================

def test_unit_allowed_institute_emails():
    assert is_allowed_institute_email("student@bitsathy.ac.in") is True
    assert is_allowed_institute_email("mentor@bitsathy.ac.in") is True
    assert is_allowed_institute_email("faculty@bitsathy.ac.in") is True
    assert is_allowed_institute_email("Student@BITSATHY.AC.IN ") is True
    assert is_allowed_institute_email("  john.doe123@bitsathy.ac.in  ") is True


def test_unit_rejected_emails():
    # External domains
    assert is_allowed_institute_email("student@gmail.com") is False
    assert is_allowed_institute_email("student@yahoo.com") is False
    assert is_allowed_institute_email("student@outlook.com") is False

    # Multi-@ attacks / spoofing
    assert is_allowed_institute_email("student@bitsathy.ac.in@gmail.com") is False
    assert is_allowed_institute_email("student@bitsathy.ac.in.example.com") is False
    assert is_allowed_institute_email("hacker@bitsathy.ac.in.evil.com") is False

    # Invalid syntax
    assert is_allowed_institute_email("notanemail") is False
    assert is_allowed_institute_email("@bitsathy.ac.in") is False
    assert is_allowed_institute_email("student@") is False
    assert is_allowed_institute_email("") is False
    assert is_allowed_institute_email(None) is False


# ==========================================
# 2. MODEL LAYER DEFENSE IN DEPTH
# ==========================================

def test_model_validates_email_on_assignment():
    # Valid email creates user
    u = User(email="student@bitsathy.ac.in", password_hash="hash", role="student")
    assert u.email == "student@bitsathy.ac.in"

    # Invalid email raises ValueError
    with pytest.raises(ValueError, match="Only @bitsathy.ac.in email addresses are allowed."):
        User(email="hacker@gmail.com", password_hash="hash", role="student")

    with pytest.raises(ValueError, match="Only @bitsathy.ac.in email addresses are allowed."):
        User(email="student@bitsathy.ac.in.fake.com", password_hash="hash", role="student")


# ==========================================
# 3. API ENDPOINTS: /api/auth/register
# ==========================================

def test_api_register_valid_bitsathy_email():
    payload = {
        "email": "student1@bitsathy.ac.in",
        "password": "Password123!",
        "full_name": "Test Student",
        "role": "student"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "student1@bitsathy.ac.in"


def test_api_register_normalized_bitsathy_email():
    payload = {
        "email": "  Student.Two@BITSATHY.AC.IN  ",
        "password": "Password123!",
        "full_name": "Test Student Two",
        "role": "student"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "student.two@bitsathy.ac.in"


def test_api_register_rejected_gmail():
    payload = {
        "email": "student@gmail.com",
        "password": "Password123!",
        "full_name": "Gmail Student",
        "role": "student"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 403
    assert "Please use your official @bitsathy.ac.in email address." in response.json()["detail"]


def test_api_register_rejected_spoofed_domains():
    spoofed = [
        "student@yahoo.com",
        "student@outlook.com",
        "student@bitsathy.ac.in@gmail.com",
        "student@bitsathy.ac.in.example.com",
        "hacker@bitsathy.ac.in.evil.com"
    ]
    for bad_email in spoofed:
        response = client.post("/api/auth/register", json={
            "email": bad_email,
            "password": "Password123!",
            "full_name": "Bad Email",
            "role": "student"
        })
        assert response.status_code == 403, f"Expected 403 for {bad_email}, got {response.status_code}"


# ==========================================
# 4. API ENDPOINTS: /api/auth/login
# ==========================================

def test_api_login_valid_bitsathy_email():
    # Register first
    client.post("/api/auth/register", json={
        "email": "login_user@bitsathy.ac.in",
        "password": "Password123!",
        "full_name": "Login User",
        "role": "student"
    })

    # Form login
    response = client.post("/api/auth/login", data={
        "username": "login_user@bitsathy.ac.in",
        "password": "Password123!"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_api_login_rejected_external_domain():
    response = client.post("/api/auth/login", data={
        "username": "hacker@gmail.com",
        "password": "Password123!"
    })
    assert response.status_code == 403
    assert "Please use your official @bitsathy.ac.in email address." in response.json()["detail"]


def test_api_forgot_password_rejected_external_domain():
    response = client.post("/api/auth/forgot-password?email=hacker@gmail.com")
    assert response.status_code == 403
    assert "Please use your official @bitsathy.ac.in email address." in response.json()["detail"]


# ==========================================
# 5. API ENDPOINTS: /api/auth/google
# ==========================================

from unittest.mock import patch

def test_api_google_auth_success_bitsathy_email():
    mock_id_info = {
        "email": "student.google@bitsathy.ac.in",
        "email_verified": True,
        "name": "Google Student",
        "picture": "https://lh3.googleusercontent.com/avatar"
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_id_info):
        response = client.post("/api/auth/google", json={"credential": "mock_valid_token"})
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "student.google@bitsathy.ac.in"
        assert data["user"]["role"] == "student"


def test_api_google_auth_existing_mentor_preserves_role():
    # Create a mentor via the dedicated mentor-apply endpoint
    # (Registration endpoint now strictly creates student accounts only)
    client.post("/api/auth/mentor-apply", json={
        "email": "prof.mentor@bitsathy.ac.in",
        "password": "Password123!",
        "full_name": "Prof Mentor",
        "bio": "Experienced professor",
        "domain": "Computer Science",
        "years_experience": 8
    })

    mock_id_info = {
        "email": "prof.mentor@bitsathy.ac.in",
        "email_verified": True,
        "name": "Prof Mentor"
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_id_info):
        response = client.post("/api/auth/google", json={"credential": "mock_valid_token"})
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "mentor"


def test_api_google_auth_rejected_unverified_email():
    mock_id_info = {
        "email": "student.unverified@bitsathy.ac.in",
        "email_verified": False,
        "name": "Unverified Student"
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_id_info):
        response = client.post("/api/auth/google", json={"credential": "mock_token"})
        assert response.status_code == 403
        assert response.json()["detail"] == "Access restricted. Please sign in using your verified @bitsathy.ac.in Google account."


def test_api_google_auth_rejected_external_gmail():
    mock_id_info = {
        "email": "intruder@gmail.com",
        "email_verified": True,
        "name": "Gmail User"
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_id_info):
        response = client.post("/api/auth/google", json={"credential": "mock_token"})
        assert response.status_code == 403
        assert response.json()["detail"] == "Access restricted. Please sign in using your verified @bitsathy.ac.in Google account."


def test_api_google_auth_rejected_spoofed_domain():
    mock_id_info = {
        "email": "hacker@bitsathy.ac.in.evil.com",
        "email_verified": True,
        "name": "Spoofed Domain"
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_id_info):
        response = client.post("/api/auth/google", json={"credential": "mock_token"})
        assert response.status_code == 403
        assert response.json()["detail"] == "Access restricted. Please sign in using your verified @bitsathy.ac.in Google account."


def test_api_google_auth_rejected_invalid_token():
    with patch("google.oauth2.id_token.verify_oauth2_token", side_effect=ValueError("Token has expired")):
        response = client.post("/api/auth/google", json={"credential": "expired_token"})
        assert response.status_code == 401
        assert "Invalid Google token" in response.json()["detail"]


def test_api_google_auth_passes_clock_skew_to_verifier():
    mock_id_info = {
        "email": "student.skew@bitsathy.ac.in",
        "email_verified": True,
        "name": "Skew Student"
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_id_info) as mock_verify:
        response = client.post("/api/auth/google", json={"credential": "mock_valid_token"})
        assert response.status_code == 200
        mock_verify.assert_called_once()
        _, kwargs = mock_verify.call_args
        assert kwargs.get("clock_skew_in_seconds", 0) >= 10


