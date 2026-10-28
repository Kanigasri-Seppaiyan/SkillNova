"""
routers/skill_gaps.py — Skill gap retrieval and on-demand reanalysis.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models.skill_gap import SkillGap
from models.user import StudentProfile
from services.auth_service import get_student_profile
from services.skill_gap_service import compute_gap_for_student

router = APIRouter(prefix="/skill-gaps", tags=["Skill Gaps"])


class SkillGapOut(BaseModel):
    id: int
    skill_id: int
    skill_name: str
    gap_value: float
    priority: str
    breakdown: Optional[dict]

    class Config:
        from_attributes = True


@router.get("/", response_model=List[SkillGapOut])
def get_skill_gaps(
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    gaps = db.query(SkillGap).filter(SkillGap.student_id == profile.id).all()
    return [
        SkillGapOut(
            id=g.id,
            skill_id=g.skill_id,
            skill_name=g.skill.name if g.skill else f"Skill {g.skill_id}",
            gap_value=g.gap_value,
            priority=g.priority.value,
            breakdown=g.breakdown,
        )
        for g in sorted(gaps, key=lambda x: -x.gap_value)
    ]


@router.post("/analyze")
def analyze_gaps(
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    """Re-runs gap computation from scratch and returns updated results."""
    gaps = compute_gap_for_student(db, profile)
    return {
        "message": f"Analyzed {len(gaps)} skill gaps",
        "gaps": [
            {
                "skill_id": g.skill_id,
                "skill_name": g.skill.name if g.skill else f"Skill {g.skill_id}",
                "gap_value": g.gap_value,
                "priority": g.priority.value,
                "breakdown": g.breakdown,
            }
            for g in sorted(gaps, key=lambda x: -x.gap_value)
        ],
    }
