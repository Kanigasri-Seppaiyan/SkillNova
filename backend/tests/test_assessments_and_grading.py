"""
tests/test_assessments_and_grading.py — Tests for assessment listing, starting attempts, grading MCQ submissions, and score calculations.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app
from models.user import User, UserRole, StudentProfile
from models.skill import Skill, SkillCategory, StudentSkill
from models.assessment import Assessment, AssessmentQuestion, AssessmentAttempt, AssessmentAnswer, AttemptStatus
from services.auth_service import hash_password, create_access_token

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_assessments.db"
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
    db.query(AssessmentAnswer).delete()
    db.query(AssessmentAttempt).delete()
    db.query(AssessmentQuestion).delete()
    db.query(Assessment).delete()
    db.query(StudentSkill).delete()
    db.query(Skill).delete()
    db.query(StudentProfile).delete()
    db.query(User).delete()
    db.commit()
    db.close()

    yield

    db = TestingSessionLocal()
    db.query(AssessmentAnswer).delete()
    db.query(AssessmentAttempt).delete()
    db.query(AssessmentQuestion).delete()
    db.query(Assessment).delete()
    db.query(StudentSkill).delete()
    db.query(Skill).delete()
    db.query(StudentProfile).delete()
    db.query(User).delete()
    db.commit()
    db.close()


@pytest.fixture
def student_fixture():
    db = TestingSessionLocal()
    user = User(
        email="assessment_student@bitsathy.ac.in",
        password_hash=hash_password("Password123!"),
        role=UserRole.student,
        is_active=True,
    )
    db.add(user)
    db.flush()

    profile = StudentProfile(
        user_id=user.id,
        name="Assessment Student",
        target_role="Frontend Engineer",
        onboarding_completed=True,
    )
    db.add(profile)

    skill = Skill(name="TypeScript", category=SkillCategory.technical)
    db.add(skill)
    db.flush()

    student_skill = StudentSkill(
        student_id=profile.id,
        skill_id=skill.id,
        self_rating=60.0,
    )
    db.add(student_skill)

    assessment = Assessment(
        title="TypeScript Core Principles",
        description="MCQ test for basic and intermediate TypeScript",
        difficulty="medium",
        question_count=2,
        time_limit_minutes=15,
        skill_id=skill.id,
        is_active=True,
    )
    db.add(assessment)
    db.flush()

    q1 = AssessmentQuestion(
        assessment_id=assessment.id,
        question_text="What is the keyword used to create a union type in TypeScript?",
        options=[{"id": "a", "text": "&"}, {"id": "b", "text": "|"}, {"id": "c", "text": "^"}],
        correct_answer="b",
        explanation="The pipe operator | is used for union types.",
        difficulty="easy",
        order=1,
    )
    q2 = AssessmentQuestion(
        assessment_id=assessment.id,
        question_text="Which utility type makes all properties in T optional?",
        options=[{"id": "a", "text": "Partial<T>"}, {"id": "b", "text": "Required<T>"}, {"id": "c", "text": "Readonly<T>"}],
        correct_answer="a",
        explanation="Partial<T> makes all properties optional.",
        difficulty="medium",
        order=2,
    )
    db.add_all([q1, q2])
    db.commit()

    token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role.value})
    headers = {"Authorization": f"Bearer {token}"}
    assessment_id = assessment.id
    q1_id = q1.id
    q2_id = q2.id
    student_id = profile.id
    db.close()

    return {
        "headers": headers,
        "assessment_id": assessment_id,
        "q1_id": q1_id,
        "q2_id": q2_id,
        "student_id": student_id,
    }


def test_list_and_get_assessments(student_fixture):
    client = TestClient(app)
    headers = student_fixture["headers"]
    assessment_id = student_fixture["assessment_id"]

    resp = client.get("/assessments/", headers=headers)
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    assert items[0]["title"] == "TypeScript Core Principles"

    resp_single = client.get(f"/assessments/{assessment_id}", headers=headers)
    assert resp_single.status_code == 200
    data = resp_single.json()
    assert data["id"] == assessment_id
    assert data["time_limit_minutes"] == 15


def test_start_and_submit_assessment_full_score(student_fixture):
    client = TestClient(app)
    headers = student_fixture["headers"]
    assessment_id = student_fixture["assessment_id"]
    q1_id = student_fixture["q1_id"]
    q2_id = student_fixture["q2_id"]

    # Start assessment
    start_resp = client.post(f"/assessments/{assessment_id}/start", headers=headers)
    assert start_resp.status_code == 200
    start_data = start_resp.json()
    assert start_data["attempt_id"] is not None
    assert len(start_data["questions"]) == 2
    # Verify correct_answer is omitted during quiz take
    assert "correct_answer" not in start_data["questions"][0]

    # Submit 100% correct answers
    submit_payload = {
        "answers": [
            {"question_id": q1_id, "selected_answer": "b", "time_taken_seconds": 15},
            {"question_id": q2_id, "selected_answer": "a", "time_taken_seconds": 25},
        ]
    }
    submit_resp = client.post(f"/assessments/{assessment_id}/submit", json=submit_payload, headers=headers)
    assert submit_resp.status_code == 200
    result = submit_resp.json()
    assert result["score"] == 100.0
    assert result["raw_score"] == 2
    assert result["total_questions"] == 2
    assert result["skill_updated"] is True

    # Verify history
    hist_resp = client.get("/assessments/history", headers=headers)
    assert hist_resp.status_code == 200
    history = hist_resp.json()
    assert len(history) == 1
    assert history[0]["score"] == 100.0


def test_submit_partial_score(student_fixture):
    client = TestClient(app)
    headers = student_fixture["headers"]
    assessment_id = student_fixture["assessment_id"]
    q1_id = student_fixture["q1_id"]
    q2_id = student_fixture["q2_id"]

    client.post(f"/assessments/{assessment_id}/start", headers=headers)

    # 1 correct (q1 -> 'b'), 1 incorrect (q2 -> 'c' instead of 'a')
    submit_payload = {
        "answers": [
            {"question_id": q1_id, "selected_answer": "b", "time_taken_seconds": 10},
            {"question_id": q2_id, "selected_answer": "c", "time_taken_seconds": 12},
        ]
    }
    submit_resp = client.post(f"/assessments/{assessment_id}/submit", json=submit_payload, headers=headers)
    assert submit_resp.status_code == 200
    result = submit_resp.json()
    assert result["score"] == 50.0
    assert result["raw_score"] == 1
    assert result["incorrect_count"] == 1
    assert result["total_questions"] == 2
    assert result["passed"] is False  # 50% < 80%


def test_question_bank_random_selection_and_stability(student_fixture):
    client = TestClient(app)
    headers = student_fixture["headers"]
    assessment_id = student_fixture["assessment_id"]

    # Add 20 questions to this assessment in the test database
    db = TestingSessionLocal()
    db.query(AssessmentAnswer).delete()
    db.query(AssessmentAttempt).delete()
    db.query(AssessmentQuestion).delete()

    ass = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    ass.question_count = 10

    created_ids = []
    for i in range(20):
        q = AssessmentQuestion(
            assessment_id=assessment_id,
            question_text=f"Question {i + 1} statement?",
            options=[{"id": "a", "text": "Opt A"}, {"id": "b", "text": "Opt B"}, {"id": "c", "text": "Opt C"}, {"id": "d", "text": "Opt D"}],
            correct_answer="a" if i % 2 == 0 else "b",
            explanation=f"Explanation for question {i + 1}",
            difficulty="medium",
            order=i + 1,
        )
        db.add(q)
        db.flush()
        created_ids.append(q.id)
    db.commit()
    db.close()

    # 1. Start assessment -> should pick exactly 10 questions from the 20 available
    resp1 = client.post(f"/assessments/{assessment_id}/start", headers=headers)
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert len(data1["questions"]) == 10
    attempt_id_1 = data1["attempt_id"]
    q_ids_1 = [q["id"] for q in data1["questions"]]
    # Verify all selected question IDs are subset of the 20 questions
    assert all(qid in created_ids for qid in q_ids_1)
    # Verify correct_answer and explanation are NOT leaked before submission
    assert "correct_answer" not in data1["questions"][0]
    assert "explanation" not in data1["questions"][0]

    # 2. Call start again (simulating page refresh during active attempt) -> must return same attempt and questions
    resp2 = client.post(f"/assessments/{assessment_id}/start", headers=headers)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["attempt_id"] == attempt_id_1
    q_ids_2 = [q["id"] for q in data2["questions"]]
    assert q_ids_1 == q_ids_2, "Questions must remain stable across page refreshes during an attempt!"

    # 3. Submit 8 correct answers out of 10 -> 80.0% -> passed=True
    answers_payload = []
    for idx, q_id in enumerate(q_ids_1):
        # Even index answers correctly ('a' or 'b'), odd index answers incorrectly for last 2
        correct = "a" if (created_ids.index(q_id) % 2 == 0) else "b"
        if idx < 8:
            answers_payload.append({"question_id": q_id, "selected_answer": correct})
        else:
            answers_payload.append({"question_id": q_id, "selected_answer": "d"})  # wrong answer

    sub_resp = client.post(
        f"/assessments/{assessment_id}/submit",
        json={"attempt_id": attempt_id_1, "answers": answers_payload},
        headers=headers,
    )
    assert sub_resp.status_code == 200
    sub_data = sub_resp.json()
    assert sub_data["total_questions"] == 10
    assert sub_data["raw_score"] == 8
    assert sub_data["incorrect_count"] == 2
    assert sub_data["score"] == 80.0
    assert sub_data["passed"] is True
    # Verify per_question contains explanation and correct_answer
    assert len(sub_data["per_question"]) == 10
    assert "explanation" in sub_data["per_question"][0]
    assert "correct_answer" in sub_data["per_question"][0]

    # 4. Attempt to submit again -> must return 400 (prevent multiple submissions for same attempt)
    dup_resp = client.post(
        f"/assessments/{assessment_id}/submit",
        json={"attempt_id": attempt_id_1, "answers": answers_payload},
        headers=headers,
    )
    assert dup_resp.status_code == 400
    assert "already been submitted" in dup_resp.json()["detail"].lower()

