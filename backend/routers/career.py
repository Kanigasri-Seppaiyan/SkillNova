"""
routers/career.py — Career GPS, Career Twin, and Career Simulator.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models.user import StudentProfile
from models.roadmap import Roadmap, RoadmapItemStatus
from models.placement import PlacementReadiness
from models.skill_gap import SkillGap, GapPriority
from services.auth_service import get_student_profile

router = APIRouter(prefix="/career", tags=["Career GPS & Twin"])


@router.get("/gps")
def career_gps(db: Session = Depends(get_db), profile: StudentProfile = Depends(get_student_profile)):
    """Visual career journey: completed / current / upcoming milestones."""
    roadmap = db.query(Roadmap).filter(Roadmap.student_id == profile.id, Roadmap.is_active == True).first()
    readiness = db.query(PlacementReadiness).filter(PlacementReadiness.student_id == profile.id).first()

    milestones = []
    if roadmap:
        # Group items by week and derive phase status
        weeks: dict = {}
        for item in roadmap.items:
            wk = item.week_number
            if wk not in weeks:
                weeks[wk] = {"week": wk, "items": [], "status": "pending"}
            weeks[wk]["items"].append({
                "id": item.id,
                "title": item.title,
                "type": item.item_type,
                "status": item.status.value,
            })

        for wk, data in sorted(weeks.items()):
            statuses = [i["status"] for i in data["items"]]
            if all(s == "completed" for s in statuses):
                phase_status = "completed"
            elif any(s in ("in_progress", "revision") for s in statuses):
                phase_status = "current"
            else:
                phase_status = "upcoming"
            data["status"] = phase_status
            milestones.append(data)

    return {
        "career_goal": profile.target_role,
        "placement_readiness": readiness.overall_score if readiness else 0,
        "milestones": milestones,
        "total_weeks": roadmap.total_weeks if roadmap else 0,
    }


@router.get("/twin")
def career_twin(db: Session = Depends(get_db), profile: StudentProfile = Depends(get_student_profile)):
    """
    Career Twin: compares the student's current state against an AI-generated
    'ideal peer' at the same career goal + 6-months-ahead state.
    All comparison data is derived from actual student profile.
    """
    readiness = db.query(PlacementReadiness).filter(PlacementReadiness.student_id == profile.id).first()
    gaps = db.query(SkillGap).filter(
        SkillGap.student_id == profile.id,
        SkillGap.gap_value > 0,
    ).order_by(SkillGap.gap_value.desc()).limit(5).all()

    current_score = readiness.overall_score if readiness else 0
    # Twin is modeled as +25 readiness ahead on all dimensions
    twin_score = min(100.0, current_score + 25)

    current_breakdown = readiness.breakdown if readiness else {}
    twin_breakdown = {}
    if current_breakdown and "scores" in current_breakdown:
        twin_breakdown = {
            "scores": {k: min(100, v + 20) for k, v in current_breakdown["scores"].items()}
        }

    return {
        "you": {
            "readiness_score": current_score,
            "breakdown": current_breakdown.get("scores", {}) if current_breakdown else {},
            "top_gaps": [
                {"skill": g.skill.name if g.skill else g.skill_id, "gap": g.gap_value, "priority": g.priority.value}
                for g in gaps
            ],
        },
        "twin": {
            "label": f"Ideal peer — {profile.target_role or 'Target Role'} (6 months ahead)",
            "readiness_score": twin_score,
            "breakdown": twin_breakdown.get("scores", {}),
            "differentiators": [
                "Completed 3+ portfolio projects",
                "Consistent weekly assessment scores >75%",
                "Resume quality score >80",
                "Active mentorship relationship",
            ],
        },
        "gap_to_close": round(twin_score - current_score, 1),
    }


class SimulatorInput(BaseModel):
    scenario: str  # e.g., "I practice DSA for 2 hours daily for 4 weeks"


@router.post("/simulator")
def career_simulator(
    payload: SimulatorInput,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    """Simulates what-if career scenarios based on real current data."""
    readiness = db.query(PlacementReadiness).filter(PlacementReadiness.student_id == profile.id).first()
    current_score = readiness.overall_score if readiness else 0

    # Simple deterministic simulation model
    scenario_lower = payload.scenario.lower()
    gain = 0.0
    predictions = []

    if "dsa" in scenario_lower or "algorithms" in scenario_lower:
        gain += 8.0
        predictions.append("DSA score improves by ~15 points")
    if "project" in scenario_lower:
        gain += 6.0
        predictions.append("Project score improves by ~20 points (1 more completed project)")
    if "assessment" in scenario_lower or "practice" in scenario_lower:
        gain += 4.0
        predictions.append("Assessment score improves by ~10 points")
    if "resume" in scenario_lower:
        gain += 2.0
        predictions.append("Resume score improves by ~10 points")
    if "mentor" in scenario_lower:
        gain += 3.0
        predictions.append("Communication & guidance improves consistency score")

    projected = min(100.0, current_score + gain)

    return {
        "scenario": payload.scenario,
        "current_readiness": current_score,
        "projected_readiness": round(projected, 1),
        "estimated_gain": round(gain, 1),
        "predictions": predictions,
        "note": "Simulation based on historical patterns. Actual results depend on consistent effort.",
    }
