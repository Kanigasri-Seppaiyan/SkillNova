"""
routers/students.py — Student profile management and skill tracking.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User, StudentProfile
from models.skill import StudentSkill, Skill, CareerGoal, CareerSkillRequirement
from schemas.student import (
    StudentProfileOut, StudentProfileUpdate, CareerGoalCreate, CareerGoalOut,
    SkillRatingBatch, StudentSkillOut, LearningPreferences,
)
from services.auth_service import get_current_user, require_role, get_student_profile
from services.skill_gap_service import compute_blended_level

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("/me", response_model=StudentProfileOut)
def get_my_profile(profile: StudentProfile = Depends(get_student_profile)):
    return profile


@router.put("/me", response_model=StudentProfileOut)
def update_my_profile(
    payload: StudentProfileUpdate,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/me/career-goal", response_model=CareerGoalOut, status_code=201)
def set_career_goal(
    payload: CareerGoalCreate,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    # Deactivate old goals
    db.query(CareerGoal).filter(CareerGoal.student_id == profile.id).update({"is_active": False})

    goal = CareerGoal(student_id=profile.id, **payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.get("/me/career-goal", response_model=CareerGoalOut)
def get_career_goal(
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    goal = db.query(CareerGoal).filter(CareerGoal.student_id == profile.id, CareerGoal.is_active == True).first()
    if not goal:
        raise HTTPException(status_code=404, detail="No active career goal found")
    return goal


@router.get("/me/skills", response_model=List[StudentSkillOut])
def get_my_skills(
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    skills = db.query(StudentSkill).filter(StudentSkill.student_id == profile.id).all()
    result = []
    for ss in skills:
        skill = db.query(Skill).filter(Skill.id == ss.skill_id).first()
        result.append(StudentSkillOut(
            id=ss.id,
            skill_id=ss.skill_id,
            skill_name=skill.name if skill else "Unknown",
            self_rating=ss.self_rating,
            assessed_level=ss.assessed_level,
            blended_level=ss.blended_level,
            evidence_count=ss.evidence_count,
        ))
    return result


@router.post("/me/skills/batch", status_code=200)
def batch_rate_skills(
    payload: SkillRatingBatch,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    """Upserts self-ratings for multiple skills at once (used in onboarding)."""
    for rating in payload.ratings:
        ss = db.query(StudentSkill).filter(
            StudentSkill.student_id == profile.id,
            StudentSkill.skill_id == rating.skill_id,
        ).first()
        blended = compute_blended_level(rating.self_rating, None, 0)
        if ss:
            ss.self_rating = rating.self_rating
            ss.blended_level = blended
        else:
            ss = StudentSkill(
                student_id=profile.id,
                skill_id=rating.skill_id,
                self_rating=rating.self_rating,
                blended_level=blended,
                evidence_count=0,
            )
            db.add(ss)
    db.commit()
    return {"message": f"Updated {len(payload.ratings)} skill ratings"}


@router.post("/me/complete-onboarding", status_code=200)
def complete_onboarding(
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    """Marks onboarding complete and triggers initial gap + roadmap computation."""
    profile.onboarding_completed = True
    db.commit()

    # Trigger cascaded computation
    from services.skill_gap_service import compute_gap_for_student
    from services.roadmap_service import generate_roadmap
    from services.placement_readiness_service import compute_placement_readiness

    compute_gap_for_student(db, profile)
    generate_roadmap(db, profile)
    compute_placement_readiness(db, profile)

    return {"message": "Onboarding complete. Career profile initialized."}
