"""
services/skill_gap_service.py — Core skill gap computation engine.

Gap algorithm (spec-exact):
  gap = max(0, required_level - blended_level)
  priority = HIGH if gap >= threshold_high else MEDIUM if gap >= threshold_medium else LOW

Blended level formula:
  blended = (self_rating * 0.30) + (assessed_level * 0.50) + (evidence_bonus * 0.20)
  evidence_bonus = min(100, evidence_count * 10)
  If no assessment data: blended = self_rating * 0.80  (self-rating alone is penalised)
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from models.skill_gap import SkillGap, GapPriority
from models.skill import StudentSkill, CareerSkillRequirement, CareerGoal
from models.user import StudentProfile
from models.config import AppConfig


def _get_threshold(db: Session, key: str, default: float) -> float:
    cfg = db.query(AppConfig).filter(AppConfig.key == key).first()
    if cfg:
        return float(cfg.value)
    return default


def compute_blended_level(
    self_rating: float,
    assessed_level: Optional[float],
    evidence_count: int,
) -> float:
    """
    Returns blended skill level 0-100.
    Self-rating alone is penalised — once assessment data exists it takes majority weight.
    """
    evidence_bonus = min(100.0, evidence_count * 10.0)
    if assessed_level is not None:
        return (self_rating * 0.30) + (assessed_level * 0.50) + (evidence_bonus * 0.20)
    # No assessment yet — self-rating is still penalised to discourage inflation
    return (self_rating * 0.80) + (evidence_bonus * 0.20)


def compute_gap_for_student(db: Session, student: StudentProfile) -> List[SkillGap]:
    """
    Computes skill gaps for all skills required by the student's active career goal.
    Upserts SkillGap rows and returns the updated list.
    """
    threshold_high = _get_threshold(db, "gap_threshold_high", 30.0)
    threshold_medium = _get_threshold(db, "gap_threshold_medium", 15.0)

    active_goal = db.query(CareerGoal).filter(
        CareerGoal.student_id == student.id,
        CareerGoal.is_active == True,
    ).first()

    if not active_goal:
        return []

    requirements: List[CareerSkillRequirement] = active_goal.skill_requirements
    results: List[SkillGap] = []

    for req in requirements:
        # Get student's current skill entry
        student_skill = db.query(StudentSkill).filter(
            StudentSkill.student_id == student.id,
            StudentSkill.skill_id == req.skill_id,
        ).first()

        if student_skill:
            self_rating = student_skill.self_rating
            assessed = student_skill.assessed_level
            evidence = student_skill.evidence_count
        else:
            self_rating, assessed, evidence = 0.0, None, 0

        blended = compute_blended_level(self_rating, assessed, evidence)

        gap = max(0.0, req.required_level - blended)

        if gap >= threshold_high:
            priority = GapPriority.high
        elif gap >= threshold_medium:
            priority = GapPriority.medium
        elif gap > 0:
            priority = GapPriority.low
        else:
            priority = GapPriority.none

        breakdown = {
            "self_rating": self_rating,
            "assessed_level": assessed,
            "evidence_count": evidence,
            "blended_level": round(blended, 2),
            "required_level": req.required_level,
            "gap": round(gap, 2),
            "priority": priority.value,
            "factors": _explain_gap(self_rating, assessed, evidence, blended, req.required_level, gap),
        }

        # Upsert the gap row
        existing = db.query(SkillGap).filter(
            SkillGap.student_id == student.id,
            SkillGap.skill_id == req.skill_id,
        ).first()

        if existing:
            existing.gap_value = gap
            existing.priority = priority
            existing.breakdown = breakdown
            existing.computed_at = datetime.now(timezone.utc)
            results.append(existing)
        else:
            new_gap = SkillGap(
                student_id=student.id,
                skill_id=req.skill_id,
                gap_value=gap,
                priority=priority,
                breakdown=breakdown,
            )
            db.add(new_gap)
            results.append(new_gap)

    db.commit()
    return results


def _explain_gap(
    self_rating: float,
    assessed: Optional[float],
    evidence: int,
    blended: float,
    required: float,
    gap: float,
) -> List[Dict[str, Any]]:
    factors = []
    if gap == 0:
        factors.append({"type": "met", "message": "Skill requirement fully met"})
        return factors
    if assessed is None:
        factors.append({"type": "no_assessment", "message": "No assessment taken yet — self-rating penalised (×0.80)"})
    elif assessed < self_rating - 15:
        factors.append({"type": "overestimation", "message": f"Self-rating ({self_rating}) is significantly higher than assessed level ({assessed})"})
    if evidence == 0:
        factors.append({"type": "no_evidence", "message": "No project or resume evidence found for this skill"})
    if blended < required * 0.5:
        factors.append({"type": "large_gap", "message": f"Blended level ({blended:.0f}) is less than half the required level ({required:.0f})"})
    return factors


def compute_student_gaps(student_id: int, db: Session) -> List[SkillGap]:
    """Helper accepting student user_id or profile id and returning computed gaps."""
    student = db.query(StudentProfile).filter(
        (StudentProfile.id == student_id) | (StudentProfile.user_id == student_id)
    ).first()
    if not student:
        return []
    return compute_gap_for_student(db, student)


