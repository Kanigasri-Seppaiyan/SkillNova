"""
services/placement_readiness_service.py — 7-component weighted placement score.

Default weights (configurable via app_config):
  technical_skills: 0.35
  dsa:              0.15
  projects:         0.15
  assessments:      0.15
  resume:           0.10
  communication:    0.05
  consistency:      0.05

Every write stores full breakdown JSON — never returns a bare number.
"""
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from models.placement import PlacementReadiness
from models.user import StudentProfile
from models.skill import StudentSkill, Skill, SkillCategory
from models.assessment import AssessmentAttempt, AttemptStatus
from models.project import StudentProject, ProjectStatus
from models.resume import Resume
from models.progress import WeeklyProgress
from models.config import AppConfig


DEFAULT_WEIGHTS = {
    "technical_skills": 0.35,
    "dsa": 0.15,
    "projects": 0.15,
    "assessments": 0.15,
    "resume": 0.10,
    "communication": 0.05,
    "consistency": 0.05,
}


def _get_weights(db: Session) -> Dict[str, float]:
    cfg = db.query(AppConfig).filter(AppConfig.key == "placement_weights").first()
    if cfg and isinstance(cfg.value, dict):
        return {**DEFAULT_WEIGHTS, **cfg.value}
    return DEFAULT_WEIGHTS


def _compute_technical_score(db: Session, student: StudentProfile) -> float:
    tech_skills = (
        db.query(StudentSkill)
        .join(Skill, StudentSkill.skill_id == Skill.id)
        .filter(
            StudentSkill.student_id == student.id,
            Skill.category == SkillCategory.technical,
        )
        .all()
    )
    if not tech_skills:
        return 0.0
    return sum(s.blended_level for s in tech_skills) / len(tech_skills)


def _compute_dsa_score(db: Session, student: StudentProfile) -> float:
    dsa_skills = (
        db.query(StudentSkill)
        .join(Skill, StudentSkill.skill_id == Skill.id)
        .filter(
            StudentSkill.student_id == student.id,
            Skill.category == SkillCategory.dsa,
        )
        .all()
    )
    if not dsa_skills:
        return 0.0
    return sum(s.blended_level for s in dsa_skills) / len(dsa_skills)


def _compute_projects_score(db: Session, student: StudentProfile) -> float:
    completed = db.query(StudentProject).filter(
        StudentProject.student_id == student.id,
        StudentProject.status == ProjectStatus.completed,
    ).count()
    in_progress = db.query(StudentProject).filter(
        StudentProject.student_id == student.id,
        StudentProject.status == ProjectStatus.in_progress,
    ).count()
    # 3+ completed = 100, scale linearly; in-progress counts as 0.5
    score = min(100.0, (completed * 1.0 + in_progress * 0.5) / 3.0 * 100.0)
    return score


def _compute_assessments_score(db: Session, student: StudentProfile) -> float:
    attempts = db.query(AssessmentAttempt).filter(
        AssessmentAttempt.student_id == student.id,
        AssessmentAttempt.status == AttemptStatus.completed,
    ).all()
    if not attempts:
        return 0.0
    return sum(a.score for a in attempts if a.score is not None) / len(attempts)


def _compute_resume_score(db: Session, student: StudentProfile) -> float:
    resume = db.query(Resume).filter(Resume.student_id == student.id).order_by(Resume.uploaded_at.desc()).first()
    if not resume or resume.analysis_score is None:
        return 0.0
    return resume.analysis_score


def _compute_communication_score(db: Session, student: StudentProfile) -> float:
    soft_skills = (
        db.query(StudentSkill)
        .join(Skill, StudentSkill.skill_id == Skill.id)
        .filter(
            StudentSkill.student_id == student.id,
            Skill.category == SkillCategory.soft,
        )
        .all()
    )
    if not soft_skills:
        return 30.0   # Default baseline
    return sum(s.blended_level for s in soft_skills) / len(soft_skills)


def _compute_consistency_score(db: Session, student: StudentProfile) -> float:
    recent_progress = db.query(WeeklyProgress).filter(
        WeeklyProgress.student_id == student.id,
    ).order_by(WeeklyProgress.week_start.desc()).limit(8).all()
    if not recent_progress:
        return 0.0
    active_weeks = sum(1 for w in recent_progress if (w.assessments_taken or 0) > 0 or (w.roadmap_items_completed or 0) > 0)
    return (active_weeks / max(len(recent_progress), 1)) * 100.0


def compute_placement_readiness(db: Session, student: StudentProfile) -> PlacementReadiness:
    """
    Computes the full weighted placement readiness score.
    Always stores and returns the breakdown — never a bare number.
    """
    weights = _get_weights(db)

    scores = {
        "technical_skills": _compute_technical_score(db, student),
        "dsa": _compute_dsa_score(db, student),
        "projects": _compute_projects_score(db, student),
        "assessments": _compute_assessments_score(db, student),
        "resume": _compute_resume_score(db, student),
        "communication": _compute_communication_score(db, student),
        "consistency": _compute_consistency_score(db, student),
    }

    weighted_scores = {k: round(scores[k] * weights[k], 3) for k in weights}
    overall = round(sum(weighted_scores.values()), 2)

    # Identify limiting factors — components where score < 50 and weight > 0.1
    limiting_factors = []
    for factor, score in scores.items():
        weight = weights.get(factor, 0)
        if score < 50 and weight >= 0.10:
            limiting_factors.append({
                "factor": factor,
                "current_score": round(score, 1),
                "weight": weight,
                "potential_gain": round((50 - score) * weight, 1),
                "impact": "high" if weight >= 0.25 else "medium",
            })
    limiting_factors.sort(key=lambda x: x["potential_gain"], reverse=True)

    breakdown = {
        "weights": weights,
        "scores": {k: round(v, 2) for k, v in scores.items()},
        "weighted_scores": weighted_scores,
        "overall": overall,
        "limiting_factors": limiting_factors,
    }

    # Upsert placement readiness row
    existing = db.query(PlacementReadiness).filter(PlacementReadiness.student_id == student.id).first()
    if existing:
        existing.overall_score = overall
        existing.breakdown = breakdown
        existing.computed_at = datetime.now(timezone.utc)
        db.commit()
        return existing
    else:
        record = PlacementReadiness(
            student_id=student.id,
            overall_score=overall,
            breakdown=breakdown,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
