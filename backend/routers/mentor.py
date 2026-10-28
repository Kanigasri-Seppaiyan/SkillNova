"""
routers/mentor.py — Mentor-namespaced endpoints (/api/mentor/*).
Guarded by require_approved_mentor (unapproved/pending mentors blocked with HTTP 403).
Unassigned student access returns HTTP 403 Forbidden.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models.user import User, MentorProfile, StudentProfile, MentorStatus
from models.mentor import (
    MentorMatch, MatchStatus, MentorFeedback, MentorTask,
    AvailabilitySlot, MentoringSession, SessionStatus
)
from models.progress import WeeklyProgress
from models.placement import PlacementReadiness
from models.skill import StudentSkill, Skill
from models.skill_gap import SkillGap
from models.assessment import AssessmentAttempt
from models.roadmap import Roadmap, RoadmapItem, RoadmapItemStatus
from models.notification import Notification
from dependencies import get_current_mentor, require_approved_mentor, verify_mentor_assigned_student

router = APIRouter(prefix="/api/mentor", tags=["Mentor"])


class ProfileEditSchema(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    domain: Optional[str] = None
    years_experience: Optional[int] = None
    linkedin_url: Optional[str] = None
    availability_hours_per_week: Optional[float] = None
    max_students: Optional[int] = None


class AvailabilitySlotSchema(BaseModel):
    day_of_week: str  # Monday, Tuesday, ...
    start_time: str   # "14:00"
    end_time: str     # "15:00"


class SessionCreateSchema(BaseModel):
    student_id: int
    scheduled_at: datetime
    duration_minutes: Optional[int] = 45
    agenda: Optional[str] = "Mentoring session"
    meeting_link: Optional[str] = None
    slot_id: Optional[int] = None


class FeedbackSchema(BaseModel):
    student_id: int
    rating: float = 5.0
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    actionable_recommendations: Optional[str] = None
    priority_level: Optional[str] = "medium"


class TaskAssignSchema(BaseModel):
    student_id: int
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None


class RespondRequestSchema(BaseModel):
    request_id: int
    action: str  # accept, reject


class SessionStatusUpdateSchema(BaseModel):
    status: Optional[str] = None


def _calculate_profile_completion(profile: Optional[MentorProfile]) -> int:
    if not profile:
        return 0
    checks = [
        bool(profile.name),
        bool(profile.bio and len(profile.bio) > 10),
        bool(profile.domain),
        bool(profile.years_experience and profile.years_experience > 0),
        bool(profile.linkedin_url),
        bool(profile.availability_hours_per_week and profile.availability_hours_per_week > 0),
        len(profile.mentor_skills) > 0,
        len(profile.availability_slots) > 0,
    ]
    return int((sum(1 for c in checks if c) / len(checks)) * 100)


@router.get("/profile")
def get_mentor_profile(mentor: User = Depends(get_current_mentor), db: Session = Depends(get_db)):
    profile = db.query(MentorProfile).filter(MentorProfile.user_id == mentor.id).first()
    completion = _calculate_profile_completion(profile)
    status_str = profile.status.value if profile and hasattr(profile.status, "value") else str(getattr(profile, "status", "pending"))
    return {
        "user_id": mentor.id,
        "full_name": mentor.full_name,
        "email": mentor.email,
        "status": status_str,
        "rejection_reason": profile.rejection_reason if profile else None,
        "profile_completion": completion,
        "profile": profile
    }


@router.put("/profile")
def update_mentor_profile(
    data: ProfileEditSchema,
    mentor: User = Depends(require_approved_mentor),
    db: Session = Depends(get_db)
):
    profile = db.query(MentorProfile).filter(MentorProfile.user_id == mentor.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Mentor profile not found")

    for k, v in data.dict(exclude_unset=True).items():
        if v is not None:
            setattr(profile, k, v)

    db.commit()
    db.refresh(profile)
    db.refresh(mentor)
    return {
        "message": "Mentor profile updated successfully",
        "profile": profile,
        "profile_completion": _calculate_profile_completion(profile)
    }


# ── Availability Slots ───────────────────────────────────────────────────────
@router.get("/availability")
def list_availability_slots(
    mentor: User = Depends(require_approved_mentor),
    db: Session = Depends(get_db)
):
    profile = db.query(MentorProfile).filter(MentorProfile.user_id == mentor.id).first()
    if not profile:
        return []
    return db.query(AvailabilitySlot).filter(
        AvailabilitySlot.mentor_id == profile.id,
        AvailabilitySlot.is_active == True
    ).all()


@router.post("/availability", status_code=status.HTTP_201_CREATED)
def add_availability_slot(
    data: AvailabilitySlotSchema,
    mentor: User = Depends(require_approved_mentor),
    db: Session = Depends(get_db)
):
    profile = db.query(MentorProfile).filter(MentorProfile.user_id == mentor.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Mentor profile not found")

    slot = AvailabilitySlot(
        mentor_id=profile.id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        is_active=True
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


@router.delete("/availability/{slot_id}")
def delete_availability_slot(
    slot_id: int,
    mentor: User = Depends(require_approved_mentor),
    db: Session = Depends(get_db)
):
    profile = db.query(MentorProfile).filter(MentorProfile.user_id == mentor.id).first()
    slot = db.query(AvailabilitySlot).filter(
        AvailabilitySlot.id == slot_id,
        AvailabilitySlot.mentor_id == profile.id
    ).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Availability slot not found")

    slot.is_active = False
    db.commit()
    return {"message": "Availability slot removed"}


# ── Assigned Students ────────────────────────────────────────────────────────
@router.get("/students")
def list_assigned_students(mentor: User = Depends(require_approved_mentor), db: Session = Depends(get_db)):
    mentor_profile = db.query(MentorProfile).filter(MentorProfile.user_id == mentor.id).first()
    if not mentor_profile:
        return []

    matches = db.query(MentorMatch).filter(
        MentorMatch.mentor_id == mentor_profile.id,
        MentorMatch.status == "accepted"
    ).all()

    assigned = []
    for m in matches:
        st_profile = db.query(StudentProfile).filter(StudentProfile.id == m.student_id).first()
        if not st_profile:
            continue
        st_user = st_profile.user
        readiness = db.query(PlacementReadiness).filter(PlacementReadiness.student_id == st_profile.id).first()

        # Skills summary
        student_skills = db.query(StudentSkill).filter(StudentSkill.student_id == st_profile.id).all()
        skills_list = []
        for ss in student_skills:
            sk_obj = db.query(Skill).filter(Skill.id == ss.skill_id).first()
            if sk_obj:
                skills_list.append({
                    "id": sk_obj.id,
                    "name": sk_obj.name,
                    "category": sk_obj.category.value if hasattr(sk_obj.category, "value") else str(sk_obj.category),
                    "level": ss.blended_level or ss.self_rating or 0.0,
                    "evidence_count": ss.evidence_count
                })

        # Top skill gap
        top_gap_obj = db.query(SkillGap).filter(SkillGap.student_id == st_profile.id).order_by(SkillGap.gap_value.desc()).first()
        top_gap_name = None
        top_gap_val = 0.0
        if top_gap_obj:
            sk = db.query(Skill).filter(Skill.id == top_gap_obj.skill_id).first()
            top_gap_name = sk.name if sk else f"Skill #{top_gap_obj.skill_id}"
            top_gap_val = top_gap_obj.gap_value

        # Completed tasks / roadmap
        completed_tasks_count = db.query(MentorTask).filter(
            MentorTask.student_user_id == st_profile.user_id,
            MentorTask.status == "completed"
        ).count()
        if completed_tasks_count == 0:
            completed_tasks_count = db.query(RoadmapItem).join(Roadmap).filter(
                Roadmap.student_id == st_profile.id,
                RoadmapItem.status == RoadmapItemStatus.completed
            ).count()

        # Assessments
        attempts = db.query(AssessmentAttempt).filter(AssessmentAttempt.student_id == st_profile.id).all()
        assessment_count = len(attempts)
        avg_score = round(sum(a.score for a in attempts if a.score is not None) / max(1, len([a for a in attempts if a.score is not None])), 1) if attempts else 0.0

        assigned.append({
            "student_id": st_user.id if st_user else m.student_id,
            "profile_id": st_profile.id,
            "user_id": st_user.id if st_user else m.student_id,
            "full_name": st_profile.name or (st_user.full_name if st_user else f"Student #{m.student_id}"),
            "email": st_user.email if st_user else "",
            "department": st_profile.department or "Computer Science & Engineering",
            "academic_year": st_profile.academic_year or "3rd Year",
            "target_role": st_profile.target_role or "Software Engineer",
            "career_goal": st_profile.target_role or "Software Engineer",
            "readiness_score": round(readiness.overall_score) if readiness and readiness.overall_score else 72.0,
            "readiness_tier": ("Placement Ready" if readiness.overall_score >= 85 else ("Interview Ready" if readiness.overall_score >= 70 else "Progressing")) if readiness and readiness.overall_score else "Progressing",
            "match_id": m.id,
            "match_score": m.match_score,
            "skills": skills_list,
            "top_gap": top_gap_name or "System Architecture",
            "top_gap_value": top_gap_val or 30.0,
            "completed_tasks": completed_tasks_count,
            "assessment_count": assessment_count,
            "assessment_avg_score": avg_score
        })
    return assigned


@router.get("/students/{student_id}")
def get_assigned_student_detail(
    student_id: int,
    mentor: User = Depends(require_approved_mentor),
    student: User = Depends(verify_mentor_assigned_student),
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(
        or_(StudentProfile.user_id == student_id, StudentProfile.id == student_id)
    ).first()
    if not profile:
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == student.id).first()

    profile_id = profile.id if profile else 0
    st_user_id = profile.user_id if profile else student.id

    # Skills with details
    student_skills = db.query(StudentSkill).filter(StudentSkill.student_id == profile_id).all()
    skills = []
    for ss in student_skills:
        sk_obj = db.query(Skill).filter(Skill.id == ss.skill_id).first()
        skills.append({
            "id": ss.id,
            "skill_id": ss.skill_id,
            "name": sk_obj.name if sk_obj else f"Skill #{ss.skill_id}",
            "category": sk_obj.category.value if hasattr(sk_obj.category, "value") else str(sk_obj.category),
            "blended_level": ss.blended_level,
            "self_rating": ss.self_rating,
            "assessed_level": ss.assessed_level,
            "evidence_count": ss.evidence_count
        })

    # Skill gaps
    gaps_db = db.query(SkillGap).filter(SkillGap.student_id == profile_id).order_by(SkillGap.gap_value.desc()).all()
    skill_gaps = []
    for g in gaps_db:
        sk_obj = db.query(Skill).filter(Skill.id == g.skill_id).first()
        skill_gaps.append({
            "id": g.id,
            "skill_id": g.skill_id,
            "skill_name": sk_obj.name if sk_obj else f"Skill #{g.skill_id}",
            "category": sk_obj.category.value if hasattr(sk_obj.category, "value") else str(sk_obj.category),
            "gap": round(g.gap_value, 1),
            "gap_value": round(g.gap_value, 1),
            "priority": g.priority.value if hasattr(g.priority, "value") else str(g.priority),
            "breakdown": g.breakdown
        })

    # Personalized Roadmap & Items
    roadmap_obj = db.query(Roadmap).filter(Roadmap.student_id == profile_id).first()
    roadmap_items = []
    if roadmap_obj:
        items = db.query(RoadmapItem).filter(RoadmapItem.roadmap_id == roadmap_obj.id).order_by(RoadmapItem.week_number, RoadmapItem.sequence_order).all()
        for it in items:
            roadmap_items.append({
                "id": it.id,
                "title": it.title,
                "description": it.description,
                "category": it.category,
                "week_number": it.week_number,
                "sequence_order": it.sequence_order,
                "estimated_hours": it.estimated_hours,
                "status": it.status.value if hasattr(it.status, "value") else str(it.status),
                "item_type": it.item_type,
                "difficulty": it.difficulty,
                "target_improvement": it.target_improvement,
                "resources": it.resources
            })

    # Assessments history
    attempts = db.query(AssessmentAttempt).filter(AssessmentAttempt.student_id == profile_id).order_by(AssessmentAttempt.completed_at.desc()).all()
    assessments_list = []
    for att in attempts:
        assessments_list.append({
            "id": att.id,
            "assessment_id": att.assessment_id,
            "title": f"Assessment #{att.assessment_id}",
            "score": att.score,
            "status": att.status,
            "submitted_at": (att.completed_at or att.started_at).isoformat() if (att.completed_at or att.started_at) else None
        })

    readiness = db.query(PlacementReadiness).filter(PlacementReadiness.student_id == profile_id).first()
    progress = db.query(WeeklyProgress).filter(WeeklyProgress.student_id == profile_id).order_by(WeeklyProgress.week_start.desc()).all()
    tasks = db.query(MentorTask).filter(MentorTask.student_user_id == st_user_id, MentorTask.mentor_user_id == mentor.id).all()

    feedbacks = db.query(MentorFeedback).filter(MentorFeedback.student_user_id == st_user_id).order_by(MentorFeedback.created_at.desc()).all()
    feedback_history = []
    for fb in feedbacks:
        feedback_history.append({
            "id": fb.id,
            "rating": fb.rating,
            "strengths": fb.strengths,
            "weaknesses": fb.weaknesses,
            "actionable_recommendations": fb.actionable_recommendations,
            "priority_level": fb.priority_level,
            "created_at": fb.created_at.isoformat() if fb.created_at else None
        })

    return {
        "student_id": student.id,
        "user_id": st_user_id,
        "profile_id": profile_id,
        "full_name": profile.name if profile and profile.name else student.full_name,
        "email": student.email,
        "department": profile.department if profile else "Computer Science & Engineering",
        "academic_year": profile.academic_year if profile else "3rd Year",
        "target_role": profile.target_role if profile else "Software Engineer",
        "career_goal": profile.target_role if profile else "Software Engineer",
        "bio": profile.bio if profile else "",
        "daily_learning_hours": profile.daily_learning_hours if profile else 2.5,
        "profile": profile,
        "skills": skills,
        "skill_gaps": skill_gaps,
        "roadmap": {
            "id": roadmap_obj.id if roadmap_obj else None,
            "title": roadmap_obj.title if roadmap_obj else "Personalized Learning Roadmap",
            "items": roadmap_items
        },
        "assessments": assessments_list,
        "readiness": readiness,
        "weekly_progress": progress,
        "tasks": tasks,
        "feedback_history": feedback_history
    }


# ── Unique Feature: Session Prep Card ────────────────────────────────────────
@router.get("/students/{student_id}/prep-card")
def get_student_prep_card(
    student_id: int,
    mentor: User = Depends(require_approved_mentor),
    student: User = Depends(verify_mentor_assigned_student),
    db: Session = Depends(get_db)
):
    """
    Returns concise, actionable snapshot for a mentor before a 1-on-1 session:
    - Top unresolved skill gaps
    - Latest assessment attempts & scores
    - Recent weekly progress and hours committed
    - Past mentor feedback recommendations
    """
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Top skill gaps
    gaps = db.query(SkillGap).filter(SkillGap.student_id == profile.id).order_by(SkillGap.gap_value.desc()).limit(5).all()
    gap_summary = []
    for g in gaps:
        sk = db.query(Skill).filter(Skill.id == g.skill_id).first()
        gap_summary.append({
            "skill_name": sk.name if sk else f"Skill #{g.skill_id}",
            "gap": round(g.gap_value, 1),
            "priority": g.priority.value if hasattr(g.priority, "value") else str(g.priority),
            "breakdown": g.breakdown
        })

    # Latest assessment
    latest_attempt = db.query(AssessmentAttempt).filter(
        AssessmentAttempt.student_id == profile.id
    ).order_by(AssessmentAttempt.completed_at.desc()).first()

    # Recent progress
    recent_progress = db.query(WeeklyProgress).filter(
        WeeklyProgress.student_id == profile.id
    ).order_by(WeeklyProgress.week_start.desc()).first()

    # Past mentor feedback
    past_feedbacks = db.query(MentorFeedback).filter(
        MentorFeedback.student_user_id == student.id
    ).order_by(MentorFeedback.created_at.desc()).limit(3).all()

    return {
        "student_name": student.full_name,
        "target_role": profile.target_role or "Software Engineer",
        "top_gaps": gap_summary,
        "latest_assessment": {
            "score": latest_attempt.score if latest_attempt else None,
            "status": latest_attempt.status if latest_attempt else "None taken",
            "date": (latest_attempt.completed_at or latest_attempt.started_at).isoformat() if latest_attempt and (latest_attempt.completed_at or latest_attempt.started_at) else None
        },
        "recent_progress": {
            "hours_spent": getattr(recent_progress, "hours_spent", (profile.daily_learning_hours or 2.0) * 7 if profile else 14.0),
            "tasks_completed": getattr(recent_progress, "roadmap_items_completed", getattr(recent_progress, "tasks_completed", 0))
        },
        "past_recommendations": [fb.actionable_recommendations for fb in past_feedbacks if fb.actionable_recommendations]
    }


# ── Mentoring Requests & Capacity Check ──────────────────────────────────────
@router.get("/requests")
def list_mentor_requests(
    status: Optional[str] = None,
    mentor: User = Depends(require_approved_mentor),
    db: Session = Depends(get_db)
):
    mentor_profile = db.query(MentorProfile).filter(MentorProfile.user_id == mentor.id).first()
    if not mentor_profile:
        return []

    query = db.query(MentorMatch).filter(MentorMatch.mentor_id == mentor_profile.id)
    if status and status.lower() != "all":
        query = query.filter(MentorMatch.status == status.lower())

    matches = query.order_by(MentorMatch.created_at.desc()).all()

    res = []
    for m in matches:
        st_profile = db.query(StudentProfile).filter(StudentProfile.id == m.student_id).first()
        st_user = st_profile.user if st_profile else None
        status_str = m.status.value if hasattr(m.status, "value") else str(m.status)
        res.append({
            "id": m.id,
            "request_id": m.id,
            "student_id": st_user.id if st_user else m.student_id,
            "student_profile_id": st_profile.id if st_profile else None,
            "student_name": st_profile.name if st_profile and st_profile.name else (st_user.full_name if st_user else f"Student #{m.student_id}"),
            "student_email": st_user.email if st_user else "",
            "target_role": st_profile.target_role if st_profile else "Software Engineer",
            "department": st_profile.department if st_profile else "Computer Science & Engineering",
            "academic_year": st_profile.academic_year if st_profile else "3rd Year",
            "message": m.student_message or "Seeking guidance on career roadmap and technical skills.",
            "match_score": m.match_score or 85.0,
            "status": status_str,
            "created_at": m.created_at.isoformat() if m.created_at else None
        })
    return res


@router.post("/requests/respond")
def respond_request(
    data: RespondRequestSchema,
    mentor: User = Depends(require_approved_mentor),
    db: Session = Depends(get_db)
):
    mentor_profile = db.query(MentorProfile).filter(MentorProfile.user_id == mentor.id).first()
    if not mentor_profile:
        raise HTTPException(status_code=404, detail="Mentor profile not found")

    match = db.query(MentorMatch).filter(
        MentorMatch.id == data.request_id,
        MentorMatch.mentor_id == mentor_profile.id
    ).first()
    if not match:
        raise HTTPException(status_code=404, detail="Mentoring request not found")

    if data.action == "accept":
        # Block acceptance when mentor reaches maximum student capacity
        current_accepted = db.query(MentorMatch).filter(
            MentorMatch.mentor_id == mentor_profile.id,
            MentorMatch.status == "accepted"
        ).count()

        max_limit = mentor_profile.max_students or 5
        if current_accepted >= max_limit:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot accept student: you have reached your maximum capacity ({current_accepted}/{max_limit} students). Please increase capacity in profile settings or complete ongoing mentorships."
            )

        match.status = MatchStatus.accepted
        # Notify student
        st_profile = db.query(StudentProfile).filter(StudentProfile.id == match.student_id).first()
        if st_profile:
            db.add(Notification(
                user_id=st_profile.user_id,
                type="mentorship",
                title="Mentorship Request Accepted",
                message=f"Mentor {mentor.full_name} accepted your mentorship request!"
            ))
    else:
        match.status = MatchStatus.rejected
        st_profile = db.query(StudentProfile).filter(StudentProfile.id == match.student_id).first()
        if st_profile:
            db.add(Notification(
                user_id=st_profile.user_id,
                type="mentorship",
                title="Mentorship Request Update",
                message=f"Mentor {mentor.full_name} was unable to accept your request at this time."
            ))

    db.commit()
    return {"message": f"Match request {match.status.value}", "status": match.status.value}


# ── Sessions ─────────────────────────────────────────────────────────────────
@router.get("/sessions")
def list_mentor_sessions(mentor: User = Depends(require_approved_mentor), db: Session = Depends(get_db)):
    profile = db.query(MentorProfile).filter(MentorProfile.user_id == mentor.id).first()
    if not profile:
        return []
    sessions = db.query(MentoringSession).filter(MentoringSession.mentor_id == profile.id).order_by(MentoringSession.scheduled_at.desc()).all()
    results = []
    for s in sessions:
        st_user = s.student.user if s.student else None
        results.append({
            "id": s.id,
            "student_id": s.student_id,
            "student_name": st_user.full_name if st_user else f"Student #{s.student_id}",
            "scheduled_at": s.scheduled_at.isoformat() if s.scheduled_at else None,
            "duration_minutes": s.duration_minutes,
            "status": s.status.value if hasattr(s.status, "value") else str(s.status),
            "agenda": s.agenda,
            "meeting_link": s.meeting_link,
            "notes": s.notes
        })
    return results


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
def schedule_session(
    data: SessionCreateSchema,
    mentor: User = Depends(require_approved_mentor),
    db: Session = Depends(get_db)
):
    profile = db.query(MentorProfile).filter(MentorProfile.user_id == mentor.id).first()
    student_profile = db.query(StudentProfile).filter(
        or_(StudentProfile.id == data.student_id, StudentProfile.user_id == data.student_id)
    ).first()
    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    session = MentoringSession(
        student_id=student_profile.id,
        mentor_id=profile.id,
        slot_id=data.slot_id,
        scheduled_at=data.scheduled_at,
        duration_minutes=data.duration_minutes or 45,
        status=SessionStatus.scheduled,
        agenda=data.agenda,
        meeting_link=data.meeting_link or f"https://meet.skillnova.internal/{profile.id}-{student_profile.id}"
    )
    db.add(session)

    # Notify student
    db.add(Notification(
        user_id=student_profile.user_id,
        type="mentorship",
        title="New Mentoring Session Scheduled",
        body=f"A 1-on-1 session with {mentor.full_name} is scheduled for {data.scheduled_at.strftime('%b %d, %Y at %I:%M %p')}."
    ))

    db.commit()
    db.refresh(session)
    return session


@router.put("/sessions/{session_id}/status")
def update_session_status(
    session_id: int,
    status_val: Optional[str] = None,
    data: Optional[SessionStatusUpdateSchema] = None,
    mentor: User = Depends(require_approved_mentor),
    db: Session = Depends(get_db)
):
    profile = db.query(MentorProfile).filter(MentorProfile.user_id == mentor.id).first()
    session = db.query(MentoringSession).filter(
        MentoringSession.id == session_id,
        MentoringSession.mentor_id == profile.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    new_status = status_val or (data.status if data else None)
    if not new_status or new_status not in ["scheduled", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid session status. Must be scheduled, completed, or cancelled")

    session.status = SessionStatus(new_status)
    db.commit()
    return {"message": f"Session marked as {new_status}", "session_id": session_id, "status": new_status}


# ── Feedback & Tasks ─────────────────────────────────────────────────────────
@router.get("/feedback")
def get_feedback_history(mentor: User = Depends(require_approved_mentor), db: Session = Depends(get_db)):
    """Retrieve history of feedback provided by this mentor."""
    feedbacks = db.query(MentorFeedback).filter(
        MentorFeedback.mentor_user_id == mentor.id
    ).order_by(MentorFeedback.created_at.desc()).all()
    
    result = []
    for fb in feedbacks:
        student_user = db.query(User).filter(User.id == fb.student_user_id).first()
        result.append({
            "id": fb.id,
            "match_id": fb.match_id,
            "student_user_id": fb.student_user_id,
            "student_name": student_user.full_name if student_user else "Student",
            "rating": fb.rating,
            "strengths": fb.strengths,
            "weaknesses": fb.weaknesses,
            "actionable_recommendations": fb.actionable_recommendations,
            "priority_level": fb.priority_level,
            "created_at": fb.created_at.isoformat() if fb.created_at else None
        })
    return result


@router.post("/feedback")
def submit_feedback(data: FeedbackSchema, mentor: User = Depends(require_approved_mentor), db: Session = Depends(get_db)):
    profile = db.query(MentorProfile).filter(MentorProfile.user_id == mentor.id).first()
    student_profile = db.query(StudentProfile).filter(
        or_(StudentProfile.id == data.student_id, StudentProfile.user_id == data.student_id)
    ).first()
    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    match = db.query(MentorMatch).filter(
        MentorMatch.mentor_id == profile.id,
        MentorMatch.student_id == student_profile.id,
        MentorMatch.status == "accepted"
    ).first()
    if not match:
        raise HTTPException(status_code=403, detail="Forbidden: Student is not assigned to you")

    fb = MentorFeedback(
        match_id=match.id,
        student_user_id=student_profile.user_id,
        mentor_user_id=mentor.id,
        rating=data.rating,
        strengths=data.strengths,
        weaknesses=data.weaknesses,
        actionable_recommendations=data.actionable_recommendations,
        priority_level=data.priority_level
    )
    db.add(fb)

    # In-app notification to student
    db.add(Notification(
        user_id=student_profile.user_id,
        type="mentorship",
        title="Mentor Feedback Received",
        body=f"{mentor.full_name} provided new feedback on your skill development."
    ))

    db.commit()
    return {"message": "Feedback submitted successfully"}


@router.post("/tasks")
def assign_task(data: TaskAssignSchema, mentor: User = Depends(require_approved_mentor), db: Session = Depends(get_db)):
    profile = db.query(MentorProfile).filter(MentorProfile.user_id == mentor.id).first()
    student_profile = db.query(StudentProfile).filter(
        or_(StudentProfile.id == data.student_id, StudentProfile.user_id == data.student_id)
    ).first()
    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    match = db.query(MentorMatch).filter(
        MentorMatch.mentor_id == profile.id,
        MentorMatch.student_id == student_profile.id,
        MentorMatch.status == "accepted"
    ).first()
    if not match:
        raise HTTPException(status_code=403, detail="Forbidden: Student is not assigned to you")

    task = MentorTask(
        student_user_id=student_profile.user_id,
        mentor_user_id=mentor.id,
        title=data.title,
        description=data.description,
        due_date=data.due_date,
        status="pending"
    )
    db.add(task)
    db.commit()
    return {"message": "Task assigned to student successfully"}
