"""
services/resume_analysis_service.py — AI-powered Resume Text Extraction & Career Analysis Engine.

Pipeline:
  1. Extract raw text via PyMuPDF (PDF) or python-docx (DOCX).
  2. Validate readability: detect empty, corrupted, or scanned/image-only documents.
  3. Analyze content using configured AI (Google Gemini REST API or OpenAI GPT-4o).
     - If neither key is configured, return an explicit configuration required indicator.
     - Never invent skills or qualifications that are not in the document.
  4. Compare extracted skills against career requirements for the target role:
     - Demonstrated (explicit evidence in projects/experience)
     - Partially Demonstrated (keyword mentioned without depth)
     - Missing (required for target career but not present)
  5. Calculate skill coverage percentage with explicit documented formula.
  6. Generate actionable resume quality feedback, recommended projects, and learning topics.
"""
import os
import json
import logging
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from config import get_settings
from models.resume import Resume, ResumeSkill
from models.skill import Skill, StudentSkill, SkillCategory, CareerGoal, CareerSkillRequirement
from models.user import StudentProfile

logger = logging.getLogger(__name__)
settings = get_settings()

# Standard skill sets per career goal for comprehensive gap detection
CAREER_BENCHMARKS: Dict[str, List[Dict[str, Any]]] = {
    "Full Stack Developer": [
        {"name": "Python", "category": "technical", "required_level": 75, "importance": "high"},
        {"name": "JavaScript", "category": "technical", "required_level": 80, "importance": "high"},
        {"name": "TypeScript", "category": "technical", "required_level": 70, "importance": "medium"},
        {"name": "React", "category": "technical", "required_level": 80, "importance": "high"},
        {"name": "FastAPI", "category": "technical", "required_level": 70, "importance": "medium"},
        {"name": "Node.js", "category": "technical", "required_level": 65, "importance": "medium"},
        {"name": "SQL", "category": "technical", "required_level": 75, "importance": "high"},
        {"name": "PostgreSQL", "category": "technical", "required_level": 70, "importance": "medium"},
        {"name": "Docker", "category": "technical", "required_level": 60, "importance": "medium"},
        {"name": "Git", "category": "technical", "required_level": 85, "importance": "high"},
        {"name": "REST APIs", "category": "technical", "required_level": 85, "importance": "high"},
        {"name": "System Design", "category": "technical", "required_level": 65, "importance": "high"},
        {"name": "Communication", "category": "soft", "required_level": 75, "importance": "high"},
        {"name": "Problem Solving", "category": "soft", "required_level": 80, "importance": "high"},
    ],
    "Backend Engineer": [
        {"name": "Python", "category": "technical", "required_level": 85, "importance": "high"},
        {"name": "FastAPI", "category": "technical", "required_level": 80, "importance": "high"},
        {"name": "SQL", "category": "technical", "required_level": 85, "importance": "high"},
        {"name": "PostgreSQL", "category": "technical", "required_level": 80, "importance": "high"},
        {"name": "Docker", "category": "technical", "required_level": 75, "importance": "high"},
        {"name": "Git", "category": "technical", "required_level": 85, "importance": "high"},
        {"name": "REST APIs", "category": "technical", "required_level": 90, "importance": "high"},
        {"name": "System Design", "category": "technical", "required_level": 75, "importance": "high"},
        {"name": "CI/CD", "category": "technical", "required_level": 65, "importance": "medium"},
        {"name": "Arrays & Strings", "category": "dsa", "required_level": 75, "importance": "high"},
        {"name": "Problem Solving", "category": "soft", "required_level": 80, "importance": "high"},
    ],
    "Frontend Engineer": [
        {"name": "JavaScript", "category": "technical", "required_level": 90, "importance": "high"},
        {"name": "TypeScript", "category": "technical", "required_level": 80, "importance": "high"},
        {"name": "React", "category": "technical", "required_level": 90, "importance": "high"},
        {"name": "REST APIs", "category": "technical", "required_level": 80, "importance": "high"},
        {"name": "Git", "category": "technical", "required_level": 80, "importance": "high"},
        {"name": "Communication", "category": "soft", "required_level": 75, "importance": "high"},
        {"name": "Problem Solving", "category": "soft", "required_level": 75, "importance": "high"},
    ],
    "Data Scientist": [
        {"name": "Python", "category": "technical", "required_level": 90, "importance": "high"},
        {"name": "Machine Learning", "category": "technical", "required_level": 80, "importance": "high"},
        {"name": "Pandas", "category": "technical", "required_level": 85, "importance": "high"},
        {"name": "NumPy", "category": "technical", "required_level": 85, "importance": "high"},
        {"name": "TensorFlow", "category": "technical", "required_level": 75, "importance": "high"},
        {"name": "SQL", "category": "technical", "required_level": 80, "importance": "high"},
        {"name": "Git", "category": "technical", "required_level": 75, "importance": "medium"},
        {"name": "Problem Solving", "category": "soft", "required_level": 85, "importance": "high"},
    ],
    "DevOps Engineer": [
        {"name": "Docker", "category": "technical", "required_level": 90, "importance": "high"},
        {"name": "CI/CD", "category": "technical", "required_level": 85, "importance": "high"},
        {"name": "Git", "category": "technical", "required_level": 90, "importance": "high"},
        {"name": "Cloud Computing (AWS)", "category": "technical", "required_level": 80, "importance": "high"},
        {"name": "Python", "category": "technical", "required_level": 70, "importance": "medium"},
        {"name": "System Design", "category": "technical", "required_level": 70, "importance": "high"},
        {"name": "Problem Solving", "category": "soft", "required_level": 80, "importance": "high"},
    ],
}


