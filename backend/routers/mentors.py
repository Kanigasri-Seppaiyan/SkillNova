"""
routers/mentors.py — Mentor discovery, match requests, and feedback.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone

from database import get_db
from models.mentor import MentorMatch, MentorFeedback, MatchStatus
from models.user import StudentProfile, MentorProfile, User
from models.notification import Notification
from services.auth_service import get_student_profile, get_current_user
from services.mentor_matching_service import get_recommended_mentors, score_mentor_for_student, _get_weights

router = APIRouter(prefix="/mentors", tags=["Mentors"])


class MentorRequestBody(BaseModel):
    message: Optional[str] = None


class FeedbackBody(BaseModel):
    rating: int
    comment: Optional[str] = None
    session_count: Optional[int] = None


@router.get("/")
def list_mentors(db: Session = Depends(get_db), _=Depends(get_current_user)):
    mentors = db.query(MentorProfile).join(User).filter(
        User.is_active == True,
        MentorProfile.status == "approved"
    ).all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "bio": m.bio,
            "domain": m.domain,
            "years_experience": m.years_experience,
            "availability_hours_per_week": m.availability_hours_per_week,
        }
        for m in mentors
    ]


@router.get("/recommended")
def get_recommended(
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    results = get_recommended_mentors(db, profile, limit=5)
    recommendations = []
    for r in results:
        raw_score = float(r["match_score"]) if r.get("match_score") is not None else 85.0
        pct = round(raw_score) if raw_score > 1.0 else round(raw_score * 100)
        pct = max(0, min(100, pct))

        reasons = []
        breakdown = r.get("breakdown") or {}
        scores = breakdown.get("scores") or {}
        label_map = {
            "skill_match": "Technical skill & gap alignment",
            "career_match": "Career goal & aspiration fit",
            "domain_match": "Domain & engineering discipline match",
            "availability": "Weekly mentorship availability",
            "experience": "Senior industry experience",
            "preference": "Mentorship track alignment",
        }
        if isinstance(scores, dict):
            top_dims = sorted(
                [(k, v) for k, v in scores.items() if isinstance(v, (int, float)) and v > 0],
                key=lambda x: x[1],
                reverse=True
            )
            for k, val in top_dims[:3]:
                label = label_map.get(k, k.replace("_", " ").title())
                reasons.append(f"{label} ({round(val)}%)")

        if not reasons:
            reasons = ["Domain & curriculum alignment", "Active mentor capacity"]

        recommendations.append({
            "mentor_id": r["mentor"].id,
            "name": r["mentor"].name,
            "bio": r["mentor"].bio,
            "domain": r["mentor"].domain,
            "years_experience": r["mentor"].years_experience,
            "match_score": pct,
            "match_percentage": pct,
            "match_reasons": reasons,
            "breakdown": r["breakdown"],
        })

    return {"recommendations": recommendations}


@router.post("/{mentor_id}/request", status_code=201)
def request_mentor(
    mentor_id: int,
    payload: MentorRequestBody,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    mentor = db.query(MentorProfile).filter(MentorProfile.id == mentor_id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")

    # Check for existing pending request
    existing = db.query(MentorMatch).filter(
        MentorMatch.student_id == profile.id,
        MentorMatch.mentor_id == mentor_id,
        MentorMatch.status == MatchStatus.pending,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A pending request already exists for this mentor")

    weights = _get_weights(db)
    match_result = score_mentor_for_student(db, profile, mentor, weights)

    match = MentorMatch(
        student_id=profile.id,
        mentor_id=mentor_id,
        match_score=match_result["total"],
        breakdown=match_result,
        status=MatchStatus.pending,
        student_message=payload.message,
    )
    db.add(match)
    db.flush()

    # Notify the mentor
    notif = Notification(
        user_id=mentor.user_id,
        type="mentor_request",
        title="📬 New Mentorship Request",
        body=f"{profile.name} has requested you as a mentor.",
        action_url="/mentor/dashboard",
        meta_data={"match_id": match.id, "student_name": profile.name},
    )
    db.add(notif)
    db.commit()

    return {"message": "Request sent", "match_id": match.id, "match_score": match_result["total"]}


@router.get("/matches")
def get_my_matches(
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    matches = db.query(MentorMatch).filter(MentorMatch.student_id == profile.id).all()
    return [
        {
            "match_id": m.id,
            "mentor_id": m.mentor_id,
            "mentor_name": m.mentor.name if m.mentor else None,
            "match_score": m.match_score,
            "breakdown": m.breakdown,
            "status": m.status.value,
            "requested_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in matches
    ]


@router.post("/matches/{match_id}/feedback", status_code=201)
def submit_feedback(
    match_id: int,
    payload: FeedbackBody,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    match = db.query(MentorMatch).filter(
        MentorMatch.id == match_id,
        MentorMatch.student_id == profile.id,
    ).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    fb = MentorFeedback(
        match_id=match_id,
        given_by_role="student",
        rating=payload.rating,
        comment=payload.comment,
        session_count=payload.session_count or 0,
    )
    db.add(fb)
    db.commit()
    return {"message": "Feedback submitted"}
