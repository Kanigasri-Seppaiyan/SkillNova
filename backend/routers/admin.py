"""
routers/admin.py — Admin-namespaced endpoints (/api/admin/*).
Strictly guarded by get_current_admin dependency.
Audited endpoints log directly into audit_logs.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import csv
import io

from database import get_db
from models.user import User, UserRole, StudentProfile, MentorProfile, MentorStatus
from models.mentor import MentorSkill, MentorMatch, MatchStatus, AvailabilitySlot, MentoringSession
from models.skill import Skill, StudentSkill
from models.career import Career, CareerSkillRequirement
from models.assessment import Assessment, AssessmentQuestion, AssessmentAttempt
from models.project import Project
from models.resource import Resource
from models.config import AppConfig
from models.audit import AuditLog
from models.roadmap import Roadmap
from models.notification import Notification
from models.progress import WeeklyProgress
from dependencies import get_current_admin
from services.skill_gap_service import compute_student_gaps

router = APIRouter(prefix="/api/admin", tags=["Admin"])


class SkillCreateSchema(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    difficulty_level: Optional[int] = 1


class CareerCreateSchema(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = "Software Engineering"
    target_tier: Optional[str] = "Tier 1 Product"


class CareerReqSchema(BaseModel):
    career_id: int
    skill_id: int
    required_level: float
    importance_weight: Optional[float] = 1.0


class AuditedScoreOverrideSchema(BaseModel):
    student_id: int
    assessment_attempt_id: int
    new_score: float
    reason: str


class MentorDecisionSchema(BaseModel):
    reason: Optional[str] = "Administrative review decision"


class MentorAssignSchema(BaseModel):
    student_id: int
    mentor_id: int
    notes: Optional[str] = "Administrative mentor assignment"


class UserRoleUpdateSchema(BaseModel):
    role: str
    reason: Optional[str] = "Administrative role change"


@router.get("/dashboard")
@router.get("/analytics")
def get_admin_dashboard(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    total_students = db.query(User).filter(User.role == "student").count()
    total_mentors = db.query(User).filter(User.role == "mentor").count()
    pending_mentors = db.query(MentorProfile).filter(MentorProfile.status == "pending").count()
    approved_mentors = db.query(MentorProfile).filter(MentorProfile.status == "approved").count()
    total_assessments_taken = db.query(AssessmentAttempt).count()
    total_skills = db.query(Skill).count()
    total_careers = db.query(Career).count()
    total_roadmaps = db.query(Roadmap).count()
    total_sessions = db.query(MentoringSession).count()

    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_mentors": total_mentors,
        "pending_mentors": pending_mentors,
        "approved_mentors": approved_mentors,
        "total_assessments_taken": total_assessments_taken,
        "total_skills": total_skills,
        "total_careers": total_careers,
        "total_roadmaps": total_roadmaps,
        "total_sessions": total_sessions
    }


@router.get("/users")
def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User)

    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if search:
        search_fmt = f"%{search.strip().lower()}%"
        query = query.filter(or_(
            func.lower(User.email).like(search_fmt),
            User.student_profile.has(func.lower(StudentProfile.name).like(search_fmt)),
            User.mentor_profile.has(func.lower(MentorProfile.name).like(search_fmt))
        ))

    total = query.count()
    offset = (page - 1) * limit
    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    items = []
    for u in users:
        role_val = u.role.value if hasattr(u.role, "value") else str(u.role)
        m_status = None
        if role_val == "mentor" and u.mentor_profile:
            st = u.mentor_profile.status
            m_status = st.value if hasattr(st, "value") else str(st)

        items.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": role_val,
            "is_active": u.is_active,
            "mentor_status": m_status,
            "created_at": u.created_at.isoformat() if u.created_at else None
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if total > 0 else 1
    }


@router.put("/users/{id}/status")
def update_user_status(
    id: int,
    is_active: bool,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    before_val = {"is_active": user.is_active}
    user.is_active = is_active
    after_val = {"is_active": is_active}

    log_entry = AuditLog(
        actor_user_id=admin.id,
        action_type="USER_STATUS_CHANGE",
        target_table="users",
        target_id=user.id,
        before_value=before_val,
        after_value=after_val,
        reason=f"Admin set is_active={is_active}",
        timestamp=datetime.utcnow()
    )
    db.add(log_entry)
    db.commit()

    return {"message": f"User status updated to {is_active}", "audit_id": log_entry.id}


@router.put("/users/{id}/role")
def update_user_role(
    id: int,
    data: UserRoleUpdateSchema,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.role not in ["student", "mentor", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'student', 'mentor', or 'admin'.")

    before_role = user.role.value if hasattr(user.role, "value") else str(user.role)
    user.role = UserRole(data.role)

    # Ensure profile exists for new role
    if data.role == "mentor" and not user.mentor_profile:
        mp = MentorProfile(user_id=user.id, name=user.full_name, status=MentorStatus.approved)
        db.add(mp)
    elif data.role == "student" and not user.student_profile:
        sp = StudentProfile(user_id=user.id, name=user.full_name)
        db.add(sp)

    log_entry = AuditLog(
        actor_user_id=admin.id,
        action_type="USER_ROLE_CHANGE",
        target_table="users",
        target_id=user.id,
        before_value={"role": before_role},
        after_value={"role": data.role},
        reason=data.reason,
        timestamp=datetime.utcnow()
    )
    db.add(log_entry)
    db.commit()

    return {"message": f"User role updated to {data.role}", "audit_id": log_entry.id}


# ── Mentor Application Review ────────────────────────────────────────────────
@router.get("/mentors/pending")
def list_pending_mentors(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    pending = db.query(MentorProfile).filter(MentorProfile.status == "pending").all()
    results = []
    for m in pending:
        user = m.user
        skills = [s.skill.name for s in m.mentor_skills if s.skill]
        results.append({
            "mentor_id": m.id,
            "user_id": m.user_id,
            "name": m.name,
            "email": user.email if user else "",
            "bio": m.bio,
            "years_experience": m.years_experience,
            "domain": m.domain,
            "linkedin_url": m.linkedin_url,
            "availability_hours_per_week": m.availability_hours_per_week,
            "skills": skills,
            "created_at": m.created_at.isoformat() if m.created_at else None
        })
    return results


@router.post("/mentors/{id}/approve")
def approve_mentor(
    id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    profile = db.query(MentorProfile).filter(MentorProfile.id == id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Mentor profile not found")

    before_val = {"status": str(profile.status)}
    profile.status = MentorStatus.approved
    after_val = {"status": "approved"}

    log_entry = AuditLog(
        actor_user_id=admin.id,
        action_type="MENTOR_APPROVED",
        target_table="mentor_profiles",
        target_id=profile.id,
        before_value=before_val,
        after_value=after_val,
        reason="Admin approval",
        timestamp=datetime.utcnow()
    )
    db.add(log_entry)

    # In-app notification to mentor
    notif = Notification(
        user_id=profile.user_id,
        type="system",
        title="Mentor Application Approved",
        body="Your application to be a SkillNova mentor has been approved. You now have full access to the Mentor Hub!"
    )
    db.add(notif)
    db.commit()

    return {"message": f"Mentor {profile.name} approved successfully", "audit_id": log_entry.id}


@router.post("/mentors/{id}/reject")
def reject_mentor(
    id: int,
    data: MentorDecisionSchema,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    profile = db.query(MentorProfile).filter(MentorProfile.id == id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Mentor profile not found")

    before_val = {"status": str(profile.status)}
    profile.status = MentorStatus.rejected
    profile.rejection_reason = data.reason
    after_val = {"status": "rejected", "rejection_reason": data.reason}

    log_entry = AuditLog(
        actor_user_id=admin.id,
        action_type="MENTOR_REJECTED",
        target_table="mentor_profiles",
        target_id=profile.id,
        before_value=before_val,
        after_value=after_val,
        reason=data.reason,
        timestamp=datetime.utcnow()
    )
    db.add(log_entry)

    notif = Notification(
        user_id=profile.user_id,
        type="system",
        title="Mentor Application Update",
        body=f"Your mentor application was not approved. Reason: {data.reason}"
    )
    db.add(notif)
    db.commit()

    return {"message": f"Mentor {profile.name} rejected", "audit_id": log_entry.id}


@router.post("/mentors/{id}/suspend")
def suspend_mentor(
    id: int,
    data: MentorDecisionSchema,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    profile = db.query(MentorProfile).filter(MentorProfile.id == id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Mentor profile not found")

    before_val = {"status": str(profile.status)}
    profile.status = MentorStatus.suspended
    after_val = {"status": "suspended"}

    log_entry = AuditLog(
        actor_user_id=admin.id,
        action_type="MENTOR_SUSPENDED",
        target_table="mentor_profiles",
        target_id=profile.id,
        before_value=before_val,
        after_value=after_val,
        reason=data.reason,
        timestamp=datetime.utcnow()
    )
    db.add(log_entry)
    db.commit()

    return {"message": f"Mentor {profile.name} suspended", "audit_id": log_entry.id}


# ── Mentor-to-Student Assignment ─────────────────────────────────────────────
@router.post("/mentor-assignments")
def assign_mentor_to_student(
    data: MentorAssignSchema,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    student_profile = db.query(StudentProfile).filter(
        or_(StudentProfile.id == data.student_id, StudentProfile.user_id == data.student_id)
    ).first()
    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    mentor_profile = db.query(MentorProfile).filter(
        or_(MentorProfile.id == data.mentor_id, MentorProfile.user_id == data.mentor_id)
    ).first()
    if not mentor_profile:
        raise HTTPException(status_code=404, detail="Mentor profile not found")

    if str(mentor_profile.status) != "approved":
        raise HTTPException(status_code=400, detail="Cannot assign unapproved mentor")

    # Check capacity limit
    active_matches_count = db.query(MentorMatch).filter(
        MentorMatch.mentor_id == mentor_profile.id,
        MentorMatch.status == "accepted"
    ).count()

    max_capacity = mentor_profile.max_students or 5
    if active_matches_count >= max_capacity:
        raise HTTPException(
            status_code=409,
            detail=f"Mentor has reached maximum student capacity ({active_matches_count}/{max_capacity})"
        )

    # Check existing match
    match = db.query(MentorMatch).filter(
        MentorMatch.student_id == student_profile.id,
        MentorMatch.mentor_id == mentor_profile.id
    ).first()

    if not match:
        match = MentorMatch(
            student_id=student_profile.id,
            mentor_id=mentor_profile.id,
            status=MatchStatus.accepted,
            match_score=95.0,
            mentor_notes=data.notes
        )
        db.add(match)
    else:
        match.status = MatchStatus.accepted
        match.mentor_notes = data.notes

    log_entry = AuditLog(
        actor_user_id=admin.id,
        action_type="MENTOR_STUDENT_ASSIGNED",
        target_table="mentor_matches",
        target_id=student_profile.id,
        before_value=None,
        after_value={"student_id": student_profile.id, "mentor_id": mentor_profile.id},
        reason=data.notes,
        timestamp=datetime.utcnow()
    )
    db.add(log_entry)

    # Notify student
    db.add(Notification(
        user_id=student_profile.user_id,
        type="mentorship",
        title="Mentor Assigned",
        message=f"You have been assigned to mentor {mentor_profile.name}."
    ))

    # Notify mentor
    db.add(Notification(
        user_id=mentor_profile.user_id,
        type="mentorship",
        title="New Student Assigned",
        message=f"Student {student_profile.name} has been assigned to your roster."
    ))

    db.commit()
    return {"message": "Mentor assigned successfully", "match_id": match.id}


# ── Health Panel ─────────────────────────────────────────────────────────────
@router.get("/health-panel")
def get_health_panel(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    two_weeks_ago = datetime.utcnow() - timedelta(days=14)
    two_days_ago = datetime.utcnow() - timedelta(days=2)

    # Stalled students: students with no progress recorded in the last 14 days
    all_students = db.query(StudentProfile).all()
    stalled_count = 0
    stalled_items = []
    for sp in all_students:
        recent_prog = db.query(WeeklyProgress).filter(
            WeeklyProgress.student_id == sp.id,
            WeeklyProgress.week_start >= two_weeks_ago
        ).first()
        if not recent_prog:
            stalled_count += 1
            if len(stalled_items) < 10:
                stalled_items.append({
                    "student_id": sp.id,
                    "name": sp.name,
                    "target_role": sp.target_role,
                    "email": sp.user.email if sp.user else ""
                })

    # Unanswered mentor requests older than 48 hours
    unanswered_requests = db.query(MentorMatch).filter(
        MentorMatch.status == "pending",
        MentorMatch.created_at <= two_days_ago
    ).count()

    # Unassigned students: students without any accepted mentor match
    unassigned_count = 0
    for sp in all_students:
        accepted_match = db.query(MentorMatch).filter(
            MentorMatch.student_id == sp.id,
            MentorMatch.status == "accepted"
        ).first()
        if not accepted_match:
            unassigned_count += 1

    pending_mentor_apps = db.query(MentorProfile).filter(MentorProfile.status == "pending").count()

    return {
        "stalled_students_count": stalled_count,
        "stalled_students": stalled_items,
        "unanswered_requests_count": unanswered_requests,
        "unassigned_students_count": unassigned_count,
        "pending_mentor_applications": pending_mentor_apps
    }


# ── Reports & CSV Export ─────────────────────────────────────────────────────
@router.get("/reports/export-csv")
def export_csv_report(
    report_type: str = Query("students", pattern="^(students|mentors|audit)$"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "students":
        writer.writerow(["Student ID", "Email", "Name", "Target Role", "Daily Learning Hours", "Onboarding Done", "Registered At"])
        students = db.query(StudentProfile).all()
        for s in students:
            writer.writerow([
                s.id,
                s.user.email if s.user else "",
                s.name,
                s.target_role or "N/A",
                s.daily_learning_hours,
                s.onboarding_completed,
                s.created_at.isoformat() if s.created_at else ""
            ])
        filename = "skillnova_students_report.csv"

    elif report_type == "mentors":
        writer.writerow(["Mentor ID", "Email", "Name", "Domain", "Experience (Years)", "Status", "Max Capacity", "Availability Hours"])
        mentors = db.query(MentorProfile).all()
        for m in mentors:
            writer.writerow([
                m.id,
                m.user.email if m.user else "",
                m.name,
                m.domain or "N/A",
                m.years_experience,
                str(m.status),
                m.max_students,
                m.availability_hours_per_week
            ])
        filename = "skillnova_mentors_report.csv"

    else:  # audit
        writer.writerow(["Log ID", "Actor User ID", "Action", "Target Table", "Target ID", "Reason", "Timestamp"])
        logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(500).all()
        for l in logs:
            writer.writerow([
                l.id,
                l.actor_user_id,
                l.action_type,
                l.target_table,
                l.target_id,
                l.reason,
                l.timestamp.isoformat() if l.timestamp else ""
            ])
        filename = "skillnova_audit_logs.csv"

    content = output.getvalue()
    output.close()

    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# ── Skills Master Data ───────────────────────────────────────────────────────
@router.get("/skills")
def list_skills(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Skill).all()


@router.post("/skills", status_code=status.HTTP_201_CREATED)
def create_skill(data: SkillCreateSchema, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    skill = Skill(**data.dict())
    db.add(skill)
    db.commit()
    db.refresh(skill)

    # Log action
    db.add(AuditLog(
        actor_user_id=admin.id,
        action_type="SKILL_CREATED",
        target_table="skills",
        target_id=skill.id,
        after_value={"name": skill.name, "category": skill.category},
        reason="Admin skill creation"
    ))
    db.commit()
    return skill


# ── Careers Master Data ──────────────────────────────────────────────────────
@router.get("/careers")
def list_careers(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Career).all()


@router.post("/careers", status_code=status.HTTP_201_CREATED)
def create_career(data: CareerCreateSchema, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    career = Career(**data.dict())
    db.add(career)
    db.commit()
    db.refresh(career)

    db.add(AuditLog(
        actor_user_id=admin.id,
        action_type="CAREER_CREATED",
        target_table="careers",
        target_id=career.id,
        after_value={"title": career.title, "category": career.category},
        reason="Admin career creation"
    ))
    db.commit()
    return career


# ── Career Skill Requirements ────────────────────────────────────────────────
@router.get("/career-requirements")
def list_career_requirements(career_id: Optional[int] = None, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    query = db.query(CareerSkillRequirement)
    if career_id:
        query = query.filter(CareerSkillRequirement.career_id == career_id)
    return query.all()


@router.post("/career-requirements", status_code=status.HTTP_201_CREATED)
def create_or_update_career_requirement(data: CareerReqSchema, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    req = db.query(CareerSkillRequirement).filter(
        CareerSkillRequirement.career_id == data.career_id,
        CareerSkillRequirement.skill_id == data.skill_id
    ).first()

    if not req:
        req = CareerSkillRequirement(
            career_id=data.career_id,
            skill_id=data.skill_id,
            required_level=data.required_level,
            importance_weight=data.importance_weight
        )
        db.add(req)
    else:
        req.required_level = data.required_level
        req.importance_weight = data.importance_weight

    db.commit()

    # Trigger live gap recalculation across all students
    students = db.query(User).filter(User.role == "student").all()
    for st in students:
        compute_student_gaps(st.id, db)

    return {"message": "Career requirement saved and student skill gaps recalculated", "requirement": req}


# ── Audited Score Override ───────────────────────────────────────────────────
@router.post("/score-override")
def audited_score_override(data: AuditedScoreOverrideSchema, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    attempt = db.query(AssessmentAttempt).filter(AssessmentAttempt.id == data.assessment_attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    before_val = {"score": attempt.score, "status": attempt.status}
    attempt.score = data.new_score
    after_val = {"score": data.new_score, "status": attempt.status}

    # Record Immutable Audit Log
    log_entry = AuditLog(
        actor_user_id=admin.id,
        action_type="ASSESSMENT_SCORE_OVERRIDE",
        target_table="assessment_attempts",
        target_id=attempt.id,
        before_value=before_val,
        after_value=after_val,
        reason=data.reason,
        timestamp=datetime.utcnow()
    )
    db.add(log_entry)
    db.commit()

    return {"message": "Audited score override executed", "audit_id": log_entry.id}


@router.get("/audit-logs")
def list_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    action_type: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if action_type:
        query = query.filter(AuditLog.action_type == action_type)

    total = query.count()
    offset = (page - 1) * limit
    logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()

    return {
        "items": logs,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if total > 0 else 1
    }
