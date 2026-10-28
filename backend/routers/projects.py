"""
routers/projects.py — Project catalog, recommendations (gap-driven), and student tracking.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone

from database import get_db
from models.project import Project, ProjectSkill, StudentProject, ProjectStatus
from models.skill_gap import SkillGap, GapPriority
from models.user import StudentProfile
from services.auth_service import get_student_profile

from services.project_details import PROJECT_DETAILS_REGISTRY

router = APIRouter(prefix="/projects", tags=["Projects"])


class ProjectOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    difficulty: str
    estimated_hours: float
    domain: Optional[str]
    tech_stack: Optional[list]

    class Config:
        from_attributes = True


class ProjectProgressUpdate(BaseModel):
    progress_pct: float
    github_url: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    completed_milestones: Optional[List[int]] = None
    completed_tasks: Optional[List[str]] = None
    progress_data: Optional[dict] = None


@router.get("/", response_model=List[ProjectOut])
def list_projects(
    difficulty: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_student_profile),
):
    q = db.query(Project).filter(Project.is_active == True)
    if difficulty:
        q = q.filter(Project.difficulty == difficulty)
    return q.all()


@router.get("/recommended")
def get_recommended_projects(
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    """Returns projects most relevant to the student's current HIGH/MEDIUM skill gaps."""
    high_priority_skill_ids = {
        g.skill_id for g in db.query(SkillGap).filter(
            SkillGap.student_id == profile.id,
            SkillGap.priority.in_([GapPriority.high, GapPriority.medium]),
        ).all()
    }

    # Fetch all active projects
    all_projects = db.query(Project).filter(Project.is_active == True).all()

    # Find projects that exercise these gap skills
    project_scores = {}
    if high_priority_skill_ids:
        all_project_skills = db.query(ProjectSkill).filter(
            ProjectSkill.skill_id.in_(high_priority_skill_ids)
        ).all()

        for ps in all_project_skills:
            if ps.project_id not in project_scores:
                project_scores[ps.project_id] = {"score": 0, "matching_skills": []}
            project_scores[ps.project_id]["score"] += ps.skill_weight
            project_scores[ps.project_id]["matching_skills"].append(ps.skill_id)

    # Student tracking map
    student_projects = {
        sp.project_id: sp for sp in db.query(StudentProject).filter(
            StudentProject.student_id == profile.id
        ).all()
    }

    # Sort projects: those with gap match first, then all projects
    sorted_projects = sorted(
        all_projects,
        key=lambda p: -(project_scores.get(p.id, {}).get("score", 0) + (1.0 if p.id in project_scores else 0.1))
    )

    recommendations = []
    for p in sorted_projects:
        sp = student_projects.get(p.id)
        recommendations.append({
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "difficulty": p.difficulty,
            "estimated_hours": p.estimated_hours,
            "tech_stack": p.tech_stack,
            "relevance_score": project_scores.get(p.id, {}).get("score", 0),
            "addresses_gaps": len(project_scores.get(p.id, {}).get("matching_skills", [])),
            "student_status": sp.status.value if sp else "not_started",
            "progress_pct": sp.progress_pct if sp else 0.0,
            "completed_milestones": (sp.progress_data or {}).get("completed_milestones", []) if sp else [],
            "completed_tasks": (sp.progress_data or {}).get("completed_tasks", []) if sp else [],
        })

    return {
        "recommendations": recommendations,
        "based_on_gaps": list(high_priority_skill_ids),
    }


@router.get("/{project_id}")
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    skills = [{
        "skill_id": ps.skill_id,
        "skill_name": ps.skill.name if ps.skill else None,
        "weight": ps.skill_weight,
    } for ps in project.project_skills]

    # Retrieve rich specifications
    specs = PROJECT_DETAILS_REGISTRY.get(project_id, {})

    # Retrieve student progress
    sp = db.query(StudentProject).filter(
        StudentProject.student_id == profile.id,
        StudentProject.project_id == project_id,
    ).first()

    progress_data = sp.progress_data or {} if sp else {}

    return {
        **ProjectOut.model_validate(project).model_dump(),
        "skills": skills,
        "problem_statement": specs.get("problem_statement", project.description),
        "objectives": specs.get("objectives", []),
        "prerequisites": specs.get("prerequisites", []),
        "expected_outcome": specs.get("expected_outcome", ""),
        "required_tools": specs.get("required_tools", []),
        "setup_instructions": specs.get("setup_instructions", []),
        "learning_resources": specs.get("learning_resources", []),
        "testing_steps": specs.get("testing_steps", []),
        "roadmap_steps": specs.get("roadmap_steps", []),
        "milestones": specs.get("milestones", []),
        # Student progress data
        "student_project_id": sp.id if sp else None,
        "student_status": sp.status.value if sp else "not_started",
        "progress_pct": sp.progress_pct if sp else 0.0,
        "completed_milestones": progress_data.get("completed_milestones", []),
        "completed_tasks": progress_data.get("completed_tasks", []),
        "notes": sp.notes if sp else "",
        "github_url": sp.github_url if sp else "",
        "started_at": sp.started_at.isoformat() if (sp and sp.started_at) else None,
        "completed_at": sp.completed_at.isoformat() if (sp and sp.completed_at) else None,
    }


