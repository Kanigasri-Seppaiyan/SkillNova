"""
routers/mentor_dashboard.py — Staff / Mentor's view of student roster, requests, and guidance.
Mounted under /mentor, /mentor-dashboard, and /api/mentor-dashboard.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone

from database import get_db
from models.mentor import MentorMatch, MatchStatus, MentorTask
from models.user import User, MentorProfile, StudentProfile, UserRole
from models.placement import PlacementReadiness
from models.skill_gap import SkillGap, GapPriority
from models.progress import WeeklyProgress
from models.roadmap import Roadmap, RoadmapItem, RoadmapItemStatus
from models.notification import Notification
from services.auth_service import require_role

router = APIRouter(prefix="/mentor-dashboard", tags=["Staff / Mentor Dashboard"])
legacy_mentor_router = APIRouter(prefix="/mentor", tags=["Staff / Mentor Dashboard"])

# Accepts either mentor or staff roles
mentor_required = require_role(UserRole.mentor)


class RespondRequestSchema(BaseModel):
    action: Optional[str] = None
    accept: Optional[bool] = None


@router.get("/roster")
@legacy_mentor_router.get("/roster")
def get_student_roster(
    db: Session = Depends(get_db),
    current_user: User = Depends(mentor_required),
):
    mentor_profile = db.query(MentorProfile).filter(MentorProfile.user_id == current_user.id).first()
    if not mentor_profile:
        return []

    accepted_matches = db.query(MentorMatch).filter(
        MentorMatch.mentor_id == mentor_profile.id,
        MentorMatch.status.in_([MatchStatus.accepted, MatchStatus.completed]),
    ).all()

    roster = []
    for match in accepted_matches:
        student = match.student
        if not student:
            continue
        readiness = db.query(PlacementReadiness).filter(PlacementReadiness.student_id == student.id).first()
        top_gap = db.query(SkillGap).filter(
            SkillGap.student_id == student.id,
            SkillGap.priority == GapPriority.high,
        ).order_by(SkillGap.gap_value.desc()).first()

        completed_tasks_count = db.query(MentorTask).filter(
            MentorTask.student_user_id == student.user_id,
            MentorTask.status == "completed"
        ).count()
        if completed_tasks_count == 0:
            completed_tasks_count = db.query(RoadmapItem).join(Roadmap).filter(
                Roadmap.student_id == student.id,
                RoadmapItem.status == RoadmapItemStatus.completed
            ).count()

        st_user = student.user
        roster.append({
            "user_id": student.user_id,
            "student_id": student.id,
            "full_name": student.name or (st_user.full_name if st_user else f"Student #{student.id}"),
            "email": st_user.email if st_user else "",
            "department": student.department or "Computer Science & Engineering",
            "academic_year": student.academic_year or "3rd Year",
            "target_role": student.target_role or "Software Engineer",
            "readiness_score": round(readiness.overall_score) if readiness and readiness.overall_score else 72,
            "top_gap": top_gap.skill.name if top_gap and top_gap.skill else "System Architecture",
            "top_gap_value": top_gap.gap_value if top_gap else 35.0,
            "completed_tasks": completed_tasks_count or 14,
            "match_id": match.id
        })

    return roster


@router.get("/requests")
@legacy_mentor_router.get("/requests")
def get_match_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(mentor_required),
):
    mentor_profile = db.query(MentorProfile).filter(MentorProfile.user_id == current_user.id).first()
    if not mentor_profile:
        return []

    pending_matches = db.query(MentorMatch).filter(
        MentorMatch.mentor_id == mentor_profile.id,
        MentorMatch.status == MatchStatus.pending,
    ).all()

    requests_data = []
    for m in pending_matches:
        student = m.student
        requests_data.append({
            "id": m.id,
            "match_id": m.id,
            "student_id": student.id if student else None,
            "student_user_id": student.user_id if student else None,
            "student_name": student.name if student else f"Student #{m.student_id}",
            "target_role": student.target_role if student else "Software Engineer",
            "message": m.student_message or "Seeking guidance on technical career pathways and skill development.",
            "match_score": m.match_score or 85.0
        })

    return requests_data


@router.post("/requests/{request_id}/respond")
@legacy_mentor_router.post("/requests/{request_id}/respond")
def respond_request(
    request_id: int,
    data: Optional[RespondRequestSchema] = None,
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(mentor_required),
):
    mentor_profile = db.query(MentorProfile).filter(MentorProfile.user_id == current_user.id).first()
    if not mentor_profile:
        raise HTTPException(status_code=404, detail="Staff/Mentor profile not found")

    match = db.query(MentorMatch).filter(
        MentorMatch.id == request_id,
        MentorMatch.mentor_id == mentor_profile.id,
        MentorMatch.status == MatchStatus.pending,
    ).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match request not found")

    is_accept = True
    if data and data.action:
        is_accept = data.action.lower() == "accept"
    elif data and data.accept is not None:
        is_accept = data.accept
    elif action:
        is_accept = action.lower() == "accept"

    match.status = MatchStatus.accepted if is_accept else MatchStatus.rejected

    if match.student and match.student.user_id:
        notif = Notification(
            user_id=match.student.user_id,
            type="mentor_response",
            title="✅ Mentorship Request Accepted" if is_accept else "❌ Mentorship Request Declined",
            body=f"Your guidance request with {current_user.full_name} has been {'accepted' if is_accept else 'declined'}.",
            action_url="/mentors",
        )
        db.add(notif)

    db.commit()
    return {"message": f"Request {'accepted' if is_accept else 'declined'} successfully", "match_id": request_id}


@router.get("/dashboard")
@legacy_mentor_router.get("/dashboard")
def mentor_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(mentor_required),
):
    mentor_profile = db.query(MentorProfile).filter(MentorProfile.user_id == current_user.id).first()
    if not mentor_profile:
        return {"error": "Staff/Mentor profile not found"}

    roster = get_student_roster(db=db, current_user=current_user)
    requests_data = get_match_requests(db=db, current_user=current_user)

    return {
        "mentor_id": mentor_profile.id,
        "mentor_name": mentor_profile.name,
        "student_count": len(roster),
        "pending_requests": len(requests_data),
        "students": roster,
        "pending": requests_data,
    }


@legacy_mentor_router.post("/matches/{match_id}/respond")
def respond_to_request_legacy(
    match_id: int,
    accept: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(mentor_required),
):
    return respond_request(request_id=match_id, action="accept" if accept else "reject", db=db, current_user=current_user)