def extract_text_pdf(file_path: str) -> str:
    """Extracts raw text from a PDF file using PyMuPDF (fitz)."""
    try:
        import fitz
        doc = fitz.open(file_path)
        pages_text = []
        for page in doc:
            txt = page.get_text() or ""
            pages_text.append(txt)
        doc.close()
        return "\n".join(pages_text).strip()
    except Exception as e:
        logger.warning(f"PyMuPDF extraction failed for {file_path}: {e}")
        return ""


def extract_text_docx(file_path: str) -> str:
    """Extracts raw text from a DOCX file using python-docx."""
    try:
        from docx import Document
        doc = Document(file_path)
        text_parts = []
        for para in doc.paragraphs:
            if para.text.strip():
                text_parts.append(para.text.strip())
        for table in doc.tables:
            for row in table.rows:
                row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_text:
                    text_parts.append(" | ".join(row_text))
        return "\n".join(text_parts).strip()
    except Exception as e:
        logger.warning(f"python-docx extraction failed for {file_path}: {e}")
        return ""


def extract_text(file_path: str, filename: str) -> str:
    """Extracts raw text according to extension."""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return extract_text_pdf(file_path)
    elif ext in (".docx", ".doc"):
        return extract_text_docx(file_path)
    return ""


AI_RESUME_PROMPT = """
You are an expert technical resume parser and career advisor.
Your task is to analyze the following resume text and return a STRICT, VALID JSON response.

CRITICAL RULES:
1. Ground every single extracted skill, degree, project, and experience item STRICTLY in the provided resume text.
2. NEVER invent, hallucinate, or infer skills or credentials that are not clearly mentioned in the text.
3. If an item (such as phone, email, GPA) is absent, return null.
4. Extract technical skills, soft skills, programming languages, and tools explicitly mentioned with evidence snippets.
5. Provide realistic, constructive resume quality improvements.
6. Suggest realistic projects and learning topics targeted to strengthen their background.
7. Return ONLY valid JSON, no markdown fences, no surrounding commentary.

Target Career Goal: {career_goal}

JSON Structure:
{{
  "candidate": {{
    "name": "Full Name or null",
    "email": "Email or null",
    "phone": "Phone or null",
    "summary": "Brief 1-2 sentence professional summary based strictly on the resume"
  }},
  "education": [
    {{
      "degree": "e.g., B.Tech Computer Science and Engineering",
      "institution": "University/College name",
      "year": "e.g., 2022-2026 or graduation year",
      "gpa_or_grade": "CGPA/Percentage or null"
    }}
  ],
  "technical_skills": [
    {{
      "name": "Skill Name (e.g. Python)",
      "category": "technical",
      "proficiency": "beginner|intermediate|advanced",
      "evidence": "Brief mention or context in resume where this skill was used"
    }}
  ],
  "soft_skills": [
    {{
      "name": "Skill Name (e.g. Teamwork)",
      "evidence": "Context or project where demonstrated"
    }}
  ],
  "programming_languages": ["e.g. Python", "JavaScript"],
  "frameworks_and_tools": ["e.g. React", "FastAPI", "Git", "Docker"],
  "projects": [
    {{
      "title": "Project Title",
      "description": "Short description of project",
      "tech_stack": ["React", "FastAPI"],
      "impact": "Outcome, metric, or highlights if mentioned"
    }}
  ],
  "experience": [
    {{
      "title": "Role Title (e.g., Software Intern)",
      "company": "Organization/Company name",
      "duration": "Dates/Duration",
      "type": "internship|fulltime|parttime|freelance",
      "highlights": ["Key responsibility or achievement"]
    }}
  ],
  "certifications": [
    {{
      "name": "Certification Name",
      "issuer": "Issuing Organization or null",
      "year": "Year or null"
    }}
  ],
  "strengths": [
    "Key strength supported by resume evidence"
  ],
  "areas_for_improvement": [
    "Specific area of technical or presentation improvement"
  ],
  "resume_quality_score": 82,
  "resume_feedback": [
    "Actionable feedback bullet 1 (e.g. Add quantifiable metrics to project outcomes)",
    "Actionable feedback bullet 2"
  ],
  "suggested_projects": [
    {{
      "title": "Project Idea",
      "description": "How this project builds missing career capabilities",
      "skills_learned": ["FastAPI", "Docker"],
      "difficulty": "Intermediate"
    }}
  ],
  "learning_roadmap": [
    {{
      "topic": "Topic Name",
      "duration": "2 weeks",
      "target_skill": "Skill Name",
      "resources": [
        {{"title": "Documentation / Course", "url": "https://example.com", "type": "docs|course|article"}}
      ]
    }}
  ]
}}

Resume Text:
{text}
"""


