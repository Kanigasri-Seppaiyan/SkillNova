"""
seed.py — Idempotent seed script.
Creates all tables (if not present) and seeds:
  - 3 demo accounts (student, mentor, admin)
  - 30 skills across categories
  - Career goal requirements
  - 5 assessments with 10 questions each
  - 5 projects
  - Rich student profile data for demo dashboard
  - app_config rows for configurable weights/thresholds

Run with: python seed.py
Safe to run multiple times.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import Base, engine, SessionLocal
from models import *  # noqa — registers all models
from services.auth_service import hash_password
import json
from datetime import date, timedelta, datetime, timezone

STUDENT_EMAIL = "student@bitsathy.ac.in"
MENTOR_EMAIL = "mentor@bitsathy.ac.in"
FACULTY_DEMO_EMAIL = "faculty@bitsathy.ac.in"
FACULTY_DEMO_PASSWORD = "Faculty@123"
ADMIN_EMAIL = "admin@bitsathy.ac.in"
DEMO_PASSWORD = "password123"


def seed():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        _seed_config(db)
        _seed_skills(db)
        student_user, student_profile = _seed_student(db)
        mentor_user, mentor_profile = _seed_mentor(db)
        _seed_faculty_demo_mentor(db)
        _seed_staff(db)
        admin_user = _seed_admin(db)
        _seed_career_goal_requirements(db, student_profile, db.query(Skill).all())
        _seed_assessments(db)
        _seed_projects(db)
        _seed_demo_student_data(db, student_profile)
        db.commit()
        from seed_pending_mentors import seed_pending_mentors
        seed_pending_mentors()
        print("[SUCCESS] Seed complete!")
        print(f"   Student: {STUDENT_EMAIL} / {DEMO_PASSWORD}")
        print(f"   Mentor:  {MENTOR_EMAIL} / {DEMO_PASSWORD}")
        print(f"   Faculty Demo Mentor: {FACULTY_DEMO_EMAIL} / {FACULTY_DEMO_PASSWORD}")
        print(f"   Staff:   staff@bitsathy.ac.in / Faculty@123")
        print(f"   Admin:   {ADMIN_EMAIL} / {DEMO_PASSWORD}")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed failed: {e}")
        import traceback; traceback.print_exc()
    finally:
        db.close()


def _seed_config(db):
    from models.config import AppConfig
    configs = [
        ("placement_weights", {
            "technical_skills": 0.35, "dsa": 0.15, "projects": 0.15,
            "assessments": 0.15, "resume": 0.10, "communication": 0.05, "consistency": 0.05,
        }, "Placement readiness component weights"),
        ("gap_threshold_high", 30.0, "Gap priority HIGH threshold (gap >= this value)"),
        ("gap_threshold_medium", 15.0, "Gap priority MEDIUM threshold"),
        ("mentor_match_weights", {
            "skill_match": 0.30, "career_match": 0.25, "domain_match": 0.15,
            "availability": 0.10, "experience": 0.10, "preference": 0.10,
        }, "Mentor matching dimension weights"),
    ]
    for key, value, desc in configs:
        existing = db.query(AppConfig).filter(AppConfig.key == key).first()
        if not existing:
            db.add(AppConfig(key=key, value=value, description=desc))
    db.flush()
    print("  Config seeded")


def _seed_skills(db):
    from models.skill import Skill, SkillCategory
    skills_data = [
        # Technical
        ("Python", "Web Dev / Data Science", SkillCategory.technical, "General-purpose programming language", "code"),
        ("JavaScript", "Web Dev", SkillCategory.technical, "Frontend and backend web scripting", "globe"),
        ("TypeScript", "Web Dev", SkillCategory.technical, "Typed superset of JavaScript", "code-2"),
        ("React", "Web Dev", SkillCategory.technical, "Frontend UI library", "layers"),
        ("FastAPI", "Web Dev", SkillCategory.technical, "Modern Python web framework", "zap"),
        ("Node.js", "Web Dev", SkillCategory.technical, "Server-side JavaScript runtime", "server"),
        ("SQL", "Databases", SkillCategory.technical, "Structured Query Language", "database"),
        ("PostgreSQL", "Databases", SkillCategory.technical, "Advanced open-source relational database", "database"),
        ("MongoDB", "Databases", SkillCategory.technical, "NoSQL document database", "database"),
        ("Docker", "DevOps", SkillCategory.technical, "Container platform", "box"),
        ("Git", "DevOps", SkillCategory.technical, "Version control system", "git-branch"),
        ("REST APIs", "Web Dev", SkillCategory.technical, "RESTful API design and consumption", "link"),
        ("Machine Learning", "Data Science", SkillCategory.technical, "ML algorithms and model training", "brain"),
        ("Pandas", "Data Science", SkillCategory.technical, "Python data analysis library", "table"),
        ("NumPy", "Data Science", SkillCategory.technical, "Numerical computing library", "hash"),
        ("TensorFlow", "Data Science", SkillCategory.technical, "Deep learning framework", "activity"),
        ("System Design", "Architecture", SkillCategory.technical, "Designing scalable software systems", "layout"),
        ("CI/CD", "DevOps", SkillCategory.technical, "Continuous integration and delivery", "refresh-cw"),
        # DSA
        ("Arrays & Strings", "DSA", SkillCategory.dsa, "Fundamental data structures", "list"),
        ("Linked Lists", "DSA", SkillCategory.dsa, "Pointer-based linear data structure", "link"),
        ("Trees & Graphs", "DSA", SkillCategory.dsa, "Hierarchical and network data structures", "git-merge"),
        ("Dynamic Programming", "DSA", SkillCategory.dsa, "Optimization via memoization", "layers"),
        ("Sorting & Searching", "DSA", SkillCategory.dsa, "Efficient ordering and lookup algorithms", "search"),
        ("Hash Tables", "DSA", SkillCategory.dsa, "O(1) lookup data structure", "hash"),
        # Soft
        ("Communication", "Soft Skills", SkillCategory.soft, "Verbal and written communication", "message-circle"),
        ("Problem Solving", "Soft Skills", SkillCategory.soft, "Analytical thinking and debugging", "lightbulb"),
        ("Teamwork", "Soft Skills", SkillCategory.soft, "Collaboration in a team environment", "users"),
        ("Time Management", "Soft Skills", SkillCategory.soft, "Prioritizing and scheduling work", "clock"),
        # Domain
        ("Cloud Computing (AWS)", "Cloud", SkillCategory.technical, "Amazon Web Services fundamentals", "cloud"),
        ("Cybersecurity Basics", "Security", SkillCategory.technical, "Fundamental security concepts", "shield"),
    ]
    for name, domain, category, desc, icon in skills_data:
        if not db.query(Skill).filter(Skill.name == name).first():
            db.add(Skill(name=name, domain=domain, category=category, description=desc, icon=icon))
    db.flush()
    print(f"  Skills seeded")


def _seed_student(db):
    from models.user import User, UserRole, StudentProfile
    user = db.query(User).filter(User.email == STUDENT_EMAIL).first()
    if not user:
        user = User(email=STUDENT_EMAIL, password_hash=hash_password(DEMO_PASSWORD), role=UserRole.student)
        db.add(user)
        db.flush()
        profile = StudentProfile(
            user_id=user.id,
            name="Alex Chen",
            bio="Aspiring Full Stack Developer with a passion for building impactful products.",
            target_role="Full Stack Developer",
            daily_learning_hours=2.0,
            preferred_language="en",
            preferred_content_types='["video","article","practice"]',
            onboarding_completed=True,
        )
        db.add(profile)
        db.flush()
        return user, profile
    return user, db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()


def _seed_mentor(db):
    from models.user import User, UserRole, MentorProfile, MentorStatus
    from models.mentor import MentorSkill, AvailabilitySlot
    user = db.query(User).filter(User.email == MENTOR_EMAIL).first()
    if not user:
        user = User(email=MENTOR_EMAIL, password_hash=hash_password(DEMO_PASSWORD), role=UserRole.mentor)
        db.add(user)
        db.flush()
        profile = MentorProfile(
            user_id=user.id,
            name="Sarah Johnson",
            bio="Senior Full Stack Engineer at a FAANG company with 8 years of experience. Passionate about mentoring junior developers.",
            years_experience=8,
            availability_hours_per_week=5,
            domain="Full Stack Developer",
            status=MentorStatus.approved,
            max_students=5,
        )
        db.add(profile)
        db.flush()
        # Add mentor skills
        python_skill = db.query(Skill).filter(Skill.name == "Python").first()
        react_skill = db.query(Skill).filter(Skill.name == "React").first()
        if python_skill:
            db.add(MentorSkill(mentor_id=profile.id, skill_id=python_skill.id, proficiency_level=95))
        if react_skill:
            db.add(MentorSkill(mentor_id=profile.id, skill_id=react_skill.id, proficiency_level=90))
        # Add availability slots
        db.add(AvailabilitySlot(mentor_id=profile.id, day_of_week="Tuesday", start_time="14:00", end_time="16:00", is_active=True))
        db.add(AvailabilitySlot(mentor_id=profile.id, day_of_week="Thursday", start_time="15:00", end_time="17:00", is_active=True))
        db.flush()
        return user, profile
    else:
        profile = db.query(MentorProfile).filter(MentorProfile.user_id == user.id).first()
        if profile and getattr(profile, "status", None) != MentorStatus.approved:
            profile.status = MentorStatus.approved
            db.flush()
    return user, profile


def _seed_faculty_demo_mentor(db):
    from models.user import User, UserRole, MentorProfile, MentorStatus
    demo_accounts = [
        ("faculty.demo@bitsathy.ac.in", "Faculty@123", "Dr. Demo Faculty Mentor"),
        ("faculty@bitsathy.ac.in", "Faculty@123", "Faculty Mentor"),
    ]
    last_user = None
    for demo_email, demo_pwd, demo_name in demo_accounts:
        user = db.query(User).filter(User.email == demo_email).first()
        if not user:
            user = User(
                email=demo_email,
                password_hash=hash_password(demo_pwd),
                role=UserRole.mentor,
                is_active=True
            )
            db.add(user)
            db.flush()
            profile = MentorProfile(
                user_id=user.id,
                name=demo_name,
                bio="Senior Faculty & Technical Career Mentor at Bannari Amman Institute of Technology.",
                domain="Computer Science & Engineering",
                years_experience=10,
                availability_hours_per_week=10.0,
                status=MentorStatus.approved,
                max_students=10,
            )
            db.add(profile)
            db.flush()
        else:
            user.role = UserRole.mentor
            user.password_hash = hash_password(demo_pwd)
            user.is_active = True
            profile = db.query(MentorProfile).filter(MentorProfile.user_id == user.id).first()
            if not profile:
                profile = MentorProfile(
                    user_id=user.id,
                    name=demo_name,
                    bio="Senior Faculty & Technical Career Mentor at Bannari Amman Institute of Technology.",
                    domain="Computer Science & Engineering",
                    years_experience=10,
                    availability_hours_per_week=10.0,
                    status=MentorStatus.approved,
                    max_students=10,
                )
                db.add(profile)
                db.flush()
            elif getattr(profile, "status", None) != MentorStatus.approved:
                profile.status = MentorStatus.approved
                db.flush()
        last_user = user
    return last_user


def _seed_staff(db):
    from models.user import User, UserRole, MentorProfile, MentorStatus
    from models.mentor import MentorMatch, MatchStatus
    from models.user import StudentProfile
    staff_accounts = [
        ("staff@bitsathy.ac.in", "Faculty@123", "Prof. Staff Advisor"),
        ("faculty.staff@bitsathy.ac.in", "Faculty@123", "Faculty Staff Advisor"),
    ]
    student_profile = db.query(StudentProfile).first()
    for demo_email, demo_pwd, demo_name in staff_accounts:
        user = db.query(User).filter(User.email == demo_email).first()
        if not user:
            user = User(
                email=demo_email,
                password_hash=hash_password(demo_pwd),
                role=UserRole.staff,
                is_active=True
            )
            db.add(user)
            db.flush()
            profile = MentorProfile(
                user_id=user.id,
                name=demo_name,
                bio="Senior Faculty & Technical Career Advisor at Bannari Amman Institute of Technology.",
                domain="Computer Science & Engineering",
                years_experience=12,
                availability_hours_per_week=10.0,
                status=MentorStatus.approved,
                max_students=15,
            )
            db.add(profile)
            db.flush()
        else:
            user.role = UserRole.staff
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
                    max_students=15,
                )
                db.add(profile)
                db.flush()
            elif getattr(profile, "status", None) != MentorStatus.approved:
                profile.status = MentorStatus.approved
                db.flush()

        if student_profile and profile:
            match = db.query(MentorMatch).filter(
                MentorMatch.mentor_id == profile.id,
                MentorMatch.student_id == student_profile.id
            ).first()
            if not match:
                db.add(MentorMatch(
                    student_id=student_profile.id,
                    mentor_id=profile.id,
                    status=MatchStatus.accepted
                ))
                db.flush()


def _seed_admin(db):
    from models.user import User, UserRole
    from config import get_settings
    settings = get_settings()
    configured_admin = settings.admin_email_normalized or "skillnova.admin@gmail.com"
    user = db.query(User).filter(User.email == configured_admin).first()
    if not user:
        user = User(email=configured_admin, password_hash=hash_password(DEMO_PASSWORD), role=UserRole.admin)
        db.add(user)
        db.flush()
    fallback = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if not fallback:
        fallback = User(email=ADMIN_EMAIL, password_hash=hash_password(DEMO_PASSWORD), role=UserRole.admin)
        db.add(fallback)
        db.flush()
    return user


def _seed_career_goal_requirements(db, student_profile, all_skills):
    from models.skill import CareerGoal, CareerSkillRequirement
    if db.query(CareerGoal).filter(CareerGoal.student_id == student_profile.id).first():
        return
    goal = CareerGoal(
        student_id=student_profile.id,
        goal_type="job_title",
        title="Full Stack Developer",
        description="Build and deploy full stack web applications",
        is_active=True,
    )
    db.add(goal)
    db.flush()
    # Set required levels for key skills
    requirements = {
        "Python": 75, "JavaScript": 80, "React": 75, "SQL": 70,
        "REST APIs": 75, "Git": 70, "Docker": 60, "TypeScript": 65,
        "Arrays & Strings": 70, "Dynamic Programming": 60, "System Design": 65,
    }
    skill_map = {s.name: s for s in all_skills}
    for skill_name, level in requirements.items():
        skill = skill_map.get(skill_name)
        if skill:
            db.add(CareerSkillRequirement(career_goal_id=goal.id, skill_id=skill.id, required_level=level))
    db.flush()
    # Seed student skills with self-ratings
    from models.skill import StudentSkill
    from services.skill_gap_service import compute_blended_level
    initial_ratings = {
        "Python": 60, "JavaScript": 55, "React": 40, "SQL": 65,
        "REST APIs": 50, "Git": 70, "Docker": 25, "TypeScript": 30,
        "Arrays & Strings": 55, "Dynamic Programming": 20, "System Design": 15,
        "Communication": 70, "Problem Solving": 65,
    }
    for skill_name, rating in initial_ratings.items():
        skill = skill_map.get(skill_name)
        if skill and not db.query(StudentSkill).filter(
            StudentSkill.student_id == student_profile.id,
            StudentSkill.skill_id == skill.id,
        ).first():
            assessed = rating * 0.85 if rating > 40 else None  # Simulate some assessed data
            blended = compute_blended_level(rating, assessed, 1 if rating > 50 else 0)
            db.add(StudentSkill(
                student_id=student_profile.id,
                skill_id=skill.id,
                self_rating=rating,
                assessed_level=assessed,
                blended_level=blended,
                evidence_count=1 if rating > 50 else 0,
            ))
    db.flush()
    print("  Career goal + skill ratings seeded")


def _seed_assessments(db):
    from models.assessment import Assessment, AssessmentQuestion
    from scripts.seed_questions import ASSESSMENTS_DATA

    skill_map = {s.name: s for s in db.query(Skill).all()}

    for adata in ASSESSMENTS_DATA:
        existing = db.query(Assessment).filter(Assessment.title == adata["title"]).first()
        skill = skill_map.get(adata["skill_name"])
        if not existing:
            assessment = Assessment(
                title=adata["title"],
                skill_id=skill.id if skill else None,
                difficulty=adata["difficulty"],
                question_count=10,
                time_limit_minutes=adata.get("time_limit_minutes", 15),
                is_active=True,
            )
            db.add(assessment)
            db.flush()
        else:
            assessment = existing
            assessment.question_count = 10
            assessment.time_limit_minutes = adata.get("time_limit_minutes", 15)
            if skill:
                assessment.skill_id = skill.id
            db.flush()

        # Update questions
        db.query(AssessmentQuestion).filter(AssessmentQuestion.assessment_id == assessment.id).delete()
        db.flush()
        for i, q in enumerate(adata["questions"]):
            db.add(AssessmentQuestion(
                assessment_id=assessment.id,
                question_text=q["q"],
                options=q["opts"],
                correct_answer=q["ans"],
                explanation=q["exp"],
                difficulty=q.get("difficulty", adata["difficulty"]),
                order=i,
            ))
    db.flush()
    print("  Assessments seeded with full question banks")


def _seed_projects(db):
    from models.project import Project, ProjectSkill
    projects_data = [
        {
            "title": "Personal Finance Tracker",
            "description": "Build a full-stack web app to track income, expenses, and savings goals with charts.",
            "difficulty": "beginner",
            "hours": 20,
            "domain": "Web Dev",
            "tech": ["Python", "FastAPI", "React", "PostgreSQL"],
            "skills": ["Python", "React", "SQL", "REST APIs"],
        },
        {
            "title": "E-Commerce Platform",
            "description": "Develop a complete e-commerce site with product catalog, cart, checkout, and order management.",
            "difficulty": "intermediate",
            "hours": 60,
            "domain": "Web Dev",
            "tech": ["TypeScript", "React", "Node.js", "PostgreSQL", "Docker"],
            "skills": ["TypeScript", "React", "SQL", "Docker", "REST APIs"],
        },
        {
            "title": "ML Price Prediction API",
            "description": "Train a machine learning model to predict house prices and deploy it as a REST API.",
            "difficulty": "intermediate",
            "hours": 40,
            "domain": "Data Science",
            "tech": ["Python", "Pandas", "NumPy", "FastAPI", "Docker"],
            "skills": ["Python", "Machine Learning", "Pandas", "NumPy", "REST APIs"],
        },
        {
            "title": "Real-Time Chat Application",
            "description": "Build a WebSocket-based chat app with rooms, user presence, and message history.",
            "difficulty": "intermediate",
            "hours": 35,
            "domain": "Web Dev",
            "tech": ["React", "Node.js", "WebSockets", "MongoDB"],
            "skills": ["JavaScript", "React", "MongoDB"],
        },
        {
            "title": "LeetCode-Style Problem Solver Dashboard",
            "description": "Create a dashboard that tracks your DSA practice, suggests problems by category, and visualizes progress.",
            "difficulty": "beginner",
            "hours": 25,
            "domain": "Web Dev",
            "tech": ["React", "TypeScript", "Python", "FastAPI"],
            "skills": ["React", "TypeScript", "Python", "Arrays & Strings"],
        },
    ]
    skill_map = {s.name: s for s in db.query(Skill).all()}
    for pdata in projects_data:
        if db.query(Project).filter(Project.title == pdata["title"]).first():
            continue
        proj = Project(
            title=pdata["title"],
            description=pdata["description"],
            difficulty=pdata["difficulty"],
            estimated_hours=pdata["hours"],
            domain=pdata["domain"],
            tech_stack=pdata["tech"],
            is_active=True,
        )
        db.add(proj)
        db.flush()
        for skill_name in pdata["skills"]:
            skill = skill_map.get(skill_name)
            if skill:
                db.add(ProjectSkill(project_id=proj.id, skill_id=skill.id, skill_weight=1.0 / len(pdata["skills"])))
    db.flush()
    print("  Projects seeded")


def _seed_demo_student_data(db, student_profile):
    """Add weekly progress history and placement readiness for demo dashboard."""
    from models.progress import WeeklyProgress
    from services.placement_readiness_service import compute_placement_readiness
    from services.skill_gap_service import compute_gap_for_student
    from services.roadmap_service import generate_roadmap

    # Seed 8 weeks of progress history
    today = date.today()
    for i in range(8, 0, -1):
        week_start = today - timedelta(weeks=i)
        if not db.query(WeeklyProgress).filter(
            WeeklyProgress.student_id == student_profile.id,
            WeeklyProgress.week_start == week_start,
        ).first():
            readiness_score = 30 + (8 - i) * 3.5  # Gradually improving
            db.add(WeeklyProgress(
                student_id=student_profile.id,
                week_start=week_start,
                readiness_score=round(readiness_score, 1),
                assessments_taken=i % 3 + 1,
                skills_improved=i % 2 + 1,
                roadmap_items_completed=i % 4 + 1,
            ))
    db.flush()

    # Compute initial gaps, roadmap, placement readiness
    compute_gap_for_student(db, student_profile)
    generate_roadmap(db, student_profile)
    compute_placement_readiness(db, student_profile)
    print("  Demo student data seeded")


if __name__ == "__main__":
    seed()
