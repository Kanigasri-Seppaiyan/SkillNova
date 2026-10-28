"""
main.py — FastAPI application entry point with role-namespaced routers.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings

settings = get_settings()

app = FastAPI(
    title="SkillNova — Smart AI Career Companion",
    description="""
## Overview
AI-powered career development platform with three strictly separated roles: Student, Mentor, Admin.

## Security & RBAC
- `/api/auth/*` → Auth endpoints (register, login, JWT claims)
- `/api/student/*` → Student endpoints (guarded by `get_current_student`)
- `/api/mentor/*` → Mentor endpoints (guarded by `get_current_mentor` & assigned student verification)
- `/api/admin/*` → Admin endpoints (guarded by `get_current_admin` & audit logging)
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    detail = str(exc) if settings.environment == "development" else "An internal server error occurred."
    return JSONResponse(status_code=500, content={"detail": detail})


from routers import (
    auth, student, mentor, admin,
    skills, assessments, roadmap, projects,
    resume, placement, mentors, mentor_dashboard,
    notifications, progress, career, ai, skill_gaps, students
)

# Auth, Student, Mentor, Admin core RBAC routers
app.include_router(auth.router)
app.include_router(student.router)
app.include_router(student.router_direct)
app.include_router(student.router_direct, prefix="/api")
app.include_router(student.router_student_direct)
app.include_router(student.router_student_direct, prefix="/api")
app.include_router(mentor.router)
app.include_router(admin.router)

# Feature domain routers (both /api/<prefix> and /<prefix> for flexibility)
feature_routers = [
    skills.router,
    assessments.router,
    roadmap.router,
    projects.router,
    resume.router,
    placement.router,
    mentors.router,
    mentor_dashboard.router,
    mentor_dashboard.legacy_mentor_router,
    notifications.router,
    progress.router,
    career.router,
    ai.router,
    skill_gaps.router,
    students.router,
]

for r in feature_routers:
    app.include_router(r)
    app.include_router(r, prefix="/api")



@app.on_event("startup")
def on_startup():
    from config import get_settings
    settings = get_settings()
    # Configure development-only demo mentor account(s) if not already exists
    if settings.environment == "development":
        from database import SessionLocal
        from models.user import User, UserRole, MentorProfile, MentorStatus
        from services.auth_service import hash_password

        db = SessionLocal()
        try:
            demo_mentors = [
                ("faculty.demo@bitsathy.ac.in", "Faculty@123", "Dr. Demo Faculty Mentor", UserRole.mentor),
                ("faculty@bitsathy.ac.in", "Faculty@123", "Faculty Mentor", UserRole.mentor),
                ("staff@bitsathy.ac.in", "Faculty@123", "Prof. Staff Advisor", UserRole.staff),
                ("faculty.staff@bitsathy.ac.in", "Faculty@123", "Faculty Staff Advisor", UserRole.staff),
            ]
            from models.user import StudentProfile
            from models.mentor import MentorMatch, MatchStatus
            student_profile = db.query(StudentProfile).first()

            for demo_email, demo_pwd, demo_name, demo_role in demo_mentors:
                user = db.query(User).filter(User.email == demo_email).first()
                if not user:
                    user = User(
                        email=demo_email,
                        password_hash=hash_password(demo_pwd),
                        role=demo_role,
                        is_active=True
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)

                    profile = MentorProfile(
                        user_id=user.id,
                        name=demo_name,
                        bio="Senior Faculty & Technical Career Advisor at Bannari Amman Institute of Technology.",
                        domain="Computer Science & Engineering",
                        years_experience=12,
                        availability_hours_per_week=10.0,
                        status=MentorStatus.approved,
                        max_students=15
                    )
                    db.add(profile)
                    db.commit()
                    db.refresh(profile)
                else:
                    if user.role != demo_role:
                        user.role = demo_role
                    user.password_hash = hash_password(demo_pwd)
                    user.is_active = True
                    profile = db.query(MentorProfile).filter(MentorProfile.user_id == user.id).first()
                    if not profile:
                        profile = MentorProfile(
                            user_id=user.id,
                            name=demo_name,
                            bio="Senior Faculty & Technical Career Advisor at Bannari Amman Institute of Technology.",
                            domain="Computer Science & Engineering",
                            years_experience=12,
                            availability_hours_per_week=10.0,
                            status=MentorStatus.approved,
                            max_students=15
                        )
                        db.add(profile)
                    else:
                        profile.status = MentorStatus.approved
                    db.commit()
                    db.refresh(profile)

                # Ensure assigned student match for staff/mentors
                if student_profile and profile:
                    match = db.query(MentorMatch).filter(
                        MentorMatch.mentor_id == profile.id,
                        MentorMatch.student_id == student_profile.id
                    ).first()
                    if not match:
                        db.add(MentorMatch(
                            student_id=student_profile.id,
                            mentor_id=profile.id,
                            match_score=94.0,
                            status=MatchStatus.accepted,
                            student_message="Career guidance & roadmap milestone check-in."
                        ))
                        db.commit()
        except Exception as e:
            db.rollback()
            print(f"[Warning] Failed to ensure dev demo mentor account: {e}")
        finally:
            db.close()


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "SkillNova API", "version": "1.0.0"}


@app.get("/", tags=["Health"])
def root():
    return {
        "message": "SkillNova API is running",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health"
    }
