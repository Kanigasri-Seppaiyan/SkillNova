"""
routers/student.py — Student-namespaced endpoints (/api/student/*).
Strictly guarded by get_current_student dependency.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models.user import User, StudentProfile
from models.skill import Skill, StudentSkill, CareerGoal, SkillCategory
from models.skill_gap import SkillGap
from models.assessment import Assessment, AssessmentQuestion, AssessmentAttempt, AssessmentAnswer
from models.roadmap import Roadmap, RoadmapItem
from models.progress import WeeklyProgress
from models.placement import PlacementReadiness
from models.project import Project, StudentProject
from models.mentor import MentorMatch, MentorFeedback
import re
from sqlalchemy import func
from schemas.student import StudentOnboardingRequest, StudentProfileUpdate
from utils.validate_email import normalize_email, is_allowed_institute_email, ALLOWED_DOMAIN
from dependencies import get_current_student
from services.skill_gap_service import compute_student_gaps
from services.roadmap_service import generate_roadmap, recalculate_roadmap_after_assessment
from services.placement_readiness_service import compute_placement_readiness
from services.career_assistant_service import get_ai_response

router = APIRouter(prefix="/api/student", tags=["Student"])
router_direct = APIRouter(prefix="/onboarding", tags=["Onboarding"])
router_student_direct = APIRouter(prefix="/student", tags=["Student Direct"])


class ProfileUpdateSchema(BaseModel):
    career_goal: Optional[str] = None
    target_role: Optional[str] = None
    target_company_tier: Optional[str] = None
    target_timeline_months: Optional[int] = None
    daily_commitment_hours: Optional[int] = None
    learning_style: Optional[str] = None


class SelfRateSchema(BaseModel):
    skill_id: int
    rating: int


class SubmitAnswersSchema(BaseModel):
    attempt_id: int
    answers: List[dict]


class ChatMessageSchema(BaseModel):
    message: str
    language: Optional[str] = "en"


def _process_student_onboarding(data: StudentOnboardingRequest, student: User, db: Session):
    # 1. Full Name Validation
    full_name = str(data.full_name or "").strip()
    if not full_name or len(full_name) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Full Name is required (minimum 2 characters)."
        )

    # 2. Register Number Validation & Duplicate Check
    register_number = str(data.register_number or "").strip()
    if not register_number or len(register_number) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Register Number is required."
        )

    dup = db.query(StudentProfile).filter(
        StudentProfile.register_number == register_number,
        StudentProfile.user_id != student.id
    ).first()
    if dup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Register number '{register_number}' is already registered with another student account."
        )

    # 3. Email Check (Authentication Identity Verification)
    if data.college_email:
        clean_college_email = normalize_email(data.college_email)
        clean_student_email = normalize_email(student.email)
        if clean_college_email != clean_student_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="College Email must match your authenticated student email account."
            )
        if not is_allowed_institute_email(clean_college_email):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Only @{ALLOWED_DOMAIN} email addresses are allowed."
            )

    # 4. Mobile Number Validation
    raw_mobile = str(data.mobile_number or "").strip()
    clean_mobile = re.sub(r"[\s\-\(\)]", "", raw_mobile)
    if not clean_mobile or (not re.match(r"^(\+91)?[6-9]\d{9}$", clean_mobile) and not re.match(r"^\+?[0-9]{10,14}$", clean_mobile)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please enter a valid 10-digit mobile number."
        )

    # 5. Department Validation
    department = str(data.department or "").strip()
    if not department or len(department) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Department is required. Please select your department."
        )

    # 6. Academic Year Validation
    academic_year = str(data.academic_year or "").strip()
    if not academic_year or len(academic_year) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Academic Year is required. Please select your academic year."
        )

    # 7. Career Goal Validation
    career_goal = str(data.career_goal or "").strip()
    if not career_goal:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Career Goal is required. Please enter or select your target career goal."
        )

    # 8. Technical Skills Extraction & Validation
    skills_to_save: List[str] = []
    if data.technical_skills and isinstance(data.technical_skills, list):
        for s in data.technical_skills:
            if isinstance(s, str) and s.strip():
                skills_to_save.append(s.strip())
    elif data.skills and isinstance(data.skills, list):
        for s in data.skills:
            if isinstance(s, dict):
                name = s.get("name") or s.get("skill_name")
                if name and str(name).strip():
                    skills_to_save.append(str(name).strip())
            elif isinstance(s, str) and s.strip():
                skills_to_save.append(s.strip())

    if not skills_to_save:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please add or select at least one technical skill."
        )

    # 9. Save to user's student profile
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student.id).first()
    if not profile:
        profile = StudentProfile(user_id=student.id, name=full_name)
        db.add(profile)
        db.flush()

    profile.name = full_name
    profile.register_number = register_number
    profile.mobile_number = clean_mobile
    profile.department = department
    profile.academic_year = academic_year
    profile.target_role = career_goal
    profile.onboarding_completed = True

    # 10. Save Career Goal
    db.query(CareerGoal).filter(CareerGoal.student_id == profile.id).update({"is_active": False})
    active_goal = CareerGoal(student_id=profile.id, title=career_goal, is_active=True)
    db.add(active_goal)

    # 11. Save Technical Skills into StudentSkill & Skill
    for sk_name in skills_to_save:
        skill_obj = db.query(Skill).filter(func.lower(Skill.name) == sk_name.lower()).first()
        if not skill_obj:
            skill_obj = Skill(name=sk_name, domain=department, category=SkillCategory.technical)
            db.add(skill_obj)
            db.flush()

        existing_ss = db.query(StudentSkill).filter(
            StudentSkill.student_id == profile.id,
            StudentSkill.skill_id == skill_obj.id
        ).first()
        if not existing_ss:
            ss = StudentSkill(
                student_id=profile.id,
                skill_id=skill_obj.id,
                self_rating=80.0,
                blended_level=80.0
            )
            db.add(ss)

    db.commit()
    db.refresh(profile)

    # Safely trigger initial roadmap / career gap calculation
    try:
        compute_student_gaps(db, student.id)
    except Exception:
        pass
    try:
        generate_roadmap(db, student.id)
    except Exception:
        pass
    try:
        compute_placement_readiness(db, student.id)
    except Exception:
        pass

    return {
        "success": True,
        "message": "Student information saved successfully. Welcome to SkillNova!",
        "onboarding_completed": True,
        "profile": {
            "id": profile.id,
            "user_id": profile.user_id,
            "name": profile.name,
            "register_number": profile.register_number,
            "mobile_number": profile.mobile_number,
            "department": profile.department,
            "academic_year": profile.academic_year,
            "career_goal": career_goal,
            "technical_skills": skills_to_save,
            "onboarding_completed": True,
        },
        "user": {
            "id": student.id,
            "email": student.email,
            "full_name": profile.name,
            "role": "student",
            "onboarding_completed": True
        }
    }


@router.get("/onboarding-status")
@router.get("/onboarding")
@router_direct.get("/status")
@router_student_direct.get("/onboarding-status")
def get_student_onboarding_status(student: User = Depends(get_current_student), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student.id).first()
    is_completed = bool(student.onboarding_completed)
    goal = db.query(CareerGoal).filter(CareerGoal.student_id == profile.id, CareerGoal.is_active == True).first() if profile else None
    
    technical_skills = []
    if profile:
        for ss in profile.student_skills:
            if ss.skill and ss.skill.name:
                technical_skills.append(ss.skill.name)

    return {
        "email": student.email,
        "full_name": (profile.name if profile and profile.name else student.full_name) or "",
        "onboarding_completed": is_completed,
        "profile": {
            "name": profile.name if profile else student.full_name,
            "register_number": getattr(profile, "register_number", "") or "",
            "mobile_number": getattr(profile, "mobile_number", "") or "",
            "department": getattr(profile, "department", "") or "",
            "academic_year": getattr(profile, "academic_year", "") or "",
            "career_goal": (goal.title if goal else profile.target_role) if profile else "",
            "technical_skills": technical_skills,
            "onboarding_completed": is_completed,
        } if profile else None
    }


@router.post("/onboarding")
@router.post("/complete-onboarding")
@router_direct.post("/complete")
@router_student_direct.post("/onboarding")
def submit_student_onboarding(
    data: StudentOnboardingRequest,
    student: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    return _process_student_onboarding(data, student, db)


@router.get("/profile")
@router_student_direct.get("/profile")
def get_profile(student: User = Depends(get_current_student), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student.id).first()
    if not profile:
        profile = StudentProfile(user_id=student.id, name=student.full_name)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    goal = db.query(CareerGoal).filter(CareerGoal.student_id == profile.id, CareerGoal.is_active == True).first()
    career_goal = (goal.title if goal else profile.target_role) or ""

    student_skills = db.query(StudentSkill).filter(StudentSkill.student_id == profile.id).all()
    technical_skills = []
    for ss in student_skills:
        if ss.skill and ss.skill.name:
            technical_skills.append(ss.skill.name)

    is_complete = bool(student.onboarding_completed)

    return {
        "id": profile.id,
        "user_id": student.id,
        "full_name": profile.name or student.full_name,
        "email": student.email,
        "register_number": profile.register_number or "",
        "mobile_number": profile.mobile_number or "",
        "department": profile.department or "",
        "academic_year": profile.academic_year or "",
        "career_goal": career_goal,
        "technical_skills": technical_skills,
        "onboarding_completed": is_complete,
        "profile": {
            "id": profile.id,
            "user_id": student.id,
            "name": profile.name,
            "register_number": profile.register_number or "",
            "mobile_number": profile.mobile_number or "",
            "department": profile.department or "",
            "academic_year": profile.academic_year or "",
            "target_role": career_goal,
            "career_goal": career_goal,
            "technical_skills": technical_skills,
            "onboarding_completed": is_complete,
        }
    }


@router.put("/profile")
@router_student_direct.put("/profile")
def update_profile(
    data: StudentProfileUpdate,
    student: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student.id).first()
    if not profile:
        profile = StudentProfile(user_id=student.id, name=student.full_name)
        db.add(profile)
        db.flush()

    if data.full_name or data.name:
        new_name = (data.full_name or data.name or "").strip()
        if len(new_name) >= 2:
            profile.name = new_name

    if data.register_number is not None:
        reg_num = data.register_number.strip()
        if reg_num:
            dup = db.query(StudentProfile).filter(
                StudentProfile.register_number == reg_num,
                StudentProfile.user_id != student.id
            ).first()
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Register number '{reg_num}' is already registered with another student account."
                )
            profile.register_number = reg_num

    if data.mobile_number is not None:
        raw_mob = data.mobile_number.strip()
        clean_mob = re.sub(r"[\s\-\(\)]", "", raw_mob)
        if clean_mob:
            if not re.match(r"^(\+91)?[6-9]\d{9}$", clean_mob) and not re.match(r"^\+?[0-9]{10,14}$", clean_mob):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Please enter a valid 10-digit mobile number."
                )
            profile.mobile_number = clean_mob

    if data.department is not None and data.department.strip():
        profile.department = data.department.strip()

    if data.academic_year is not None and data.academic_year.strip():
        profile.academic_year = data.academic_year.strip()

    cg = data.career_goal or data.target_role
    if cg is not None and cg.strip():
        cg = cg.strip()
        profile.target_role = cg
        db.query(CareerGoal).filter(CareerGoal.student_id == profile.id).update({"is_active": False})
        active_goal = CareerGoal(student_id=profile.id, title=cg, is_active=True)
        db.add(active_goal)

    if data.technical_skills is not None:
        for sk_name in data.technical_skills:
            sk_name = sk_name.strip()
            if not sk_name:
                continue
            skill_obj = db.query(Skill).filter(func.lower(Skill.name) == sk_name.lower()).first()
            if not skill_obj:
                skill_obj = Skill(name=sk_name, domain=profile.department or "Engineering", category=SkillCategory.technical)
                db.add(skill_obj)
                db.flush()

            existing_ss = db.query(StudentSkill).filter(
                StudentSkill.student_id == profile.id,
                StudentSkill.skill_id == skill_obj.id
            ).first()
            if not existing_ss:
                ss = StudentSkill(
                    student_id=profile.id,
                    skill_id=skill_obj.id,
                    self_rating=80.0,
                    blended_level=80.0
                )
                db.add(ss)

    db.commit()
    db.refresh(profile)

    return get_profile(student=student, db=db)



@router.get("/skills")
@router_student_direct.get("/skills")
def get_student_skills(student: User = Depends(get_current_student), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student.id).first()
    if not profile:
        return []
    skills = db.query(StudentSkill).filter(StudentSkill.student_id == profile.id).all()
    res = []
    for sk in skills:
        master_sk = db.query(Skill).filter(Skill.id == sk.skill_id).first()
        res.append({
            "id": sk.id,
            "skill_id": sk.skill_id,
            "skill_name": master_sk.name if master_sk else f"Skill #{sk.skill_id}",
            "category": master_sk.category if master_sk else "General",
            "self_rating": sk.self_rating,
            "verified_level": getattr(sk, "verified_level", 0.0) or 0.0,
            "blended_level": sk.blended_level
        })
    return res


@router.post("/skills/self-rate")
def self_rate_skill(data: SelfRateSchema, student: User = Depends(get_current_student), db: Session = Depends(get_db)):
    sk = db.query(StudentSkill).filter(StudentSkill.user_id == student.id, StudentSkill.skill_id == data.skill_id).first()
    if not sk:
        sk = StudentSkill(user_id=student.id, skill_id=data.skill_id, self_rating=data.rating, blended_level=float(data.rating))
        db.add(sk)
    else:
        sk.self_rating = data.rating
        sk.blended_level = round(0.4 * data.rating + 0.6 * sk.verified_level, 2)

    db.commit()

    # Cascade recalculation
    compute_student_gaps(student.id, db)
    # Recalculate roadmap (regenerate from current gaps)
    from models.user import StudentProfile as _SP
    _profile = db.query(_SP).filter(_SP.user_id == student.id).first()
    if _profile:
        generate_roadmap(db, _profile)
    compute_placement_readiness(student.id, db)

    return {"message": "Skill rating updated and cascade recalculated"}


@router.get("/skill-gaps")
def get_skill_gaps(student: User = Depends(get_current_student), db: Session = Depends(get_db)):
    return compute_student_gaps(student.id, db)


@router.get("/assessments")
def list_assessments(student: User = Depends(get_current_student), db: Session = Depends(get_db)):
    assessments = db.query(Assessment).all()
    return assessments


@router.post("/assessments/{id}/start")
def start_assessment(id: int, student: User = Depends(get_current_student), db: Session = Depends(get_db)):
    ass = db.query(Assessment).filter(Assessment.id == id).first()
    if not ass:
        raise HTTPException(status_code=404, detail="Assessment not found")

    attempt = AssessmentAttempt(user_id=student.id, assessment_id=id, status="in_progress")
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    questions = db.query(AssessmentQuestion).filter(AssessmentQuestion.assessment_id == id).all()
    return {
        "attempt_id": attempt.id,
        "assessment": ass,
        "questions": questions
    }


@router.post("/assessments/{id}/submit")
def submit_assessment(id: int, data: SubmitAnswersSchema, student: User = Depends(get_current_student), db: Session = Depends(get_db)):
    attempt = db.query(AssessmentAttempt).filter(AssessmentAttempt.id == data.attempt_id, AssessmentAttempt.user_id == student.id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt session not found")

    questions = db.query(AssessmentQuestion).filter(AssessmentQuestion.assessment_id == id).all()
    q_map = {q.id: q for q in questions}

    correct_count = 0
    breakdown = []
    for ans in data.answers:
        q_id = ans.get("question_id")
        selected = ans.get("selected_option")
        q_obj = q_map.get(q_id)

        is_corr = False
        corr_opt = "a"
        if q_obj:
            corr_opt = q_obj.correct_option
            is_corr = (selected.lower() == corr_opt.lower())
            if is_corr:
                correct_count += 1

            a_record = AssessmentAnswer(
                attempt_id=attempt.id,
                question_id=q_id,
                selected_option=selected,
                is_correct=is_corr
            )
            db.add(a_record)

            breakdown.append({
                "question_id": q_id,
                "question_text": q_obj.question_text,
                "selected_option": selected,
                "correct_option": corr_opt,
                "is_correct": is_corr,
                "explanation": q_obj.explanation
            })

    total_q = len(questions) or 1
    score_pct = round((correct_count / total_q) * 100, 2)
    passed = score_pct >= 80.0

    attempt.score = score_pct
    attempt.status = "completed"

    # Update verified skill level
    ass = db.query(Assessment).filter(Assessment.id == id).first()
    new_blended = 3.0
    if ass and ass.skill_id:
        st_skill = db.query(StudentSkill).filter(StudentSkill.user_id == student.id, StudentSkill.skill_id == ass.skill_id).first()
        if not st_skill:
            st_skill = StudentSkill(user_id=student.id, skill_id=ass.skill_id, self_rating=3, verified_level=4 if passed else 2)
            db.add(st_skill)
        else:
            st_skill.verified_level = 5 if score_pct >= 90 else 4 if passed else 2
            st_skill.blended_level = round(0.4 * st_skill.self_rating + 0.6 * st_skill.verified_level, 2)
            new_blended = st_skill.blended_level

    db.commit()

    # Recalculate cascade
    compute_student_gaps(student.id, db)
    _pr_profile = db.query(StudentProfile).filter(StudentProfile.user_id == student.id).first()
    if _pr_profile:
        recalculate_roadmap_after_assessment(db, _pr_profile, id, score_pct)
    compute_placement_readiness(student.id, db)

    return {
        "attempt_id": attempt.id,
        "assessment_id": id,
        "score": score_pct,
        "passed": passed,
        "correct_count": correct_count,
        "total_questions": total_q,
        "new_blended_level": new_blended,
        "breakdown": breakdown
    }


@router.get("/roadmap")
def get_roadmap(student: User = Depends(get_current_student), db: Session = Depends(get_db)):
    from models.user import StudentProfile
    from models.roadmap import Roadmap
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    roadmap = db.query(Roadmap).filter(Roadmap.student_id == profile.id, Roadmap.is_active == True).first()
    if not roadmap:
        roadmap = generate_roadmap(db, profile)
    return roadmap


@router.post("/roadmap/generate")
def generate_roadmap_endpoint(student: User = Depends(get_current_student), db: Session = Depends(get_db)):
    from models.user import StudentProfile
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return generate_roadmap(db, profile)


@router.get("/progress")
def get_progress_trend(student: User = Depends(get_current_student), db: Session = Depends(get_db)):
    trend = db.query(WeeklyProgress).filter(WeeklyProgress.user_id == student.id).order_by(WeeklyProgress.week_start_date.asc()).all()
    return trend


@router.get("/placement-readiness")
def get_placement_readiness(student: User = Depends(get_current_student), db: Session = Depends(get_db)):
    return compute_placement_readiness(student.id, db)


@router.get("/projects")
def get_projects(student: User = Depends(get_current_student), db: Session = Depends(get_db)):
    return db.query(Project).all()


@router.get("/mentors")
def get_mentors(student: User = Depends(get_current_student), db: Session = Depends(get_db)):
    return db.query(User).filter(User.role == "mentor").all()


@router.post("/mentors/{id}/request")
def request_mentor(id: int, message: str = "Requesting mentorship", student: User = Depends(get_current_student), db: Session = Depends(get_db)):
    match = db.query(MentorMatch).filter(MentorMatch.student_user_id == student.id, MentorMatch.mentor_user_id == id).first()
    if not match:
        match = MentorMatch(student_user_id=student.id, mentor_user_id=id, request_message=message, status="pending")
        db.add(match)
    else:
        match.status = "pending"
        match.request_message = message
    db.commit()
    return {"message": "Mentorship request sent to mentor"}


@router.post("/ai/chat")
def chat_ai(data: ChatMessageSchema, student: User = Depends(get_current_student), db: Session = Depends(get_db)):
    from models.user import StudentProfile
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    reply = get_ai_response(db, profile, [{"role": "user", "content": data.message}], data.language)
    return {"reply": reply}


@router.get("/career-gps")
def get_career_gps(student: User = Depends(get_current_student), db: Session = Depends(get_db)):
    return {
        "milestones": [
          {"title": "Core Skill Foundations", "description": "Complete initial self-rating & foundational assessments", "status": "completed", "timeline": "Weeks 1-2"},
          {"title": "System Architecture & Gap Closure", "description": "Address critical system design bottlenecks with project work", "status": "current", "timeline": "Weeks 3-6"},
          {"title": "Mock Interviews & Placement Prep", "description": "Execute mock interviews with Tier 1 mentors & polish resume", "status": "upcoming", "timeline": "Weeks 7-10"}
        ]
    }


@router.get("/career-twin")
def get_career_twin(student: User = Depends(get_current_student), db: Session = Depends(get_db)):
    return {
        "twin_name": "Placed Tier 1 Peer Cohort Prototype",
        "target_role": "Software Engineer",
        "placement_result": "Placed Tier 1 Product",
        "twin_readiness_score": 88,
        "twin_projects_completed": 4,
        "insight_summary": "Students in your cohort who successfully placed in Tier 1 companies completed an average of 4 verified projects."
    }
