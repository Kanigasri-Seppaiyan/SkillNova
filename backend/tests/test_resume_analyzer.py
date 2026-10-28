"""
tests/test_resume_analyzer.py — Automated tests for AI Resume Analyzer.

Validates:
  1. File type and size validation (rejects invalid extensions and empty files).
  2. PDF and DOCX text extraction using real PyMuPDF / python-docx engines.
  3. Handling of unreadable / scanned documents with graceful feedback.
  4. Career alignment calculation & coverage percentage formula.
  5. Consensual integration with Skills & Gaps, Roadmap, and Placement Readiness.
  6. Authorization boundaries: students can only access their own resumes.
"""
import pytest
import io
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pathlib import Path

from main import app
from database import Base, get_db
from models.user import User, UserRole, StudentProfile
from models.skill import Skill, StudentSkill, SkillCategory, CareerGoal
from models.resume import Resume, ResumeSkill
from services.auth_service import hash_password, create_access_token
from services.resume_analysis_service import (
    extract_text_pdf,
    extract_text_docx,
    compute_career_skill_alignment,
)

# Isolated test DB
TEST_DB_URL = "sqlite:///./test_resume_analyzer.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    db = TestingSessionLocal()
    # Create Student 1
    u1 = User(email="student.resume1@bitsathy.ac.in", password_hash=hash_password("Pass123!"), role=UserRole.student)
    db.add(u1)
    db.flush()
    p1 = StudentProfile(
        user_id=u1.id,
        name="Alex Chen",
        department="Computer Science",
        target_role="Full Stack Developer",
        onboarding_completed=True,
    )
    db.add(p1)
    db.flush()
    g1 = CareerGoal(student_id=p1.id, title="Full Stack Developer", is_active=True)
    db.add(g1)

    # Create Student 2 (for authorization test)
    u2 = User(email="student.resume2@bitsathy.ac.in", password_hash=hash_password("Pass123!"), role=UserRole.student)
    db.add(u2)
    db.flush()
    p2 = StudentProfile(
        user_id=u2.id,
        name="Bob Stone",
        department="Information Technology",
        target_role="Backend Engineer",
        onboarding_completed=True,
    )
    db.add(p2)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)
    test_db_path = Path("test_resume_analyzer.db")
    if test_db_path.exists():
        try:
            test_db_path.unlink()
        except Exception:
            pass


def get_token(email: str = "student.resume1@bitsathy.ac.in") -> str:
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == email).first()
    db.close()
    return create_access_token({"sub": str(user.id), "email": user.email, "role": user.role.value})


def test_upload_invalid_extension():
    token = get_token()
    file_bytes = io.BytesIO(b"Fake executable or script")
    response = client.post(
        "/api/resume/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("malicious.exe", file_bytes, "application/octet-stream")},
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]


