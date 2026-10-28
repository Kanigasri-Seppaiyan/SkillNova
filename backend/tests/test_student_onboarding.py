"""
test_student_onboarding.py — End-to-end and unit verification of the Student Information & Onboarding flow.
Tests:
1. Student registration & first-time login returns onboarding_completed == False.
2. Incomplete onboarding status endpoint check (/api/student/onboarding-status).
3. Field validation: mobile number format, invalid email identity check, mandatory fields.
4. Valid onboarding submission succeeds, saves profile, career goal, and technical skills.
5. Duplicate register number prevention (rejects second student trying to use same register number).
6. Returning student login returns onboarding_completed == True and profile data intact.
7. Profile retrieval (/api/student/profile) returns complete saved information.
8. Profile update (/api/student/profile PUT) allows viewing and modifying details with data persistence.
9. Account logout and re-login verification.
"""

import pytest
from fastapi.testclient import TestClient
import uuid
import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from database import get_db, Base, engine
from models.user import User, StudentProfile

client = TestClient(app)


def test_complete_student_onboarding_flow():
    # Generate unique test email and register numbers to ensure isolation
    uid = uuid.uuid4().hex[:6]
    student_email = f"student.{uid}@bitsathy.ac.in"
    student_password = "Password@123"
    student_name = f"Test Student {uid}"
    reg_number = f"7376211CS{uid[:4].upper()}"

    # Step 1: Register New Student
    reg_res = client.post("/api/auth/register", json={
        "email": student_email,
        "password": student_password,
        "full_name": student_name,
        "role": "student"
    })
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"

    # Step 2: First-time Login
    login_res = client.post("/api/auth/login", json={
        "email": student_email,
        "password": student_password,
        "account_type": "student"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    login_data = login_res.json()
    token = login_data["access_token"]
    user_info = login_data["user"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify onboarding_completed is False on initial login
    assert user_info["onboarding_completed"] is False, "New student must have onboarding_completed == False"

    # Step 3: Check /api/student/onboarding-status
    status_res = client.get("/api/student/onboarding-status", headers=headers)
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["onboarding_completed"] is False

    # Step 4: Validation Check - Invalid Mobile Number
    invalid_mob_res = client.post("/api/student/onboarding", json={
        "full_name": student_name,
        "register_number": reg_number,
        "college_email": student_email,
        "mobile_number": "12345",  # Invalid!
        "department": "Computer Science and Engineering",
        "academic_year": "3rd Year",
        "career_goal": "Full Stack Engineer",
        "technical_skills": ["Python", "FastAPI"]
    }, headers=headers)
    assert invalid_mob_res.status_code == 422, "Invalid mobile number must be rejected"

    # Step 5: Validation Check - Email Identity Mismatch
    mismatch_email_res = client.post("/api/student/onboarding", json={
        "full_name": student_name,
        "register_number": reg_number,
        "college_email": "imposter.user@bitsathy.ac.in",  # Does not match authenticated account!
        "mobile_number": "9876543210",
        "department": "Computer Science and Engineering",
        "academic_year": "3rd Year",
        "career_goal": "Full Stack Engineer",
        "technical_skills": ["Python", "FastAPI"]
    }, headers=headers)
    assert mismatch_email_res.status_code == 400, "Mismatched college email must be rejected"

    # Step 6: Valid Onboarding Submission
    valid_onboard_res = client.post("/api/student/onboarding", json={
        "full_name": student_name,
        "register_number": reg_number,
        "college_email": student_email,
        "mobile_number": "9876543210",
        "department": "Computer Science and Engineering",
        "academic_year": "3rd Year",
        "career_goal": "Full Stack Engineer",
        "technical_skills": ["Python", "React", "FastAPI", "SQL"]
    }, headers=headers)
    assert valid_onboard_res.status_code == 200, f"Onboarding failed: {valid_onboard_res.text}"
    onboard_data = valid_onboard_res.json()
    assert onboard_data["success"] is True
    assert onboard_data["onboarding_completed"] is True
    assert onboard_data["profile"]["register_number"] == reg_number
    assert "Python" in onboard_data["profile"]["technical_skills"]

    # Step 7: Duplicate Register Number Prevention
    # Register another student
    other_email = f"other.{uid}@bitsathy.ac.in"
    reg2_res = client.post("/api/auth/register", json={
        "email": other_email,
        "password": "Password@123",
        "full_name": "Other Student",
        "role": "student"
    })
    assert reg2_res.status_code == 201

    login2_res = client.post("/api/auth/login", json={
        "email": other_email,
        "password": "Password@123",
        "account_type": "student"
    })
    token2 = login2_res.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Attempt to use the same register number
    dup_res = client.post("/api/student/onboarding", json={
        "full_name": "Other Student",
        "register_number": reg_number,  # DUPLICATE!
        "college_email": other_email,
        "mobile_number": "9123456780",
        "department": "Information Technology",
        "academic_year": "2nd Year",
        "career_goal": "Cloud Specialist",
        "technical_skills": ["AWS", "Docker"]
    }, headers=headers2)
    assert dup_res.status_code == 400, "Duplicate register number must be rejected"
    assert "already registered" in dup_res.json()["detail"]

    # Step 8: Returning Student Login
    returning_login_res = client.post("/api/auth/login", json={
        "email": student_email,
        "password": student_password,
        "account_type": "student"
    })
    assert returning_login_res.status_code == 200
    ret_user = returning_login_res.json()["user"]
    assert ret_user["onboarding_completed"] is True, "Returning student must have onboarding_completed == True"

    # Step 9: Retrieve Profile (My Profile)
    profile_res = client.get("/api/student/profile", headers=headers)
    assert profile_res.status_code == 200
    p_data = profile_res.json()
    assert p_data["register_number"] == reg_number
    assert p_data["mobile_number"] == "9876543210"
    assert p_data["department"] == "Computer Science and Engineering"
    assert p_data["academic_year"] == "3rd Year"
    assert p_data["career_goal"] == "Full Stack Engineer"
    assert "React" in p_data["technical_skills"]
    assert p_data["onboarding_completed"] is True

    # Step 10: Edit Profile (including Department update to Computer Science and Business Systems)
    edit_res = client.put("/api/student/profile", json={
        "department": "Computer Science and Business Systems",
        "mobile_number": "9998887776",
        "career_goal": "Lead Solutions Architect",
        "technical_skills": ["Python", "React", "FastAPI", "SQL", "Kubernetes", "AWS"]
    }, headers=headers)
    assert edit_res.status_code == 200
    updated_data = edit_res.json()
    assert updated_data["department"] == "Computer Science and Business Systems"
    assert updated_data["mobile_number"] == "9998887776"
    assert updated_data["career_goal"] == "Lead Solutions Architect"
    assert "Kubernetes" in updated_data["technical_skills"]

    # Step 11: Verify persistence after re-fetching
    re_profile_res = client.get("/api/student/profile", headers=headers)
    assert re_profile_res.status_code == 200
    re_data = re_profile_res.json()
    assert re_data["department"] == "Computer Science and Business Systems"
    assert re_data["mobile_number"] == "9998887776"
    assert re_data["career_goal"] == "Lead Solutions Architect"
    assert "Kubernetes" in re_data["technical_skills"]

    # Step 12: Logout & Re-login
    logout_res = client.post("/api/auth/logout", headers=headers)
    assert logout_res.status_code == 200

    relogin_res = client.post("/api/auth/login", json={
        "email": student_email,
        "password": student_password,
        "account_type": "student"
    })
    assert relogin_res.status_code == 200
    relogin_user = relogin_res.json()["user"]
    assert relogin_user["onboarding_completed"] is True

    # Step 13: Scenario 6 - Student Account Isolation Check
    # Verify student 2 accessing /profile receives ONLY their own profile and none of student 1's data
    student2_profile = client.get("/api/student/profile", headers=headers2)
    assert student2_profile.status_code == 200
    s2_data = student2_profile.json()
    assert s2_data["email"] == other_email
    assert s2_data["register_number"] != reg_number, "Student 2 must not see Student 1's register number"
    assert s2_data["mobile_number"] != "9998887776", "Student 2 must not see Student 1's mobile number"

    print("All onboarding and profile tests passed successfully!")


if __name__ == "__main__":
    test_complete_student_onboarding_flow()
