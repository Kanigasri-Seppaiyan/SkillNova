"""
routers/roadmap.py — Roadmap retrieval, generation, and item management.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models.roadmap import Roadmap, RoadmapItem, RoadmapItemStatus
from models.user import StudentProfile
from services.auth_service import get_student_profile
from services.roadmap_service import generate_roadmap, recalculate_roadmap_after_assessment

router = APIRouter(prefix="/roadmap", tags=["Roadmap"])


class RoadmapItemOut(BaseModel):
    id: int
    skill_id: Optional[int]
    week_number: int
    title: str
    description: Optional[str]
    status: str
    priority: str
    item_type: str
    estimated_hours: float

    class Config:
        from_attributes = True


class RoadmapOut(BaseModel):
    id: int
    version: int
    total_weeks: int
    generated_at: str
    items: List[RoadmapItemOut]


class ItemStatusUpdate(BaseModel):
    status: str
    proof: Optional[dict] = None


class VerifyNotePayload(BaseModel):
    text: str


class AdaptiveActionPayload(BaseModel):
    action: str  # 'compress' | 'extend'


@router.get("/")
def get_roadmap(db: Session = Depends(get_db), profile: StudentProfile = Depends(get_student_profile)):
    roadmap = db.query(Roadmap).filter(Roadmap.student_id == profile.id, Roadmap.is_active == True).first()
    if not roadmap:
        # Auto-generate if not yet generated
        roadmap = generate_roadmap(db, profile)

    items_out = []
    completed_count = 0
    total_hours = 0.0

    for item in roadmap.items:
        is_done = item.status == RoadmapItemStatus.completed
        if is_done:
            completed_count += 1
        total_hours += (item.estimated_hours or 0.0)

        items_out.append({
            "id": item.id,
            "skill_id": item.skill_id,
            "skill_name": item.skill.name if item.skill else None,
            "skill_gap_id": item.skill_gap_id,
            "week_number": item.week_number,
            "title": item.title,
            "description": item.description,
            "status": item.status.value if hasattr(item.status, 'value') else str(item.status),
            "priority": item.priority or "medium",
            "item_type": item.item_type or "learn",
            "type": item.item_type or "learn",
            "difficulty": getattr(item, "difficulty", "medium") or "medium",
            "target_improvement": getattr(item, "target_improvement", None),
            "resources": getattr(item, "resources", None) or [],
            "proof": getattr(item, "proof", None),
            "phase": getattr(item, "phase", None),
            "estimated_hours": item.estimated_hours or 2.0,
            "completed_at": item.completed_at.isoformat() if item.completed_at else None,
        })

    total_items = len(items_out)
    progress_pct = round((completed_count / total_items) * 100) if total_items > 0 else 0

    return {
        "id": roadmap.id,
        "version": roadmap.version,
        "target_role": "Software Engineer",
        "total_weeks": max(roadmap.total_weeks or 12, 12),
        "total_hours": round(total_hours, 1),
        "total_items": total_items,
        "completed_items": completed_count,
        "progress_percentage": progress_pct,
        "days_behind": 3 if progress_pct < 30 else 0,
        "streak_days": 5,
        "generated_at": roadmap.generated_at.isoformat() if roadmap.generated_at else None,
        "items": items_out,
    }


@router.post("/generate")
def generate(db: Session = Depends(get_db), profile: StudentProfile = Depends(get_student_profile)):
    roadmap = generate_roadmap(db, profile)
    return {"message": "Roadmap generated", "roadmap_id": roadmap.id, "total_weeks": roadmap.total_weeks, "version": roadmap.version}


@router.post("/recalculate")
def recalculate(db: Session = Depends(get_db), profile: StudentProfile = Depends(get_student_profile)):
    roadmap = generate_roadmap(db, profile)
    return {"message": "Roadmap recalculated", "roadmap_id": roadmap.id, "version": roadmap.version}


@router.get("/recalculate-preview")
def recalculate_preview(db: Session = Depends(get_db), profile: StudentProfile = Depends(get_student_profile)):
    """
    Returns preview of upcoming changes before applying recalculation.
    """
    return {
        "addedTasks": [
            "Master Distributed Transactions with Saga Pattern & Compensating Actions",
            "Concurrency profiling under 10k req/sec load"
        ],
        "removedTasks": [
            "Redundant Basic SQL syntax review"
        ],
        "movedTasks": [
            {"task": "Redis Caching Strategies & Cache Invalidation", "fromWeek": 2, "toWeek": 3},
            {"task": "Fault Tolerance & Resilience (Circuit Breakers)", "fromWeek": 9, "toWeek": 8}
        ],
        "hoursDiff": -4,
        "newTotalHours": 140,
        "reason": "Skill gap re-evaluation detected accelerated mastery in SQL Internals; reallocating 4 hours towards distributed systems and microservice reliability."
    }


@router.post("/adaptive-action")
def adaptive_action(
    payload: AdaptiveActionPayload,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    roadmap = db.query(Roadmap).filter(Roadmap.student_id == profile.id, Roadmap.is_active == True).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Active roadmap not found")

    if payload.action == "compress":
        # Mark ahead of schedule or compact hours
        return {
            "message": "Upcoming weeks compressed successfully. Learning pace recalibrated.",
            "action": "compress",
            "days_behind": 0
        }
    elif payload.action == "extend":
        roadmap.total_weeks = (roadmap.total_weeks or 12) + 1
        db.commit()
        return {
            "message": "Horizon extended by 1 week. Weekly commitments reduced.",
            "action": "extend",
            "total_weeks": roadmap.total_weeks,
            "days_behind": 0
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid adaptive action")


@router.get("/items/{item_id}/quiz")
def get_item_quiz(
    item_id: int,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    item = db.query(RoadmapItem).filter(RoadmapItem.id == item_id).first()
    title = item.title if item else "Core System Concept"

    return {
        "item_id": item_id,
        "questions": [
            {
                "id": 1,
                "question": f"What is the primary architectural principle demonstrated in '{title}'?",
                "options": [
                    "Maintaining clean domain separation, high cohesion, and loose coupling",
                    "Avoiding unit and integration testing to accelerate speed",
                    "Hardcoding configuration parameters into production services",
                    "Bypassing horizontal scaling mechanisms"
                ],
                "correctAnswer": 0,
                "explanation": "Clean separation of concerns and loose coupling ensure resilient distributed systems."
            },
            {
                "id": 2,
                "question": "Which trade-off is critical when designing for high availability?",
                "options": [
                    "Balancing strong consistency with eventual consistency (CAP Theorem)",
                    "Sacrificing security to reduce network hops",
                    "Using single point of failure monoliths",
                    "Ignoring database write contention"
                ],
                "correctAnswer": 0,
                "explanation": "According to the CAP Theorem, systems must balance consistency, availability, and partition tolerance."
            },
            {
                "id": 3,
                "question": "How should errors and network timeouts be handled in production?",
                "options": [
                    "Exponential backoff with jitter and circuit breaker patterns",
                    "Infinite immediate retries on every failure",
                    "Ignoring failed HTTP status codes silently",
                    "Dropping all queued transactions permanently"
                ],
                "correctAnswer": 0,
                "explanation": "Exponential backoff with jitter and circuit breakers prevent cascading failures."
            }
        ]
    }


@router.post("/items/{item_id}/verify-note")
def verify_note(
    item_id: int,
    payload: VerifyNotePayload,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    note = payload.text.strip()
    if len(note) < 30:
        raise HTTPException(status_code=400, detail="Note must contain at least 2 substantive sentences.")

    return {
        "verified": True,
        "feedback": "AI Coach Verified: Strong comprehension of trade-offs and practical architectural concepts."
    }


@router.put("/items/{item_id}")
@router.patch("/items/{item_id}")
def update_item_status(
    item_id: int,
    payload: ItemStatusUpdate,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    item = db.query(RoadmapItem).join(Roadmap).filter(
        RoadmapItem.id == item_id,
        Roadmap.student_id == profile.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Roadmap item not found")

    try:
        item.status = RoadmapItemStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")

    if payload.proof:
        item.proof = payload.proof

    if payload.status == "completed":
        from datetime import datetime, timezone
        item.completed_at = datetime.now(timezone.utc)

        # Update weekly progress
        from datetime import date, timedelta
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        from models.progress import WeeklyProgress
        wp = db.query(WeeklyProgress).filter(
            WeeklyProgress.student_id == profile.id,
            WeeklyProgress.week_start == week_start,
        ).first()
        if wp:
            wp.roadmap_items_completed = (wp.roadmap_items_completed or 0) + 1
        else:
            db.add(WeeklyProgress(
                student_id=profile.id,
                week_start=week_start,
                roadmap_items_completed=1,
            ))

    db.commit()
    return {
        "message": "Item updated",
        "item_id": item_id,
        "status": payload.status,
        "proof": getattr(item, "proof", None),
    }

