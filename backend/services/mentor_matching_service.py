"""
services/mentor_matching_service.py — 6-dimension mentor match scoring.

Default weights (configurable via app_config key: mentor_match_weights):
  skill_match:    0.30
  career_match:   0.25
  domain_match:   0.15
  availability:   0.10
  experience:     0.10
  preference:     0.10
"""
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from models.mentor import MentorMatch, MentorSkill
from models.user import StudentProfile, MentorProfile
from models.skill import StudentSkill, CareerGoal, CareerSkillRequirement
from models.config import AppConfig


DEFAULT_WEIGHTS = {
    "skill_match": 0.30,
    "career_match": 0.25,
    "domain_match": 0.15,
    "availability": 0.10,
    "experience": 0.10,
    "preference": 0.10,
}


def _get_weights(db: Session) -> Dict[str, float]:
    cfg = db.query(AppConfig).filter(AppConfig.key == "mentor_match_weights").first()
    if cfg and isinstance(cfg.value, dict):
        return {**DEFAULT_WEIGHTS, **cfg.value}
    return DEFAULT_WEIGHTS


def score_mentor_for_student(
    db: Session,
    student: StudentProfile,
    mentor: MentorProfile,
    weights: Dict[str, float],
) -> Dict[str, Any]:
    """Returns dimension scores and composite match score."""

    # 1. Skill match: overlap between mentor skills and student's gap skills
    student_skill_ids = {ss.skill_id for ss in student.student_skills}
    mentor_skill_ids = {ms.skill_id for ms in mentor.mentor_skills}
    gap_skill_ids = {g.skill_id for g in student.skill_gaps if g.gap_value > 0}

    if gap_skill_ids:
        overlap = len(gap_skill_ids & mentor_skill_ids)
        skill_match = min(100.0, (overlap / len(gap_skill_ids)) * 100.0)
    elif mentor_skill_ids & student_skill_ids:
        skill_match = min(100.0, (len(mentor_skill_ids & student_skill_ids) / max(len(student_skill_ids), 1)) * 100.0)
    else:
        skill_match = 0.0

    # 2. Career match: check if mentor domain aligns with student's career goal
    active_goal = next((g for g in student.career_goals if g.is_active), None)
    career_match = 0.0
    if active_goal and mentor.domain:
        goal_lower = active_goal.title.lower()
        domain_lower = mentor.domain.lower()
        # Simple keyword overlap
        goal_words = set(goal_lower.split())
        domain_words = set(domain_lower.split())
        overlap_words = goal_words & domain_words
        career_match = min(100.0, len(overlap_words) / max(len(goal_words), 1) * 200.0)  # boost factor

    # 3. Domain match: direct domain string match
    domain_match = 100.0 if (mentor.domain and active_goal and mentor.domain.lower() in active_goal.title.lower()) else 30.0

    # 4. Availability: hours available (8+ = 100%)
    availability_hours = mentor.availability_hours_per_week or 0
    availability = min(100.0, (availability_hours / 8.0) * 100.0)

    # 5. Experience score: 10+ years = 100%
    experience = min(100.0, ((mentor.years_experience or 0) / 10.0) * 100.0)

    # 6. Preference: default 70 (no preference data yet)
    preference = 70.0

    scores = {
        "skill_match": round(skill_match, 1),
        "career_match": round(career_match, 1),
        "domain_match": round(domain_match, 1),
        "availability": round(availability, 1),
        "experience": round(experience, 1),
        "preference": round(preference, 1),
    }

    total = round(sum(scores[k] * weights[k] for k in weights), 2)

    return {"scores": scores, "weights": weights, "total": total}


def get_recommended_mentors(
    db: Session,
    student: StudentProfile,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """Returns top-N mentors ranked by match score with breakdown."""
    weights = _get_weights(db)
    mentors = db.query(MentorProfile).join(MentorProfile.user).filter(
        MentorProfile.user.has(is_active=True),
        MentorProfile.status == "approved"
    ).all()

    scored = []
    for mentor in mentors:
        result = score_mentor_for_student(db, student, mentor, weights)
        scored.append({
            "mentor": mentor,
            "match_score": result["total"],
            "breakdown": result,
        })

    scored.sort(key=lambda x: x["match_score"], reverse=True)
    return scored[:limit]