def _call_gemini_for_resume(raw_text: str, career_goal: str) -> Optional[Dict[str, Any]]:
    """Calls Google Gemini REST API with the resume text and career goal."""
    api_key = settings.gemini_api_key
    if not api_key:
        return None

    models_to_try = [settings.gemini_model, "gemini-flash-lite-latest", "gemini-flash-latest"]
    prompt = AI_RESUME_PROMPT.format(career_goal=career_goal, text=raw_text[:12000])

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 3000,
            "responseMimeType": "application/json"
        }
    }
    data = json.dumps(payload).encode("utf-8")

    for model_name in models_to_try:
        if not model_name:
            continue
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                res = json.loads(response.read().decode("utf-8"))
                candidates = res.get("candidates", [])
                if candidates and candidates[0].get("content", {}).get("parts"):
                    raw_out = candidates[0]["content"]["parts"][0]["text"].strip()
                    # Clean potential markdown fences if present
                    if raw_out.startswith("```json"):
                        raw_out = raw_out[7:]
                    if raw_out.startswith("```"):
                        raw_out = raw_out[3:]
                    if raw_out.endswith("```"):
                        raw_out = raw_out[:-3]
                    return json.loads(raw_out.strip())
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            logger.warning(f"Gemini model {model_name} HTTP {e.code}: {err_body}")
            continue
        except Exception as e:
            logger.warning(f"Gemini model {model_name} error: {e}")
            continue
    return None


def _call_openai_for_resume(raw_text: str, career_goal: str) -> Optional[Dict[str, Any]]:
    """Calls OpenAI API if configured."""
    if not settings.openai_api_key:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)
        prompt = AI_RESUME_PROMPT.format(career_goal=career_goal, text=raw_text[:12000])
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logger.warning(f"OpenAI analysis error: {e}")
        return None


