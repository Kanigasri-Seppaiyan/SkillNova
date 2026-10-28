"""
routers/skills.py — Skill catalog management and gap analysis.
Supports GET /skills/gap-analysis and /api/skills/gap-analysis.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Any, Dict
from pydantic import BaseModel

from database import get_db
from models.skill import Skill, SkillCategory, StudentSkill
from models.skill_gap import SkillGap, GapPriority
from models.user import StudentProfile
from services.auth_service import get_current_user, get_student_profile
from services.skill_gap_service import compute_gap_for_student

router = APIRouter(prefix="/skills", tags=["Skills"])


class SkillOut(BaseModel):
    id: int
    name: str
    domain: Optional[str] = None
    category: str
    description: Optional[str] = None
    icon: Optional[str] = None

    class Config:
        from_attributes = True


class SelfRatePayload(BaseModel):
    skill_id: int
    rating: float


def build_gap_analysis_response(db: Session, profile: StudentProfile) -> Dict[str, Any]:
    gaps = db.query(SkillGap).filter(SkillGap.student_id == profile.id).all()
    if not gaps:
        gaps = compute_gap_for_student(db, profile)

    # If still no gaps (e.g. no active career goal yet), synthesize from catalog skills
    if not gaps:
        catalog_skills = db.query(Skill).limit(6).all()
        gap_list = []
        for s in catalog_skills:
            gap_list.append({
                "skill_id": s.id,
                "skill_name": s.name,
                "category": s.category.value if hasattr(s.category, "value") else str(s.category),
                "required_level": 4.0,
                "current_level": 2.5,
                "gap_amount": 1.5,
                "gap_percentage": 37,
                "impact_on_readiness": 10,
                "status": "moderate",
                "priority": "medium",
                "breakdown": None,
            })
        top = gap_list[0] if gap_list else None
        return {
            "overall_gap_percentage": 30,
            "met_skills_count": 0,
            "total_skills_count": len(gap_list),
            "gaps": gap_list,
            "top_priority_skill": top,
        }

    gap_list = []
    for g in gaps:
        breakdown = g.breakdown or {}
        req_level = float(breakdown.get("required_level", 4.0)) if isinstance(breakdown, dict) else 4.0
        blended = float(breakdown.get("blended_level", max(0.0, req_level - g.gap_value))) if isinstance(breakdown, dict) else max(0.0, req_level - g.gap_value)
        gap_amt = round(float(g.gap_value), 2)
        gap_pct = round((gap_amt / max(req_level, 1.0)) * 100) if req_level > 0 else 0

        if gap_amt == 0:
            status_str = "met"
        elif gap_amt >= 30 or gap_pct >= 40:
            status_str = "critical"
        elif gap_amt >= 15 or gap_pct >= 20:
            status_str = "moderate"
        else:
            status_str = "minor"

        impact = max(2, min(20, round(gap_amt * 2)))

        gap_list.append({
            "skill_id": g.skill_id,
            "skill_name": g.skill.name if g.skill else f"Skill {g.skill_id}",
            "category": g.skill.category.value if (g.skill and hasattr(g.skill.category, "value")) else "Technical",
            "required_level": req_level,
            "current_level": blended,
            "gap_amount": gap_amt,
            "gap_percentage": gap_pct,
            "impact_on_readiness": impact,
            "status": status_str,
            "priority": g.priority.value if hasattr(g.priority, "value") else str(g.priority),
            "breakdown": g.breakdown,
        })

    gap_list.sort(key=lambda x: -x["gap_amount"])
    met_count = sum(1 for item in gap_list if item["status"] == "met" or item["gap_amount"] == 0)
    total_count = len(gap_list)
    overall_gap_pct = round(sum(item["gap_percentage"] for item in gap_list) / max(total_count, 1))
    top_priority = gap_list[0] if gap_list else None

    return {
        "overall_gap_percentage": overall_gap_pct,
        "met_skills_count": met_count,
        "total_skills_count": total_count,
        "gaps": gap_list,
        "top_priority_skill": top_priority,
    }


@router.get("/gap-analysis")
def get_gap_analysis(
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    return build_gap_analysis_response(db, profile)


@router.get("/catalog", response_model=List[SkillOut])
@router.get("/", response_model=List[SkillOut])
def list_skills(
    domain: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Skill)
    if domain:
        q = q.filter(Skill.domain.ilike(f"%{domain}%"))
    if category:
        q = q.filter(Skill.category == category)
    return q.all()


@router.get("/my-skills")
def get_my_skills(
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    student_skills = db.query(StudentSkill).filter(StudentSkill.student_id == profile.id).all()
    return [
        {
            "id": s.id,
            "user_id": profile.user_id,
            "skill_id": s.skill_id,
            "skill": {
                "id": s.skill.id,
                "name": s.skill.name,
                "category": s.skill.category.value if hasattr(s.skill.category, "value") else str(s.skill.category)
            } if s.skill else None,
            "self_rating": s.self_rating,
            "assessment_score": s.assessed_level or 0,
            "verified_level": round(s.blended_level),
            "blended_level": s.blended_level,
            "source": "assessment" if s.assessed_level else "self",
        }
        for s in student_skills
    ]


@router.post("/self-rate")
def self_rate_skill(
    payload: SelfRatePayload,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    skill = db.query(Skill).filter(Skill.id == payload.skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    existing = db.query(StudentSkill).filter(
        StudentSkill.student_id == profile.id,
        StudentSkill.skill_id == payload.skill_id
    ).first()

    if existing:
        existing.self_rating = payload.rating
        from services.skill_gap_service import compute_blended_level
        existing.blended_level = compute_blended_level(payload.rating, existing.assessed_level, existing.evidence_count)
    else:
        from services.skill_gap_service import compute_blended_level
        blended = compute_blended_level(payload.rating, None, 0)
        existing = StudentSkill(
            student_id=profile.id,
            skill_id=payload.skill_id,
            self_rating=payload.rating,
            blended_level=blended,
            evidence_count=0
        )
        db.add(existing)

    db.commit()
    return {"message": "Skill self rating updated successfully"}


@router.get("/{skill_id}", response_model=SkillOut)
def get_skill(skill_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill
