"""
seed_activities_sample.py — Populates realistic sample data for:
1. Pending Mentorship Match Inquiries
2. Scheduled 1-on-1 Guidance Sessions
Targeting staff/mentor accounts (staff@bitsathy.ac.in, faculty.staff@bitsathy.ac.in, mentor@bitsathy.ac.in).
"""
import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from database import SessionLocal
from models.user import User, StudentProfile, MentorProfile
from models.mentor import MentorMatch, MatchStatus, MentoringSession, SessionStatus

def seed_sample_activities():
    db = SessionLocal()
    try:
        # Find mentors
        staff_user = db.query(User).filter(User.email == "staff@bitsathy.ac.in").first()
        faculty_user = db.query(User).filter(User.email == "faculty.staff@bitsathy.ac.in").first()
        mentor_user = db.query(User).filter(User.email == "mentor@bitsathy.ac.in").first()

        target_mentors = []
        for u in [staff_user, faculty_user, mentor_user]:
            if u:
                mp = db.query(MentorProfile).filter(MentorProfile.user_id == u.id).first()
                if mp:
                    target_mentors.append(mp)

        if not target_mentors:
            print("No target mentors found.")
            return

        print(f"Found {len(target_mentors)} target mentors: {[m.name for m in target_mentors]}")

        # Find or create sample students
        alex = db.query(StudentProfile).filter(StudentProfile.name == "Alex Chen").first()
        kanigasri = db.query(StudentProfile).filter(StudentProfile.name.ilike("%kanigasri%")).first()
        induja = db.query(StudentProfile).filter(StudentProfile.name.ilike("%induja%")).first()

        # Fallback students if not found
        students = [s for s in [kanigasri, induja, alex] if s]
        if not students:
            all_st = db.query(StudentProfile).limit(3).all()
            students = all_st

        print(f"Found students for seeding: {[s.name for s in students]}")

        now = datetime.now(timezone.utc)

        for mentor in target_mentors:
            print(f"\n--- Seeding for Mentor #{mentor.id} ({mentor.name}) ---")

            # 1. Seed Pending Mentorship Match Inquiries
            sample_inquiries = [
                {
                    "student": kanigasri if kanigasri else (students[0] if len(students) > 0 else None),
                    "score": 94.5,
                    "message": "I have completed Phase 1 of my technical roadmap and am seeking your guidance on distributed microservices architecture, system design for high-concurrency pipelines, and mock technical interview preparation for campus placements."
                },
                {
                    "student": induja if induja else (students[1] if len(students) > 1 else None),
                    "score": 89.0,
                    "message": "Hello Professor, I would appreciate your mentorship on full-stack optimization, API caching strategies, and reviewing my capstone portfolio projects prior to placement drives."
                }
            ]

            for item in sample_inquiries:
                st = item["student"]
                if not st:
                    continue
                # Check if pending or match exists
                existing_match = db.query(MentorMatch).filter(
                    MentorMatch.mentor_id == mentor.id,
                    MentorMatch.student_id == st.id
                ).first()

                if not existing_match:
                    new_match = MentorMatch(
                        student_id=st.id,
                        mentor_id=mentor.id,
                        match_score=item["score"],
                        status=MatchStatus.pending,
                        student_message=item["message"],
                        created_at=now - timedelta(hours=6)
                    )
                    db.add(new_match)
                    print(f"  + Added pending inquiry from {st.name}")
                elif existing_match.status != MatchStatus.pending:
                    # If already accepted, keep it or add another student inquiry
                    print(f"  - Match with {st.name} already exists (status: {existing_match.status.value})")

            # 2. Seed Scheduled 1-on-1 Guidance Sessions
            sample_sessions = [
                {
                    "student": alex if alex else (students[0] if len(students) > 0 else None),
                    "scheduled_at": now + timedelta(days=1, hours=3, minutes=30),
                    "duration": 45,
                    "status": SessionStatus.scheduled,
                    "agenda": "Placement Readiness Review & System Architecture Deep Dive",
                    "meeting_link": "https://meet.google.com/nov-guid-cs1",
                    "notes": "Evaluate recent assessment performance in Core Engineering and review high-priority gaps in Distributed Caching."
                },
                {
                    "student": kanigasri if kanigasri else (students[1] if len(students) > 1 else None),
                    "scheduled_at": now + timedelta(days=3, hours=5),
                    "duration": 30,
                    "status": SessionStatus.scheduled,
                    "agenda": "Resume Keyword Review & AI/ML Milestone Verification",
                    "meeting_link": "https://meet.google.com/nov-ml-guid",
                    "notes": "Review student's Phase 2 roadmap submission and discuss placement interview strategies."
                },
                {
                    "student": induja if induja else (students[0] if len(students) > 0 else None),
                    "scheduled_at": now - timedelta(days=2, hours=4),
                    "duration": 45,
                    "status": SessionStatus.completed,
                    "agenda": "Career GPS Milestones & Frontend State Management Evaluation",
                    "meeting_link": "https://meet.google.com/nov-fs-guid",
                    "notes": "Completed code walk-through of the candidate's portfolio and provided actionable feedback on optimization."
                }
            ]

            for s_data in sample_sessions:
                st = s_data["student"]
                if not st:
                    continue

                # Check if session already exists for this student and agenda
                existing_session = db.query(MentoringSession).filter(
                    MentoringSession.mentor_id == mentor.id,
                    MentoringSession.student_id == st.id,
                    MentoringSession.agenda == s_data["agenda"]
                ).first()

                if not existing_session:
                    new_session = MentoringSession(
                        student_id=st.id,
                        mentor_id=mentor.id,
                        scheduled_at=s_data["scheduled_at"],
                        duration_minutes=s_data["duration"],
                        status=s_data["status"],
                        agenda=s_data["agenda"],
                        meeting_link=s_data["meeting_link"],
                        notes=s_data["notes"]
                    )
                    db.add(new_session)
                    print(f"  + Added session ({s_data['status'].value}) with {st.name}: {s_data['agenda']}")
                else:
                    print(f"  - Session already exists: {s_data['agenda']}")

        db.commit()
        print("\nAll sample activities seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding sample activities: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_sample_activities()
