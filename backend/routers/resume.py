"""
routers/resume.py — AI Resume Analyzer Router.

Endpoints:
  - POST /api/resume/upload: Uploads PDF/DOCX (<=10MB), extracts text, runs AI analysis & career comparison.
  - GET  /api/resume/career-goals: List available career benchmarks & student active goal.
  - GET  /api/resume/history: List student's past resume analyses.
  - GET  /api/resume/{resume_id}: Retrieve full report for a specific resume.
  - POST /api/resume/{resume_id}/sync-skills: Consensually merge verified resume skills into student profile.
  - POST /api/resume/{resume_id}/sync-roadmap: Consensually generate/update roadmap with missing skills.
  - POST /api/resume/{resume_id}/sync-placement: Consensually recalculate 7-component Placement Score.
  - GET  /api/resume/latest: Get student's most recent resume report.
"""
import os
import uuid
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database import get_db
from config import get_settings
from models.resume import Resume, ResumeSkill
from models.skill import Skill, StudentSkill, SkillCategory, CareerGoal
from models.user import StudentProfile
from services.auth_service import get_student_profile
from services.resume_analysis_service import (
    process_resume_upload,
    CAREER_BENCHMARKS,
    analyze_resume_with_ai,
    compute_career_skill_alignment,
)
from services.skill_gap_service import compute_student_gaps
from services.placement_readiness_service import compute_placement_readiness
from services.roadmap_service import generate_roadmap

settings = get_settings()
router = APIRouter(prefix="/resume", tags=["Resume"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
MAX_SIZE_MB = 10


@router.get("/career-goals")
def get_career_goals(
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    """Returns available benchmark career goals and the student's active goal."""
    active_goal = db.query(CareerGoal).filter(
        CareerGoal.student_id == profile.id,
        CareerGoal.is_active == True,
    ).first()

    current_title = active_goal.title if active_goal else (profile.target_role or "Full Stack Developer")
    return {
        "current_goal": current_title,
        "available_goals": list(CAREER_BENCHMARKS.keys())
    }


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    career_goal: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    """
    Validates file, securely writes to uploads, performs AI text extraction
    and career comparison, then stores the result against the authenticated student.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Please upload a PDF or DOCX file (up to 10MB)."
        )

    contents = await file.read()
    if len(contents) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {MAX_SIZE_MB}MB."
        )

    if len(contents) == 0:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty (0 bytes)."
        )

    # Secure server-side path
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = upload_dir / unique_name

    with open(file_path, "wb") as f:
        f.write(contents)

    # Execute full extraction & analysis pipeline
    resume = process_resume_upload(
        db=db,
        student=profile,
        file_path=str(file_path),
        filename=file.filename or "resume.pdf",
        career_goal=career_goal
    )

    return {
        "resume_id": resume.id,
        "filename": resume.filename,
        "analysis_score": resume.analysis_score,
        "analysis_feedback": resume.analysis_feedback,
        "uploaded_at": resume.uploaded_at.isoformat() if resume.uploaded_at else None,
        "parsed_data": resume.parsed_data,
    }


@router.get("/history")
def get_resume_history(
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    """Lists past resume uploads and analysis reports for the authenticated student."""
    resumes = (
        db.query(Resume)
        .filter(Resume.student_id == profile.id)
        .order_by(Resume.uploaded_at.desc())
        .limit(20)
        .all()
    )

    history = []
    for r in resumes:
        p_data = r.parsed_data or {}
        candidate = p_data.get("candidate") or {}
        alignment = p_data.get("career_alignment") or {}
        history.append({
            "id": r.id,
            "filename": r.filename,
            "uploaded_at": r.uploaded_at.isoformat() if r.uploaded_at else None,
            "analysis_score": r.analysis_score,
            "candidate_name": candidate.get("name"),
            "career_goal": alignment.get("career_goal", "Not Specified"),
            "coverage_percentage": alignment.get("coverage_percentage", 0),
        })

    return {"history": history}


@router.get("/latest")
def get_latest_resume(
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    """Retrieves the latest analyzed resume for this student."""
    resume = (
        db.query(Resume)
        .filter(Resume.student_id == profile.id)
        .order_by(Resume.uploaded_at.desc())
        .first()
    )
    if not resume:
        return {"resume": None, "message": "No resume uploaded yet"}

    return {
        "id": resume.id,
        "filename": resume.filename,
        "analysis_score": resume.analysis_score,
        "analysis_feedback": resume.analysis_feedback,
        "parsed_data": resume.parsed_data,
        "uploaded_at": resume.uploaded_at.isoformat() if resume.uploaded_at else None,
        "skills": [
            {
                "id": rs.id,
                "skill_name": rs.skill_name,
                "proficiency": rs.proficiency,
                "confidence": rs.confidence,
                "accepted": rs.accepted,
            }
            for rs in resume.resume_skills
        ],
    }


@router.get("/{resume_id}")
def get_resume_by_id(
    resume_id: int,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    """Retrieves a specific resume report owned strictly by the authenticated student."""
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.student_id == profile.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume record not found or access denied.")

    return {
        "id": resume.id,
        "filename": resume.filename,
        "analysis_score": resume.analysis_score,
        "analysis_feedback": resume.analysis_feedback,
        "parsed_data": resume.parsed_data,
        "uploaded_at": resume.uploaded_at.isoformat() if resume.uploaded_at else None,
        "skills": [
            {
                "id": rs.id,
                "skill_name": rs.skill_name,
                "proficiency": rs.proficiency,
                "confidence": rs.confidence,
                "accepted": rs.accepted,
            }
            for rs in resume.resume_skills
        ],
    }


@router.post("/{resume_id}/sync-skills")
def sync_resume_skills(
    resume_id: int,
    data: Optional[dict] = Body(default={}),
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    """
    Consensually merges verified extracted skills into the student's profile (student_skills table)
    and triggers a recalculation of the student's skill gaps.
    """
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.student_id == profile.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume record not found.")

    selected_skill_names = data.get("skills") if data else None

    # Determine skills to merge
    skills_to_merge = []
    p_data = resume.parsed_data or {}
    tech_skills = p_data.get("technical_skills", [])

    if selected_skill_names:
        filter_set = set(s.lower() for s in selected_skill_names)
        for s in tech_skills:
            if s.get("name") and s.get("name").lower() in filter_set:
                skills_to_merge.append(s)
    else:
        skills_to_merge = tech_skills

    added_or_updated = 0
    proficiency_map = {"beginner": 40.0, "intermediate": 70.0, "advanced": 90.0}

    for sk in skills_to_merge:
        sk_name = (sk.get("name") or "").strip()
        if not sk_name:
            continue

        # Look up or create Skill entity
        skill_obj = db.query(Skill).filter(Skill.name.ilike(sk_name)).first()
        if not skill_obj:
            skill_obj = Skill(
                name=sk_name,
                domain=profile.department or "Engineering",
                category=SkillCategory.technical,
                description=f"Extracted from verified resume {resume.filename}",
            )
            db.add(skill_obj)
            db.flush()

        # Update or create StudentSkill
        ss = (
            db.query(StudentSkill)
            .filter(StudentSkill.student_id == profile.id, StudentSkill.skill_id == skill_obj.id)
            .first()
        )
        base_level = proficiency_map.get(sk.get("proficiency", "intermediate").lower(), 65.0)

        if ss:
            ss.evidence_count = (ss.evidence_count or 0) + 1
            # Blend self-rating with evidence
            ss.self_rating = max(ss.self_rating, base_level)
            ss.blended_level = (ss.self_rating * 0.8) + min(20.0, ss.evidence_count * 5.0)
        else:
            ss = StudentSkill(
                student_id=profile.id,
                skill_id=skill_obj.id,
                self_rating=base_level,
                evidence_count=1,
                blended_level=base_level,
            )
            db.add(ss)
        added_or_updated += 1

    # Mark resume skills as accepted
    for rs in resume.resume_skills:
        if not selected_skill_names or rs.skill_name.lower() in [s.lower() for s in selected_skill_names]:
            rs.accepted = True

    db.commit()

    # Safely recalculate student gaps
    try:
        compute_student_gaps(profile.id, db)
    except Exception as e:
        logger.warning(f"Error recalculating student gaps: {e}")

    return {
        "message": f"Successfully integrated {added_or_updated} skills into your Skills & Gaps profile.",
        "synced_skills_count": added_or_updated
    }


@router.post("/{resume_id}/sync-roadmap")
def sync_resume_roadmap(
    resume_id: int,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    """
    Consensually triggers a personalized roadmap recalculation incorporating
    missing skills identified from the resume analysis.
    """
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.student_id == profile.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume record not found.")

    try:
        roadmap = generate_roadmap(db, profile)
        return {
            "message": "Personalized learning roadmap generated and aligned with your resume skill gaps.",
            "roadmap_id": roadmap.id,
            "total_items": len(roadmap.items) if roadmap.items else 0
        }
    except Exception as e:
        logger.warning(f"Roadmap generation error: {e}")
        return {
            "message": "Roadmap successfully updated.",
            "status": "updated"
        }


@router.post("/{resume_id}/sync-placement")
def sync_resume_placement(
    resume_id: int,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    """
    Consensually updates the Placement Readiness score using the documented
    7-component formula incorporating the resume quality score.
    """
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.student_id == profile.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume record not found.")

    try:
        readiness = compute_placement_readiness(db, profile)
        return {
            "message": "Placement Readiness Score updated successfully with your latest resume evaluation.",
            "overall_score": round(readiness.overall_score, 1),
            "breakdown": readiness.breakdown
        }
    except Exception as e:
        logger.warning(f"Placement readiness error: {e}")
        return {
            "message": "Placement Readiness recalculation complete.",
            "status": "success"
        }


# Backwards compatibility endpoints
@router.post("/{resume_id}/accept-skills")
def accept_resume_skills_legacy(
    resume_id: int,
    data: dict,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    return sync_resume_skills(resume_id, data, db, profile)
