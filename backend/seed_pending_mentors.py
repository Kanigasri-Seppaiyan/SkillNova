"""
seed_pending_mentors.py — Seeds sample pending mentor applications
for testing the Admin Operations Panel approval/rejection workflows.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
from models.user import User, UserRole, MentorProfile, MentorStatus
from models.mentor import MentorSkill
from models.skill import Skill
from services.auth_service import hash_password

SAMPLE_MENTORS = [
    {
        "name": "Dr. Rajesh Kumar",
        "email": "rajesh.cse@bitsathy.ac.in",
        "password": "Faculty@123",
        "domain": "Artificial Intelligence & Deep Learning",
        "years_experience": 8,
        "availability_hours_per_week": 6.0,
        "linkedin_url": "https://linkedin.com/in/rajeshkumar-cse-phd",
        "bio": "Associate Professor in CSE specializing in LLMs, Computer Vision, and Applied AI. Mentored 40+ UG capstone projects and guided students to Tier-1 product companies.",
        "skills": ["Python", "Machine Learning", "NumPy", "Pandas", "Docker"],
        "max_students": 6,
    },
    {
        "name": "Prof. Ananya Sundaram",
        "email": "ananya.it@bitsathy.ac.in",
        "password": "Faculty@123",
        "domain": "Full Stack & Distributed Systems",
        "years_experience": 6,
        "availability_hours_per_week": 8.0,
        "linkedin_url": "https://linkedin.com/in/ananya-sundaram-tech",
        "bio": "Lead Developer and Adjunct Faculty. Passionate about microservices architecture, modern web development pipelines, and preparing students for full-stack placement interviews.",
        "skills": ["JavaScript", "TypeScript", "React", "FastAPI", "PostgreSQL"],
        "max_students": 8,
    },
    {
        "name": "Dr. Vikram Seth",
        "email": "vikram.ece@bitsathy.ac.in",
        "password": "Faculty@123",
        "domain": "Cloud Infrastructure & DevOps",
        "years_experience": 11,
        "availability_hours_per_week": 5.0,
        "linkedin_url": "https://linkedin.com/in/dr-vikram-seth-devops",
        "bio": "Senior Cloud Architect and Visiting Researcher. Dedicated to guiding pre-final and final year students through production-grade AWS cloud deployments, containerization, and site reliability engineering.",
        "skills": ["AWS", "Docker", "Kubernetes", "CI/CD", "Python"],
        "max_students": 5,
    },
    {
        "name": "Prof. Meenakshi Ramanathan",
        "email": "meenakshi.ds@bitsathy.ac.in",
        "password": "Faculty@123",
        "domain": "Data Engineering & Analytics",
        "years_experience": 7,
        "availability_hours_per_week": 7.0,
        "linkedin_url": "https://linkedin.com/in/meenakshi-ramanathan",
        "bio": "Assistant Professor in Data Science with industry background in scalable data warehouses, ETL pipelines, and algorithmic problem solving. Enthusiastic about 1-on-1 student career guidance.",
        "skills": ["SQL", "MongoDB", "PostgreSQL", "Python", "Pandas"],
        "max_students": 6,
    },
]


def seed_pending_mentors():
    db = SessionLocal()
    try:
        created_count = 0
        updated_count = 0
        all_skills_map = {s.name.lower(): s for s in db.query(Skill).all()}

        for item in SAMPLE_MENTORS:
            user = db.query(User).filter(User.email == item["email"]).first()
            if not user:
                user = User(
                    email=item["email"],
                    password_hash=hash_password(item["password"]),
                    role=UserRole.mentor,
                    is_active=True
                )
                db.add(user)
                db.flush()
                created_count += 1
            else:
                user.role = UserRole.mentor
                user.is_active = True
                user.password_hash = hash_password(item["password"])
                db.flush()

            profile = db.query(MentorProfile).filter(MentorProfile.user_id == user.id).first()
            if not profile:
                profile = MentorProfile(
                    user_id=user.id,
                    name=item["name"],
                    bio=item["bio"],
                    domain=item["domain"],
                    years_experience=item["years_experience"],
                    availability_hours_per_week=item["availability_hours_per_week"],
                    linkedin_url=item["linkedin_url"],
                    status=MentorStatus.pending,
                    max_students=item["max_students"]
                )
                db.add(profile)
                db.flush()
            else:
                profile.name = item["name"]
                profile.bio = item["bio"]
                profile.domain = item["domain"]
                profile.years_experience = item["years_experience"]
                profile.availability_hours_per_week = item["availability_hours_per_week"]
                profile.linkedin_url = item["linkedin_url"]
                profile.status = MentorStatus.pending
                profile.max_students = item["max_students"]
                profile.rejection_reason = None
                db.flush()
                updated_count += 1

            # Ensure skills are linked
            existing_skill_ids = {ms.skill_id for ms in profile.mentor_skills}
            for skill_name in item["skills"]:
                matched_skill = all_skills_map.get(skill_name.lower())
                if matched_skill and matched_skill.id not in existing_skill_ids:
                    db.add(MentorSkill(
                        mentor_id=profile.id,
                        skill_id=matched_skill.id,
                        proficiency_level=90.0,
                        expertise_years=float(item["years_experience"])
                    ))

        db.commit()
        print(f"[SUCCESS] Seeded pending mentor applications! ({created_count} created, {updated_count} refreshed)")
        for m in SAMPLE_MENTORS:
            print(f"  • {m['name']} ({m['email']}) — {m['domain']} ({m['years_experience']} yrs exp)")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to seed pending mentors: {e}")
        import traceback; traceback.print_exc()
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_pending_mentors()
