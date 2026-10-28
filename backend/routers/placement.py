"""
routers/placement.py — Placement readiness score + breakdown.
Supports GET /placement/readiness and /api/placement/readiness.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.placement import PlacementReadiness
from models.user import StudentProfile
from services.auth_service import get_student_profile
from services.placement_readiness_service import compute_placement_readiness

router = APIRouter(prefix="/placement", tags=["Placement Readiness"])
legacy_router = APIRouter(prefix="/placement-readiness", tags=["Placement Readiness"])


def format_readiness_response(record: PlacementReadiness):
    if not record:
        return {
            "overall_score": 0,
            "skills_score": 0,
            "assessments_score": 0,
            "projects_score": 0,
            "consistency_score": 0,
            "mentor_score": 0,
            "resume_score": 0,
            "mock_interview_score": 0,
            "limiter_reason": "Complete assessments to identify limiters",
            "readiness_tier": "Beginning",
            "recommendations": ["Complete your first skill assessment to unlock recommendations."],
            "breakdown": None,
            "computed_at": None,
        }

    overall = record.overall_score or 0
    tier = "Beginning"
    if overall >= 80:
        tier = "Ready"
    elif overall >= 70:
        tier = "Almost Ready"
    elif overall >= 50:
        tier = "Needs Work"

    breakdown_data = record.breakdown or {}
    scores = breakdown_data.get("scores", {}) if isinstance(breakdown_data, dict) else {}
    limiting_factors = breakdown_data.get("limiting_factors", []) if isinstance(breakdown_data, dict) else []

    limiter_reason = "Mock Interview & Technical Assessment scores are below baseline"
    if limiting_factors:
        factors_names = [f.get("factor", "").replace("_", " ").title() for f in limiting_factors[:2] if isinstance(f, dict)]
        if factors_names:
            limiter_reason = f"{' & '.join(factors_names)} scores are below baseline"

    recs = [
        "Complete higher difficulty assessments in weak areas",
        "Build portfolio projects targeting critical gaps",
        "Schedule a mock interview session with an assigned mentor"
    ]

    return {
        "overall_score": overall,
        "skills_score": round(scores.get("technical_skills", 70.0)),
        "assessments_score": round(scores.get("assessments", 65.0)),
        "projects_score": round(scores.get("projects", 75.0)),
        "consistency_score": round(scores.get("consistency", 80.0)),
        "mentor_score": round(scores.get("communication", 60.0)),
        "resume_score": round(scores.get("resume", 70.0)),
        "mock_interview_score": round(scores.get("dsa", 65.0)),
        "limiter_reason": limiter_reason,
        "readiness_tier": tier,
        "recommendations": recs,
        "breakdown": record.breakdown,
        "computed_at": record.computed_at.isoformat() if record.computed_at else None,
    }


@router.get("/readiness")
@router.get("/")
@legacy_router.get("/")
def get_placement_readiness(
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    record = db.query(PlacementReadiness).filter(PlacementReadiness.student_id == profile.id).first()
    if not record:
        record = compute_placement_readiness(db, profile)
    return format_readiness_response(record)


@router.get("/limiter-explanation")
def get_limiter_explanation(
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    record = db.query(PlacementReadiness).filter(PlacementReadiness.student_id == profile.id).first()
    if not record:
        record = compute_placement_readiness(db, profile)
    res = format_readiness_response(record)
    return {"limiter_reason": res["limiter_reason"]}


@router.post("/recalculate")
@legacy_router.post("/recalculate")
def recalculate_readiness(
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    record = compute_placement_readiness(db, profile)
    return {
        "message": "Placement readiness recalculated",
        **format_readiness_response(record)
    }
