"""
services/career_assistant_service.py — AI Career Coach grounded in student's real profile.

Every GPT-4o call receives a system prompt built from the student's actual data:
- Active career goal
- Top 5 skill gaps (with priority and gap %)
- Current roadmap week
- Placement readiness score and limiting factors
- Recent assessment history

If OpenAI key is absent, returns deterministic stub answers that reference real data.
"""
import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from config import get_settings
from models.user import StudentProfile
from models.skill_gap import SkillGap, GapPriority
from models.roadmap import Roadmap, RoadmapItem
from models.placement import PlacementReadiness
from models.assessment import AssessmentAttempt, AttemptStatus
from models.skill import CareerGoal

settings = get_settings()


def _build_student_context(db: Session, student: StudentProfile) -> str:
    """Builds a rich system prompt from the student's real data."""
    lines = [f"Student name: {student.name}"]

    # Career goal
    goal = db.query(CareerGoal).filter(CareerGoal.student_id == student.id, CareerGoal.is_active == True).first()
    if goal:
        lines.append(f"Career goal: {goal.title}")

    # Top gaps
    gaps = db.query(SkillGap).filter(
        SkillGap.student_id == student.id,
        SkillGap.gap_value > 0,
    ).order_by(SkillGap.gap_value.desc()).limit(5).all()
    if gaps:
        gap_strs = [f"{g.skill.name if g.skill else g.skill_id} (gap: {g.gap_value:.0f}%, priority: {g.priority.value})" for g in gaps]
        lines.append(f"Top skill gaps: {', '.join(gap_strs)}")

    # Placement readiness
    readiness = db.query(PlacementReadiness).filter(PlacementReadiness.student_id == student.id).first()
    if readiness:
        lines.append(f"Current placement readiness: {readiness.overall_score:.1f}%")
        if readiness.breakdown and readiness.breakdown.get("limiting_factors"):
            lf = readiness.breakdown["limiting_factors"][:2]
            lf_strs = [f"{f['factor']} ({f['current_score']:.0f}%)" for f in lf]
            lines.append(f"Main limiting factors: {', '.join(lf_strs)}")

    # Roadmap current week
    roadmap = db.query(Roadmap).filter(Roadmap.student_id == student.id, Roadmap.is_active == True).first()
    if roadmap:
        pending_items = [i for i in roadmap.items if i.status.value in ("pending", "in_progress")]
        if pending_items:
            current = pending_items[0]
            lines.append(f"Current roadmap focus: Week {current.week_number} — {current.title}")

    # Recent assessments
    recent = db.query(AssessmentAttempt).filter(
        AssessmentAttempt.student_id == student.id,
        AssessmentAttempt.status == AttemptStatus.completed,
    ).order_by(AssessmentAttempt.completed_at.desc()).limit(3).all()
    if recent:
        score_strs = [f"{a.assessment.title} ({a.score:.0f}%)" if a.assessment else f"Assessment ({a.score:.0f}%)" for a in recent]
        lines.append(f"Recent assessment scores: {', '.join(score_strs)}")

    return "\n".join(lines)


SYSTEM_TEMPLATE = """
You are SkillNova AI Career Coach — a knowledgeable, encouraging advisor helping students reach their career goals.
You have access to the following real-time student data. Always ground your advice in this data.

=== STUDENT PROFILE ===
{context}
======================

Guidelines:
- Be specific, actionable, and data-driven. Reference exact skills, scores, and gaps when relevant.
- Keep responses concise (3-5 sentences unless asked for detail).
- If asked in a different language, respond in that language (technical terms like "Python", "API" stay in English).
- Never fabricate data that is not in the student profile above.
"""


import urllib.request
import urllib.error
import logging

logger = logging.getLogger(__name__)


