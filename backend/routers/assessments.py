"""
routers/assessments.py — Assessment engine: question delivery, submission, scoring.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from pydantic import BaseModel
from datetime import datetime, timezone

from database import get_db
from models.assessment import Assessment, AssessmentQuestion, AssessmentAttempt, AssessmentAnswer, AttemptStatus
from models.skill import StudentSkill
from models.user import StudentProfile
from services.auth_service import get_student_profile
from services.skill_gap_service import compute_blended_level
from services.roadmap_service import recalculate_roadmap_after_assessment
from services.placement_readiness_service import compute_placement_readiness

router = APIRouter(prefix="/assessments", tags=["Assessments"])


import random

class AssessmentOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    difficulty: str
    question_count: int = 10
    time_limit_minutes: int = 15
    skill_id: Optional[int] = None
    category: str = "Engineering"
    pass_percentage: int = 80
    total_questions: int = 10
    question_bank_size: int = 20

    def model_post_init(self, __context: Any) -> None:
        if not self.total_questions:
            self.total_questions = self.question_count

    class Config:
        from_attributes = True


class QuestionOut(BaseModel):
    id: int
    question_text: str
    options: list
    difficulty: str
    order: int
    # Note: correct_answer NOT included — sent only after submission


class AttemptStart(BaseModel):
    pass  # No body needed


class AnswerSubmit(BaseModel):
    question_id: int
    selected_answer: str
    time_taken_seconds: Optional[int] = None


class AttemptSubmit(BaseModel):
    attempt_id: Optional[int] = None
    answers: List[AnswerSubmit]


class AttemptResult(BaseModel):
    attempt_id: int
    score: float
    raw_score: int
    incorrect_count: int = 0
    total_questions: int
    passed: bool = False
    skill_updated: bool
    roadmap_updated: bool
    per_question: list


@router.get("/", response_model=List[AssessmentOut])
def list_assessments(db: Session = Depends(get_db), _=Depends(get_student_profile)):
    assessments = db.query(Assessment).filter(Assessment.is_active == True).all()
    results = []
    for a in assessments:
        bank_size = len(a.questions) if a.questions else 20
        results.append(AssessmentOut(
            id=a.id,
            title=a.title,
            description=a.description,
            difficulty=a.difficulty,
            question_count=a.question_count or 10,
            time_limit_minutes=a.time_limit_minutes or 15,
            skill_id=a.skill_id,
            category="Engineering",
            pass_percentage=80,
            total_questions=a.question_count or 10,
            question_bank_size=bank_size,
        ))
    return results


@router.get("/history")
def assessment_history(db: Session = Depends(get_db), profile: StudentProfile = Depends(get_student_profile)):
    attempts = db.query(AssessmentAttempt).filter(
        AssessmentAttempt.student_id == profile.id,
        AssessmentAttempt.status == AttemptStatus.completed,
    ).order_by(AssessmentAttempt.completed_at.desc()).limit(50).all()

    return [{
        "attempt_id": a.id,
        "assessment_id": a.assessment_id,
        "assessment_title": a.assessment.title if a.assessment else "Unknown",
        "score": a.score,
        "completed_at": a.completed_at,
    } for a in attempts]


@router.get("/{assessment_id}", response_model=AssessmentOut)
def get_assessment(assessment_id: int, db: Session = Depends(get_db), _=Depends(get_student_profile)):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    bank_size = len(assessment.questions) if assessment.questions else 20
    return AssessmentOut(
        id=assessment.id,
        title=assessment.title,
        description=assessment.description,
        difficulty=assessment.difficulty,
        question_count=assessment.question_count or 10,
        time_limit_minutes=assessment.time_limit_minutes or 15,
        skill_id=assessment.skill_id,
        category="Engineering",
        pass_percentage=80,
        total_questions=assessment.question_count or 10,
        question_bank_size=bank_size,
    )


@router.post("/{assessment_id}/start")
def start_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id, Assessment.is_active == True).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Check if student already has an active in_progress attempt for this assessment
    existing_attempt = db.query(AssessmentAttempt).filter(
        AssessmentAttempt.student_id == profile.id,
        AssessmentAttempt.assessment_id == assessment_id,
        AssessmentAttempt.status == AttemptStatus.in_progress,
    ).order_by(AssessmentAttempt.started_at.desc()).first()

    if existing_attempt:
        attempt = existing_attempt
        # Fetch the questions assigned to this existing attempt to keep them stable
        existing_answers = db.query(AssessmentAnswer).filter(
            AssessmentAnswer.attempt_id == attempt.id
        ).order_by(AssessmentAnswer.id).all()

        saved_answers = {}
        if existing_answers:
            q_ids = [ans.question_id for ans in existing_answers]
            q_map = {q.id: q for q in db.query(AssessmentQuestion).filter(AssessmentQuestion.id.in_(q_ids)).all()}
            questions = [q_map[qid] for qid in q_ids if qid in q_map]
            saved_answers = {ans.question_id: ans.selected_answer for ans in existing_answers if ans.selected_answer}
        else:
            all_questions = db.query(AssessmentQuestion).filter(
                AssessmentQuestion.assessment_id == assessment_id
            ).all()
            k = min(len(all_questions), assessment.question_count or 10)
            questions = random.sample(all_questions, k)
            for q in questions:
                db.add(AssessmentAnswer(attempt_id=attempt.id, question_id=q.id, selected_answer=None))
            db.commit()
    else:
        # Create a new attempt with randomly selected 10 questions
        all_questions = db.query(AssessmentQuestion).filter(
            AssessmentQuestion.assessment_id == assessment_id
        ).all()
        if not all_questions:
            raise HTTPException(status_code=400, detail="No questions available for this assessment")

        k = min(len(all_questions), assessment.question_count or 10)
        selected_questions = random.sample(all_questions, k)

        attempt = AssessmentAttempt(
            student_id=profile.id,
            assessment_id=assessment_id,
            status=AttemptStatus.in_progress,
            total_questions=k,
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

        # Lock in the selected questions
        for q in selected_questions:
            db.add(AssessmentAnswer(attempt_id=attempt.id, question_id=q.id, selected_answer=None))
        db.commit()
        questions = selected_questions
        saved_answers = {}

    return {
        "attempt_id": attempt.id,
        "assessment_id": assessment_id,
        "title": assessment.title,
        "time_limit_minutes": assessment.time_limit_minutes or 15,
        "total_questions": len(questions),
        "saved_answers": saved_answers,
        "questions": [QuestionOut(
            id=q.id,
            question_text=q.question_text,
            options=q.options,
            difficulty=q.difficulty,
            order=idx + 1,
        ) for idx, q in enumerate(questions)],
    }


@router.post("/{assessment_id}/submit", response_model=AttemptResult)
def submit_assessment(
    assessment_id: int,
    payload: AttemptSubmit,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    attempt = None
    if payload.attempt_id:
        attempt = db.query(AssessmentAttempt).filter(
            AssessmentAttempt.id == payload.attempt_id,
            AssessmentAttempt.student_id == profile.id,
            AssessmentAttempt.assessment_id == assessment_id,
        ).first()

    if not attempt:
        attempt = db.query(AssessmentAttempt).filter(
            AssessmentAttempt.student_id == profile.id,
            AssessmentAttempt.assessment_id == assessment_id,
            AssessmentAttempt.status == AttemptStatus.in_progress,
        ).order_by(AssessmentAttempt.started_at.desc()).first()

    if not attempt:
        raise HTTPException(status_code=400, detail="No active attempt found. Call /start first.")

    if attempt.status == AttemptStatus.completed:
        raise HTTPException(status_code=400, detail="This assessment attempt has already been submitted.")

    # Fetch assigned questions from AssessmentAnswer if pre-locked
    assigned_answers = db.query(AssessmentAnswer).filter(
        AssessmentAnswer.attempt_id == attempt.id
    ).all()
    assigned_q_ids = [a.question_id for a in assigned_answers]

    # Map student answers
    submitted_answers_map = {
        ans.question_id: ans for ans in payload.answers
    }

    if assigned_q_ids:
        target_q_ids = assigned_q_ids
    else:
        target_q_ids = list(submitted_answers_map.keys())

    # Query questions
    questions = db.query(AssessmentQuestion).filter(
        AssessmentQuestion.id.in_(target_q_ids),
        AssessmentQuestion.assessment_id == assessment_id,
    ).all()
    q_map = {q.id: q for q in questions}

    correct_count = 0
    per_question_results = []

    for q_id in target_q_ids:
        question = q_map.get(q_id)
        if not question:
            continue

        ans_payload = submitted_answers_map.get(q_id)
        selected_answer = ans_payload.selected_answer.strip().lower() if ans_payload and ans_payload.selected_answer else ""
        correct_answer = question.correct_answer.strip().lower()
        is_correct = (selected_answer == correct_answer) if selected_answer else False

        if is_correct:
            correct_count += 1

        # Save or update AssessmentAnswer
        existing_ans = next((a for a in assigned_answers if a.question_id == q_id), None)
        if existing_ans:
            existing_ans.selected_answer = selected_answer
            existing_ans.is_correct = is_correct
            existing_ans.time_taken_seconds = ans_payload.time_taken_seconds if ans_payload else None
        else:
            new_ans = AssessmentAnswer(
                attempt_id=attempt.id,
                question_id=q_id,
                selected_answer=selected_answer,
                is_correct=is_correct,
                time_taken_seconds=ans_payload.time_taken_seconds if ans_payload else None,
            )
            db.add(new_ans)

        per_question_results.append({
            "question_id": question.id,
            "question_text": question.question_text,
            "selected_answer": selected_answer,
            "correct_answer": question.correct_answer,
            "is_correct": is_correct,
            "explanation": question.explanation,
        })

    total = len(target_q_ids) or attempt.total_questions or 10
    score = (correct_count / total * 100) if total > 0 else 0.0
    passed = (score >= 80.0)

    attempt.score = round(score, 1)
    attempt.raw_score = correct_count
    attempt.total_questions = total
    attempt.status = AttemptStatus.completed
    attempt.completed_at = datetime.now(timezone.utc)
    db.commit()

    # Update student skill level only according to existing SkillNova verification rules
    skill_updated = False
    roadmap_updated = False
    if assessment.skill_id:
        ss = db.query(StudentSkill).filter(
            StudentSkill.student_id == profile.id,
            StudentSkill.skill_id == assessment.skill_id,
        ).first()
        if ss:
            ss.assessed_level = score
            ss.evidence_count = (ss.evidence_count or 0) + 1
            ss.blended_level = compute_blended_level(ss.self_rating, score, ss.evidence_count)
        else:
            ss = StudentSkill(
                student_id=profile.id,
                skill_id=assessment.skill_id,
                self_rating=score * 0.7,
                assessed_level=score,
                blended_level=compute_blended_level(score * 0.7, score, 1),
                evidence_count=1,
            )
            db.add(ss)
        db.commit()
        skill_updated = True

        # Trigger cascade: gap → roadmap → placement readiness
        from services.skill_gap_service import compute_gap_for_student
        compute_gap_for_student(db, profile)
        recalculate_roadmap_after_assessment(db, profile, assessment_id, score)
        compute_placement_readiness(db, profile)
        roadmap_updated = True

        # Early warning check
        _check_early_warning(db, profile, assessment.skill_id, score)

    return AttemptResult(
        attempt_id=attempt.id,
        score=round(score, 1),
        raw_score=correct_count,
        incorrect_count=total - correct_count,
        total_questions=total,
        passed=passed,
        skill_updated=skill_updated,
        roadmap_updated=roadmap_updated,
        per_question=per_question_results,
    )


def _check_early_warning(db, profile: StudentProfile, skill_id: int, latest_score: float):
    """Fires early warning notification if last 3 assessments for this skill are declining."""
    from models.assessment import AssessmentAttempt, AttemptStatus, Assessment
    from models.notification import Notification

    recent = (
        db.query(AssessmentAttempt)
        .join(Assessment, AssessmentAttempt.assessment_id == Assessment.id)
        .filter(
            AssessmentAttempt.student_id == profile.id,
            Assessment.skill_id == skill_id,
            AssessmentAttempt.status == AttemptStatus.completed,
        )
        .order_by(AssessmentAttempt.completed_at.desc())
        .limit(3)
        .all()
    )

    if len(recent) < 3:
        return

    scores = [a.score for a in recent if a.score is not None]
    if len(scores) >= 3 and scores[0] < scores[1] < scores[2]:
        # Declining trend — create notification
        notif = Notification(
            user_id=profile.user_id,
            type="early_warning",
            title="⚠️ Skill Trend Alert",
            body=f"Your scores on this skill have been declining for 3 consecutive attempts. Consider requesting mentor help or scheduling a revision session.",
            action_url="/roadmap",
        )
        db.add(notif)
        db.commit()