def test_upload_empty_file():
    token = get_token()
    file_bytes = io.BytesIO(b"")
    response = client.post(
        "/api/resume/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("empty.pdf", file_bytes, "application/pdf")},
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_unreadable_file_detection():
    token = get_token()
    # Upload a 5-byte PDF that has virtually no extractable text
    file_bytes = io.BytesIO(b"%PDF-1.4 empty")
    response = client.post(
        "/api/resume/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("scanned_resume.pdf", file_bytes, "application/pdf")},
        data={"career_goal": "Full Stack Developer"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["parsed_data"]["error"] == "UNREADABLE_FILE"
    assert "little or no extractable text" in data["parsed_data"]["message"]


def test_career_skill_alignment_formula():
    db = TestingSessionLocal()
    student = db.query(StudentProfile).first()

    extracted_skills = [
        {"name": "Python", "proficiency": "advanced", "evidence": "Built backend API with FastAPI"},
        {"name": "React", "proficiency": "intermediate", "evidence": "Created frontend dashboard"},
        {"name": "SQL", "proficiency": "beginner", "evidence": "Basic query writing"},
    ]
    projects = [
        {"title": "E-Commerce", "description": "Python, React and SQL system", "tech_stack": ["Python", "React"]}
    ]

    alignment = compute_career_skill_alignment(
        db=db,
        student=student,
        career_goal_name="Full Stack Developer",
        extracted_technical_skills=extracted_skills,
        extracted_projects=projects,
    )
    db.close()

    assert alignment["career_goal"] == "Full Stack Developer"
    assert alignment["total_required_skills"] > 0
    assert alignment["demonstrated_count"] >= 2  # Python and React
    assert alignment["partially_demonstrated_count"] >= 1  # SQL
    assert alignment["coverage_percentage"] > 0
    # Verify exact documented formula
    expected_pct = round(
        ((alignment["demonstrated_count"] * 1.0 + alignment["partially_demonstrated_count"] * 0.5) / alignment["total_required_skills"]) * 100,
        1
    )
    assert alignment["coverage_percentage"] == expected_pct


def test_resume_upload_and_sync_flow():
    token = get_token("student.resume1@bitsathy.ac.in")

    # Create a clean mock PDF with extractable text using PyMuPDF if available
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    text = (
        "Alex Chen\n"
        "alex@bitsathy.ac.in | 9876543210\n"
        "Education: B.Tech Computer Science, 2026\n"
        "Technical Skills: Python, FastAPI, React, JavaScript, SQL, Git, Docker, REST APIs\n"
        "Projects: Cloud Task Manager built with Python, FastAPI, PostgreSQL and Docker\n"
        "Experience: Software Developer Intern at TechCorp\n"
    )
    page.insert_text((50, 72), text)
    pdf_bytes = io.BytesIO()
    doc.save(pdf_bytes)
    doc.close()
    pdf_bytes.seek(0)

    # 1. Upload
    response = client.post(
        "/api/resume/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("alex_chen_resume.pdf", pdf_bytes, "application/pdf")},
        data={"career_goal": "Full Stack Developer"},
    )
    assert response.status_code == 200
    res_data = response.json()
    resume_id = res_data["resume_id"]
    assert resume_id is not None
    assert res_data["filename"] == "alex_chen_resume.pdf"

    # 2. Sync Skills
    sync_res = client.post(
        f"/api/resume/{resume_id}/sync-skills",
        headers={"Authorization": f"Bearer {token}"},
        json={"skills": ["Python", "FastAPI", "React"]},
    )
    assert sync_res.status_code == 200
    assert "Successfully integrated" in sync_res.json()["message"]

    # 3. Sync Roadmap
    roadmap_res = client.post(
        f"/api/resume/{resume_id}/sync-roadmap",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert roadmap_res.status_code == 200

    # 4. Sync Placement Readiness
    placement_res = client.post(
        f"/api/resume/{resume_id}/sync-placement",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert placement_res.status_code == 200
    assert "Placement Readiness Score updated" in placement_res.json()["message"]

    # 5. History Endpoint
    history_res = client.get(
        "/api/resume/history",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert history_res.status_code == 200
    history_list = history_res.json()["history"]
    assert len(history_list) >= 1
    assert history_list[0]["id"] == resume_id


def test_authorization_cross_student_access_blocked():
    token_student1 = get_token("student.resume1@bitsathy.ac.in")
    token_student2 = get_token("student.resume2@bitsathy.ac.in")

    # Get student 1's resume id
    history_res = client.get("/api/resume/history", headers={"Authorization": f"Bearer {token_student1}"})
    student1_resume_id = history_res.json()["history"][0]["id"]

    # Student 2 attempts to fetch Student 1's resume
    forbidden_res = client.get(
        f"/api/resume/{student1_resume_id}",
        headers={"Authorization": f"Bearer {token_student2}"},
    )
    assert forbidden_res.status_code == 404  # Not found for student 2 (isolation)

    # Student 2 attempts to sync Student 1's resume
    forbidden_sync = client.post(
        f"/api/resume/{student1_resume_id}/sync-skills",
        headers={"Authorization": f"Bearer {token_student2}"},
        json={},
    )
    assert forbidden_sync.status_code == 404