def _call_gemini_api(context: str, messages: List[Dict[str, str]], language: str = "en") -> Optional[str]:
    """Calls Google Gemini REST API with student profile grounded context."""
    api_key = settings.gemini_api_key
    if not api_key:
        return None

    # Priority order of models with verified compatibility
    models_to_try = [settings.gemini_model, "gemini-flash-lite-latest", "gemini-flash-latest"]
    seen = set()
    models = []
    for m in models_to_try:
        if m and m not in seen:
            seen.add(m)
            models.append(m)

    system_instruction = SYSTEM_TEMPLATE.format(context=context)
    if language and language != "en":
        system_instruction += f"\n\nIMPORTANT: The student's preferred language is '{language}'. Respond in that language while keeping technical terms in English."

    formatted_contents = []
    for m in messages:
        role = "user" if m.get("role") == "user" else "model"
        text = (m.get("content") or "").strip()
        if not text:
            continue
        if formatted_contents and formatted_contents[-1]["role"] == role:
            formatted_contents[-1]["parts"][0]["text"] += f"\n\n{text}"
        else:
            formatted_contents.append({"role": role, "parts": [{"text": text}]})

    if not formatted_contents:
        formatted_contents = [{"role": "user", "parts": [{"text": "Hello, how can I improve my skills for my career goal?"}]}]
    elif formatted_contents[0]["role"] != "user":
        formatted_contents.insert(0, {"role": "user", "parts": [{"text": "Hello"}]})

    payload = {
        "system_instruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": formatted_contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 600,
        }
    }
    data = json.dumps(payload).encode("utf-8")

    for model_name in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=12) as response:
                res = json.loads(response.read().decode("utf-8"))
                candidates = res.get("candidates", [])
                if candidates and candidates[0].get("content", {}).get("parts"):
                    return candidates[0]["content"]["parts"][0]["text"].strip()
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            logger.warning(f"Gemini API model {model_name} HTTP {e.code}: {err_body}")
            continue
        except Exception as e:
            logger.warning(f"Gemini API model {model_name} error: {e}")
            continue

    return None


def get_ai_response(
    db: Session,
    student: StudentProfile,
    messages: List[Dict[str, str]],
    language: str = "en",
) -> str:
    """Returns AI response, grounded in student's real profile data."""
    context = _build_student_context(db, student)

    if not settings.ai_enabled:
        return _stub_response(context, messages, language)

    # 1. Try Gemini first if key is configured
    if settings.gemini_api_key:
        try:
            gemini_reply = _call_gemini_api(context, messages, language)
            if gemini_reply:
                return gemini_reply
        except Exception as e:
            logger.error(f"Gemini generation failed: {e}")

    # 2. Try OpenAI fallback if key is configured
    if settings.openai_api_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.openai_api_key)

            system_message = SYSTEM_TEMPLATE.format(context=context)
            if language != "en":
                system_message += f"\n\nIMPORTANT: The student's preferred language is '{language}'. Respond in that language."

            full_messages = [{"role": "system", "content": system_message}] + messages

            response = client.chat.completions.create(
                model=settings.openai_model,
                messages=full_messages,
                temperature=0.7,
                max_tokens=500,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI generation failed: {e}")

    # 3. Fallback to deterministic grounded response
    return _stub_response(context, messages, language)


def _stub_response(context: str, messages: List[Dict[str, str]], language: str) -> str:
    """Returns a deterministic, data-grounded response when OpenAI is unavailable."""
    last_user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")

    # Extract key data from context for grounding
    lines = {line.split(":")[0].strip(): ":".join(line.split(":")[1:]).strip() for line in context.split("\n") if ":" in line}

    name = lines.get("Student name", "there")
    goal = lines.get("Career goal", "your target role")
    gaps = lines.get("Top skill gaps", "some areas that need improvement")
    readiness = lines.get("Current placement readiness", "")
    roadmap = lines.get("Current roadmap focus", "")

    if any(kw in last_user_msg.lower() for kw in ["focus", "next", "what should", "priority"]):
        return (
            f"Hi {name}! Based on your profile, your top skill gaps are: {gaps}. "
            f"I recommend focusing on these in the order listed — high-priority gaps have the biggest impact on your {goal} journey. "
            f"{f'Your current roadmap focus is: {roadmap}.' if roadmap else ''} "
            f"Consistent daily practice (even 1 hour) compounded over weeks makes a huge difference."
        )
    elif any(kw in last_user_msg.lower() for kw in ["ready", "placement", "score", "readiness"]):
        return (
            f"Your current placement readiness is {readiness}. "
            f"The fastest way to improve it is to close your high-priority skill gaps: {gaps}. "
            f"Complete one assessment per week and track your progress — the score updates automatically after each attempt."
        )
    else:
        return (
            f"Great question! As someone targeting {goal}, your most impactful next step is addressing: {gaps}. "
            f"Your placement readiness score is {readiness} — let's push that higher together. "
            f"What specific area would you like to dive into?"
        )