def analyze_resume_with_ai(raw_text: str, career_goal: str = "Full Stack Developer") -> Dict[str, Any]:
    """
    Analyzes resume text using Gemini or OpenAI.
    If no AI API key is configured, returns a dictionary with ai_configured=False.
    """
    if not settings.ai_enabled:
        return {
            "ai_configured": False,
            "error_type": "AI_NOT_CONFIGURED",
            "message": "AI service is not configured. Please set GEMINI_API_KEY or OPENAI_API_KEY in backend/.env to enable automated AI resume analysis.",
            "candidate": None,
            "technical_skills": [],
            "soft_skills": [],
            "programming_languages": [],
            "frameworks_and_tools": [],
            "projects": [],
            "education": [],
            "experience": [],
            "certifications": [],
            "strengths": [],
            "areas_for_improvement": [],
            "resume_quality_score": 0,
            "resume_feedback": [
                "Configure GEMINI_API_KEY or OPENAI_API_KEY in backend/.env to unlock deep AI resume parsing."
            ],
            "suggested_projects": [],
            "learning_roadmap": []
        }

    # Try Gemini first if key available
    if settings.gemini_api_key:
        gemini_result = _call_gemini_for_resume(raw_text, career_goal)
        if gemini_result:
            gemini_result["ai_configured"] = True
            gemini_result["provider"] = "Gemini"
            return gemini_result

    # Try OpenAI if available
    if settings.openai_api_key:
        openai_result = _call_openai_for_resume(raw_text, career_goal)
        if openai_result:
            openai_result["ai_configured"] = True
            openai_result["provider"] = "OpenAI"
            return openai_result

    # Both attempted and failed
    return {
        "ai_configured": True,
        "error_type": "AI_CALL_FAILED",
        "message": "AI analysis service is temporarily unreachable. Please verify network access and API credentials.",
        "candidate": None,
        "technical_skills": [],
        "soft_skills": [],
        "programming_languages": [],
        "frameworks_and_tools": [],
        "projects": [],
        "education": [],
        "experience": [],
        "certifications": [],
        "strengths": [],
        "areas_for_improvement": [],
        "resume_quality_score": 60,
        "resume_feedback": ["Could not connect to external AI service to generate in-depth feedback."],
        "suggested_projects": [],
        "learning_roadmap": []
    }


