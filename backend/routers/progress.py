"""
routers/progress.py — Weekly progress tracking and trend data.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import datetime

from database import get_db
from models.progress import WeeklyProgress
from models.user import StudentProfile
from services.auth_service import get_student_profile
from services.placement_readiness_service import compute_placement_readiness

router = APIRouter(prefix="/progress", tags=["Progress"])


@router.get("/")
def get_progress_summary(
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    """Returns current week progress summary."""
    today = datetime.date.today()
    week_start = today - datetime.timedelta(days=today.weekday())

    wp = db.query(WeeklyProgress).filter(
        WeeklyProgress.student_id == profile.id,
        WeeklyProgress.week_start == week_start,
    ).first()

    return {
        "week_start": week_start.isoformat(),
        "assessments_taken": wp.assessments_taken if wp else 0,
        "skills_improved": wp.skills_improved if wp else 0,
        "roadmap_items_completed": wp.roadmap_items_completed if wp else 0,
        "readiness_score": wp.readiness_score if wp else None,
    }


@router.get("/weekly")
def get_weekly_trend(
    weeks: int = 8,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    """Returns the last N weeks of progress for trend charts."""
    progress = (
        db.query(WeeklyProgress)
        .filter(WeeklyProgress.student_id == profile.id)
        .order_by(WeeklyProgress.week_start.desc())
        .limit(weeks)
        .all()
    )

    return {
        "weeks": [
            {
                "week_start": p.week_start.isoformat(),
                "readiness_score": p.readiness_score,
                "assessments_taken": p.assessments_taken,
                "skills_improved": p.skills_improved,
                "roadmap_items_completed": p.roadmap_items_completed,
            }
            for p in reversed(progress)
        ]
    }


@router.post("/snapshot")
def take_weekly_snapshot(
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    """Saves a weekly progress snapshot (called at end of week or manually)."""
    readiness = compute_placement_readiness(db, profile)
    today = datetime.date.today()
    week_start = today - datetime.timedelta(days=today.weekday())

    wp = db.query(WeeklyProgress).filter(
        WeeklyProgress.student_id == profile.id,
        WeeklyProgress.week_start == week_start,
    ).first()

    if wp:
        wp.readiness_score = readiness.overall_score
        wp.updated_at = datetime.datetime.now(datetime.timezone.utc)
    else:
        wp = WeeklyProgress(
            student_id=profile.id,
            week_start=week_start,
            readiness_score=readiness.overall_score,
        )
        db.add(wp)

    db.commit()
    return {"message": "Snapshot saved", "readiness_score": readiness.overall_score}