@router.post("/{project_id}/start", status_code=201)
def start_project(
    project_id: int,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    sp = db.query(StudentProject).filter(
        StudentProject.student_id == profile.id,
        StudentProject.project_id == project_id,
    ).first()

    if not sp:
        sp = StudentProject(
            student_id=profile.id,
            project_id=project_id,
            status=ProjectStatus.in_progress,
            progress_pct=0.0,
            progress_data={"completed_milestones": [], "completed_tasks": []},
            started_at=datetime.now(timezone.utc),
        )
        db.add(sp)
    else:
        if sp.status == ProjectStatus.not_started:
            sp.status = ProjectStatus.in_progress
            if not sp.started_at:
                sp.started_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(sp)
    return {
        "message": "Project started",
        "student_project_id": sp.id,
        "status": sp.status.value,
        "progress_pct": sp.progress_pct
    }


@router.put("/{project_id}/progress")
def update_project_progress(
    project_id: int,
    payload: ProjectProgressUpdate,
    db: Session = Depends(get_db),
    profile: StudentProfile = Depends(get_student_profile),
):
    sp = db.query(StudentProject).filter(
        StudentProject.student_id == profile.id,
        StudentProject.project_id == project_id,
    ).first()

    if not sp:
        sp = StudentProject(
            student_id=profile.id,
            project_id=project_id,
            status=ProjectStatus.in_progress,
            progress_pct=payload.progress_pct,
            started_at=datetime.now(timezone.utc),
        )
        db.add(sp)
        db.flush()

    sp.progress_pct = payload.progress_pct
    if payload.github_url is not None:
        sp.github_url = payload.github_url
    if payload.notes is not None:
        sp.notes = payload.notes
    if payload.status:
        try:
            sp.status = ProjectStatus(payload.status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")

    # Update progress_data (milestones and tasks)
    current_data = dict(sp.progress_data or {})
    if payload.completed_milestones is not None:
        current_data["completed_milestones"] = payload.completed_milestones
    if payload.completed_tasks is not None:
        current_data["completed_tasks"] = payload.completed_tasks
    if payload.progress_data is not None:
        current_data.update(payload.progress_data)
    sp.progress_data = current_data

    if sp.progress_pct >= 100.0 or payload.status == "completed":
        sp.status = ProjectStatus.completed
        sp.completed_at = datetime.now(timezone.utc)
        # Add evidence to student skills
        project = db.query(Project).filter(Project.id == project_id).first()
        if project:
            from models.skill import StudentSkill
            for ps in project.project_skills:
                ss = db.query(StudentSkill).filter(
                    StudentSkill.student_id == profile.id,
                    StudentSkill.skill_id == ps.skill_id,
                ).first()
                if ss:
                    ss.evidence_count = (ss.evidence_count or 0) + 1
                    from services.skill_gap_service import compute_blended_level
                    ss.blended_level = compute_blended_level(ss.self_rating, ss.assessed_level, ss.evidence_count)
            db.commit()
            from services.skill_gap_service import compute_gap_for_student
            from services.placement_readiness_service import compute_placement_readiness
            compute_gap_for_student(db, profile)
            compute_placement_readiness(db, profile)

    db.commit()
    return {
        "message": "Progress saved successfully",
        "progress_pct": sp.progress_pct,
        "status": sp.status.value,
        "completed_milestones": (sp.progress_data or {}).get("completed_milestones", []),
        "completed_tasks": (sp.progress_data or {}).get("completed_tasks", []),
    }