def compute_career_skill_alignment(
    db: Session,
    student: StudentProfile,
    career_goal_name: str,
    extracted_technical_skills: List[Dict[str, Any]],
    extracted_projects: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Compares the student's verified resume skills against the skills required for the career goal.
    Categorizes skills into:
      - demonstrated: Explicitly backed by projects or strong context
      - partially_demonstrated: Mentioned with basic proficiency or keyword context
      - missing: Required for role but absent from resume
    Computes coverage percentage:
      Coverage % = ((demonstrated * 1.0 + partial * 0.5) / total_required) * 100
    """
    # 1. Fetch benchmark required skills
    required_skills = CAREER_BENCHMARKS.get(career_goal_name)
    if not required_skills:
        # Fallback to Full Stack Developer if unknown title
        required_skills = CAREER_BENCHMARKS.get("Full Stack Developer", [])

    # Create case-insensitive lookup of extracted skills
    extracted_map = {}
    for s in extracted_technical_skills:
        name = (s.get("name") or "").strip()
        if name:
            extracted_map[name.lower()] = s

    # Also inspect project tech stacks for evidence
    project_techs = set()
    for p in extracted_projects:
        for t in p.get("tech_stack", []):
            if isinstance(t, str):
                project_techs.add(t.strip().lower())

    demonstrated = []
    partially_demonstrated = []
    missing = []

    for req in required_skills:
        req_name = req["name"]
        req_lower = req_name.lower()
        importance = req.get("importance", "medium")

        if req_lower in extracted_map:
            match_data = extracted_map[req_lower]
            evidence = match_data.get("evidence", "")
            proficiency = match_data.get("proficiency", "intermediate")

            # Check if reinforced by a project
            has_project_evidence = req_lower in project_techs or any(req_lower in p.get("description", "").lower() for p in extracted_projects)

            if proficiency in ("intermediate", "advanced") or has_project_evidence:
                demonstrated.append({
                    "skill": req_name,
                    "category": req.get("category", "technical"),
                    "required_level": req.get("required_level", 75),
                    "evidence": evidence or f"Demonstrated in resume and project implementations.",
                    "status": "demonstrated",
                    "importance": importance
                })
            else:
                partially_demonstrated.append({
                    "skill": req_name,
                    "category": req.get("category", "technical"),
                    "required_level": req.get("required_level", 75),
                    "evidence": evidence or f"Mentioned in resume; needs portfolio project evidence.",
                    "status": "partially_demonstrated",
                    "importance": importance
                })
        else:
            missing.append({
                "skill": req_name,
                "category": req.get("category", "technical"),
                "required_level": req.get("required_level", 75),
                "importance": importance,
                "status": "missing",
                "recommended_action": f"Add a project utilizing {req_name} to strengthen your profile for {career_goal_name}."
            })

    total_required = len(required_skills)
    demonstrated_count = len(demonstrated)
    partial_count = len(partially_demonstrated)
    missing_count = len(missing)

    coverage_percentage = 0.0
    if total_required > 0:
        coverage_percentage = round(((demonstrated_count * 1.0 + partial_count * 0.5) / total_required) * 100, 1)

    return {
        "career_goal": career_goal_name,
        "total_required_skills": total_required,
        "demonstrated_count": demonstrated_count,
        "partially_demonstrated_count": partial_count,
        "missing_count": missing_count,
        "coverage_percentage": coverage_percentage,
        "coverage_explanation": f"Calculated as (Demonstrated Skills [{demonstrated_count}] + 0.5 × Partially Demonstrated [{partial_count}]) ÷ Total Required Skills [{total_required}] × 100",
        "demonstrated": demonstrated,
        "partially_demonstrated": partially_demonstrated,
        "missing": missing
    }


def process_resume_upload(
    db: Session,
    student: StudentProfile,
    file_path: str,
    filename: str,
    career_goal: Optional[str] = None
) -> Resume:
    """
    Processes resume upload:
      - Validates and extracts text
      - Handles unreadable/scanned error gracefully
      - Runs AI extraction and career comparison
      - Persists to database
    """
    raw_text = extract_text(file_path, filename)
    clean_text = raw_text.strip()

    # Determine career goal
    active_goal = None
    if not career_goal:
        active_goal = db.query(CareerGoal).filter(CareerGoal.student_id == student.id, CareerGoal.is_active == True).first()
        if active_goal:
            career_goal = active_goal.title
        elif student.target_role:
            career_goal = student.target_role
        else:
            career_goal = "Full Stack Developer"

    # Handle unreadable / scanned documents gracefully
    if len(clean_text) < 50:
        resume = Resume(
            student_id=student.id,
            filename=filename,
            file_path=file_path,
            raw_text=raw_text,
            parsed_data={
                "error": "UNREADABLE_FILE",
                "message": "The uploaded resume contains little or no extractable text. If this is a scanned or image-based document, please provide a text-searchable PDF or DOCX file.",
                "candidate": None,
                "technical_skills": [],
                "projects": [],
                "education": [],
                "experience": [],
                "resume_quality_score": 0,
                "resume_feedback": [
                    "Resume text could not be extracted cleanly.",
                    "Ensure you export your resume from Word, Google Docs, or Canva using 'Download as PDF' with selectable text."
                ]
            },
            analysis_score=0.0,
            analysis_feedback="Uploaded document contains no extractable text. Please upload a standard text PDF or DOCX.",
            analyzed_at=datetime.now(timezone.utc)
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)
        return resume

    # Run AI Analysis
    parsed_data = analyze_resume_with_ai(clean_text, career_goal=career_goal)

    # Compute Career Skill Alignment
    alignment = compute_career_skill_alignment(
        db=db,
        student=student,
        career_goal_name=career_goal,
        extracted_technical_skills=parsed_data.get("technical_skills", []),
        extracted_projects=parsed_data.get("projects", [])
    )
    parsed_data["career_alignment"] = alignment

    # Create Resume Record
    quality_score = float(parsed_data.get("resume_quality_score") or 75.0)
    feedback_text = "\n".join(parsed_data.get("resume_feedback", []))

    resume = Resume(
        student_id=student.id,
        filename=filename,
        file_path=file_path,
        raw_text=raw_text,
        parsed_data=parsed_data,
        analysis_score=quality_score,
        analysis_feedback=feedback_text,
        analyzed_at=datetime.now(timezone.utc)
    )
    db.add(resume)
    db.flush()

    # Store individual ResumeSkill rows
    for sk in parsed_data.get("technical_skills", []):
        sk_name = sk.get("name")
        if sk_name:
            rs = ResumeSkill(
                resume_id=resume.id,
                skill_name=sk_name,
                proficiency=sk.get("proficiency", "intermediate"),
                confidence=0.85,
                accepted=False
            )
            db.add(rs)

    db.commit()
    db.refresh(resume)
    return resume
