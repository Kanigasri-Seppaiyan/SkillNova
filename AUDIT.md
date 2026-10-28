# SkillNova Comprehensive System Audit (AUDIT.md)

**Date:** 2026-10-12  
**Platform:** SkillNova – Smart AI Career Companion  
**Stack:** React + TypeScript (Vite, Port 3000), Python FastAPI + SQLAlchemy (Port 8000), SQLite / PostgreSQL

---

## 1. Frontend Architecture Audit

### Routes & Navigation ([App.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/App.tsx))
- **Public Routes:**
  - `/login`: [Login.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/pages/Login.tsx) — Email/Password + Google Identity Services (GSI).
  - `/register`: [Register.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/pages/Register.tsx) — Registration form.
- **Student Protected Routes:**
  - `/onboarding`: [Onboarding.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/pages/Onboarding.tsx) — 4-step wizard for career targets, learning hours, and initial skills.
  - `/dashboard`: [Dashboard.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/pages/Dashboard.tsx) — Main student dashboard (readiness gauge, roadmap progress, gaps, twin benchmark).
  - `/skills`: [Skills.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/pages/Skills.tsx) — Radar chart, skill catalog, self-rating, gap analysis.
  - `/assessments` & `/assessments/:id`: [Assessments.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/pages/Assessments.tsx), [AssessmentTake.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/pages/AssessmentTake.tsx) — Timed MCQs with grading.
  - `/roadmap`: [Roadmap.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/pages/Roadmap.tsx) — 12-week phase-based milestones with proof verification.
  - `/placement-readiness`: [PlacementReadiness.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/pages/PlacementReadiness.tsx) — Weighted composite placement index (0-100).
  - `/projects`: [Projects.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/pages/Projects.tsx) — Recommended portfolio projects.
  - `/mentors`: [Mentors.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/pages/Mentors.tsx) — Smart mentor discovery & match cards.
  - `/ai-chat`: [AIChat.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/pages/AIChat.tsx) — Career coach chatbot with voice input/TTS.
  - `/career-gps`: [CareerGPS.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/pages/CareerGPS.tsx) — Milestone timeline, Career Twin, simulator projections.
  - `/resume-upload`: [ResumeUpload.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/pages/ResumeUpload.tsx) — PDF/DOCX parser and ATS keyword matching.
  - `/notifications`: [Notifications.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/pages/Notifications.tsx) — In-app notification feed.
- **Role-Specific Protected Routes:**
  - `/mentor-dashboard`: [MentorDashboard.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/pages/MentorDashboard.tsx) (Allowed: mentor, admin).
  - `/admin`: [AdminDashboard.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/pages/AdminDashboard.tsx) (Allowed: admin).

### Layouts & Navigation ([Sidebar.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/components/layout/Sidebar.tsx), [Navbar.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/components/layout/Navbar.tsx))
- **Current State:** A single shared `Layout` wraps all protected views. The `Sidebar` currently shows the complete student navigation to **all roles**, merely appending "Mentor Hub" or "Admin Panel" to the bottom.
- **Requirement:** Navigation and layout should be strictly separated by role (`StudentLayout`, `MentorLayout`, `AdminLayout`), and pending mentors must only see an "Awaiting Approval" screen.

### Auth Context & Hooks ([AuthContext.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/context/AuthContext.tsx))
- Manages `user`, `token`, `loading`, `login`, `googleLogin`, `register`, `logout`, `refreshUser`.
- Stores JWT token in `localStorage` under `skillnova_token`.
- On startup / token change, calls `/api/auth/me` to retrieve server-verified profile and role.

### API Client ([axios.ts](file:///c:/Users/Kanigasri/SkillNova/frontend/src/lib/axios.ts), [api.ts](file:///c:/Users/Kanigasri/SkillNova/frontend/src/services/api.ts))
- Axios client configured with `baseURL = import.meta.env.VITE_API_BASE_URL || '/api'`.
- Request interceptor automatically attaches `Authorization: Bearer <token>`.
- **Finding:** `api.ts` contains extensive `try ... catch` fallback blocks returning static mock objects (e.g., `MOCK_STUDENT`, `MOCK_GAPS`, `MOCK_ROSTER`). These mock fallbacks mask real backend responses or errors and must be systematically replaced with genuine backend error handling.

### Theme & Styling Tokens
- **Design System:** Dark-mode primary with Tailwind CSS (`bg-slate-950` canvas, `bg-slate-900/80` cards, `border-slate-800`).
- **Accent Tokens:** Indigo (`#6366f1`), Violet (`#8b5cf6`), Sky (`#38bdf8`), Emerald (`#10b981`), Rose (`#f43f5e`).
- **Typography:** Google Fonts Outfit & Inter.
- **Micro-interactions:** Glassmorphism, subtle glow blurs, hover scaling.

---

## 2. Backend Architecture Audit

### Framework, Database Engine & ORM
- **Framework:** FastAPI `0.104.1` with Uvicorn `0.24.0` in [main.py](file:///c:/Users/Kanigasri/SkillNova/backend/main.py).
- **ORM:** SQLAlchemy `2.0.23` with declarative models in [database.py](file:///c:/Users/Kanigasri/SkillNova/backend/database.py).
- **Database Engine:** SQLite `skillnova.db` in local development (with PostgreSQL connection pool configuration available in production settings).
- **Migrations:** Alembic `1.12.1` installed (`alembic.ini` and `alembic/env.py` present), but `alembic/versions` is currently empty. A custom script [migrate_roadmap.py](file:///c:/Users/Kanigasri/SkillNova/backend/migrate_roadmap.py) was previously used for schema additions.

### Routers & Namespaces
FastAPI routers mounted in `main.py`:
1. Core RBAC: `auth.py`, `student.py`, `mentor.py`, `admin.py`.
2. Domain routers: `skills.py`, `assessments.py`, `roadmap.py`, `projects.py`, `resume.py`, `placement.py`, `mentors.py`, `mentor_dashboard.py`, `notifications.py`, `progress.py`, `career.py`, `ai.py`, `skill_gaps.py`, `students.py`.

### Auth & JWT Logic ([auth_service.py](file:///c:/Users/Kanigasri/SkillNova/backend/services/auth_service.py), [dependencies.py](file:///c:/Users/Kanigasri/SkillNova/backend/dependencies.py))
- Password hashing: Passlib with Bcrypt.
- Token generation: `python-jose` (HS256) with 7-day expiration.
- Guards:
  - `get_current_user`: Decodes JWT, validates subject and active status.
  - `get_current_student`: Requires `role == "student"`.
  - `get_current_mentor`: Requires `role == "mentor"`.
  - `get_current_admin`: Requires `role == "admin"`.
  - `verify_mentor_assigned_student`: Checks whether student is assigned to the authenticated mentor in `mentor_matches`.

---

## 3. Enforcement of `@bitsathy.ac.in` Restriction

The restriction is currently enforced **both on frontend and backend**:
- **Frontend:**
  - [validateEmail.ts](file:///c:/Users/Kanigasri/SkillNova/frontend/src/utils/validateEmail.ts): `isAllowedInstituteEmail()` checks trimmed email ending in `@bitsathy.ac.in`.
  - `Login.tsx` & `Register.tsx`: Rejects non-conforming emails prior to submission.
- **Backend:**
  - [validate_email.py](file:///c:/Users/Kanigasri/SkillNova/backend/utils/validate_email.py): Strict domain parsing via `ALLOWED_DOMAIN = "bitsathy.ac.in"`.
  - [models/user.py](file:///c:/Users/Kanigasri/SkillNova/backend/models/user.py): `@validates("email")` SQLAlchemy model hook raises `ValueError` if email is not `@bitsathy.ac.in`.
  - [routers/auth.py](file:///c:/Users/Kanigasri/SkillNova/backend/routers/auth.py):
    - `POST /api/auth/register`: Rejects with 403 Forbidden.
    - `POST /api/auth/login`: Rejects with 403 Forbidden.
    - `POST /api/auth/google`: Verifies token with `google.oauth2.id_token.verify_oauth2_token()`, checks `email_verified == True`, and verifies exact domain `bitsathy.ac.in`.
  - [dependencies.py](file:///c:/Users/Kanigasri/SkillNova/backend/dependencies.py): `get_current_user` verifies both user and token email against `is_allowed_institute_email()`.

---

## 4. Existing Tables & Reusability Assessment

| Table | Status | Reusability / Needed Extension |
| :--- | :--- | :--- |
| `users` | Existing | **Reusable.** Contains `id`, `email`, `password_hash`, `role` (Enum), `is_active`. Needs mentor status linkage or separation. |
| `student_profiles` | Existing | **Reusable.** Contains bio, career goals, target role, daily hours, onboarding status. |
| `mentor_profiles` | Existing | **Needs Extension.** Contains bio, experience, availability hours, domain, linkedin. **Missing:** `status` (`pending`, `approved`, `rejected`, `suspended`), `max_students` (capacity limit), and rejection reasons. |
| `mentor_skills` | Existing | **Reusable.** Maps mentor to skills with proficiency and experience years. |
| `mentor_matches` | Existing | **Reusable as Mentoring Requests.** Maps student to mentor with score, status (`pending`, `accepted`, `rejected`, `completed`), messages, notes. |
| `mentor_feedback` | Existing | **Reusable.** Stores mentor rating, strengths, weaknesses, actionable recommendations. |
| `mentor_tasks` | Existing | **Reusable.** Student tasks assigned by mentor with due date and completion status. |
| `roadmaps` & `roadmap_items` | Existing | **Reusable.** Full 12-week roadmap structure with items, phases, proof submissions, and status. |
| `weekly_progress` | Existing | **Reusable.** Tracks weekly hours, tasks completed, assessments taken, readiness delta. |
| `audit_logs` | Existing | **Reusable.** Contains `actor_user_id`, `action_type`, `target_table`, `target_id`, `before_value`, `after_value`, `reason`, `timestamp`. Currently only logged by 1 endpoint; needs expansion to all admin actions. |
| `availability_slots` | **Missing** | **To Add.** Mentor available recurring day/time slots for student bookings. |
| `mentoring_sessions` | **Missing** | **To Add.** Scheduled sessions with date, time, meeting link, agenda, status (`scheduled`, `completed`, `cancelled`), and prep notes. |
| `notifications` | Existing | **Reusable.** In-app notification records with read/unread flags. |
| `skills`, `student_skills`, `skill_gaps` | Existing | **Reusable.** Full skill catalog and gap breakdown engine. |
| `assessments`, `assessment_attempts` | Existing | **Reusable.** MCQ assessments, attempts, and answer tracking. |
| `projects`, `student_projects` | Existing | **Reusable.** Portfolio project suggestions and tracking. |

---

## 5. Security Gaps Identified

1. **Role Accepted from Client During Registration (HIGH):**
   - In [routers/auth.py](file:///c:/Users/Kanigasri/SkillNova/backend/routers/auth.py#L60):
     ```python
     user_role = data.role if data.role in ["student", "mentor", "admin"] else "student"
     ```
   - **Vulnerability:** Any caller can submit `{"role": "admin"}` or `{"role": "mentor"}` in `POST /api/auth/register` to instantly create an admin or mentor account without authorization!
   - **Fix:** Registration must **strictly and exclusively** create a `student` role. Mentor onboarding must use an explicit application flow with `pending` status. Admin creation must only be possible via an authorized CLI script or existing admin promotion.

2. **Hardcoded Admin Credentials in Seed Script (MEDIUM):**
   - In [seed.py](file:///c:/Users/Kanigasri/SkillNova/backend/seed.py#L27): `ADMIN_EMAIL = "admin@bitsathy.ac.in"`, `DEMO_PASSWORD = "password123"`.
   - In [Login.tsx](file:///c:/Users/Kanigasri/SkillNova/frontend/src/pages/Login.tsx#L385): "Quick Demo Access" buttons automatically fill and submit admin credentials.
   - **Fix:** Remove hardcoded admin creation from automated flows. Provide a dedicated CLI tool: `python -m utils.create_admin --email ...` that prompts for password securely.

3. **Incomplete Audit Trail on Admin Actions (MEDIUM):**
   - While `audit_logs` table exists, [routers/admin.py](file:///c:/Users/Kanigasri/SkillNova/backend/routers/admin.py) only writes an audit record on `POST /score-override`.
   - User status updates (`PUT /users/{id}/status`), mentor approval/rejection, and role changes are **not logged** to `audit_logs`.
   - **Fix:** Implement automatic audit logging for every administrative state modification.

4. **Missing Status Enforcement on Mentors (HIGH):**
   - A mentor profile currently has no lifecycle state (`pending`, `approved`, `rejected`, `suspended`). Anyone with `role="mentor"` can immediately access mentor endpoints.
   - **Fix:** Add `MentorStatus` enum (`pending`, `approved`, `rejected`, `suspended`) and a dependency `require_approved_mentor`. Block all non-approved mentors with HTTP 403.

5. **Client Mock Fallbacks Masking Real Backend State (MEDIUM):**
   - Frontend `api.ts` intercepts failures and falls back to dummy mock constants, leading to scenarios where frontend appears to succeed even when backend is rejecting or disconnected.
   - **Fix:** Remove silent mock fallbacks; render true error banners and loading states.

6. **Missing Pagination & Filtering on Admin Endpoints (LOW):**
   - `GET /api/admin/users` returns `db.query(User).all()` without limits, search, or pagination.
   - **Fix:** Add query parameters `page`, `limit`, `search`, `role`, and `status`.

---

## 6. Feature Gap Analysis

| Feature | Current Status | Notes |
| :--- | :--- | :--- |
| **Strict Backend RBAC (student, mentor, admin)** | Partial | DB roles exist, but registration role-injection exists and mentor approval status is absent. |
| **Mentor Application & Approval Flow** | **Missing** | Mentors need an application form, initial `pending` state, and Admin approval action. |
| **Admin CLI Script (`create_admin`)** | **Missing** | Needed to replace hardcoded seed admin. |
| **Availability Slots & Calendar** | **Missing** | Mentors need to set available days/times; students view them when requesting sessions. |
| **Mentoring Sessions & Scheduling** | **Missing** | Data model and endpoints for scheduled sessions, status, and cancellation. |
| **Max Student Capacity Enforcement** | **Missing** | Block mentors from accepting requests when current accepted count reaches `max_students`. |
| **Separate Role Layouts & Navigation** | Partial | Needs distinct Sidebar/Navbar configs for Student, Mentor, and Admin. |
| **Pending Mentor "Awaiting Approval" Screen** | **Missing** | Pending mentors need an onboarding status banner and blocked access. |
| **Admin Search, Filtering & Pagination** | **Missing** | Admin users list and requests need server-side pagination. |
| **Admin Platform Activity & CSV Reports** | **Missing** | Need CSV export of student placement progress and mentor activity. |
| **Smart Mentor Match Breakdown** | **Implemented** | Functional in `mentor_matching_service.py` with multi-factor scoring. |
| **Skill Radar Chart** | **Implemented** | Working in `Skills.tsx` using Recharts. |
| **Session Prep Card** | **Missing** | Mentors should see student gaps, latest assessment, and recent progress before a session. |
| **Admin Health Panel** | **Missing** | Stalled students (14+ days inactive), unanswered requests, unassigned students. |
| **Admin Audit Log Viewer** | Partial | Backend endpoint exists; frontend needs dedicated UI in Admin Dashboard. |

---

## 7. Short Step-by-Step Implementation Plan

### Phase 1: Backend Security & Data Model Expansion
1. Update `models/mentor.py`:
   - Add `MentorStatus` enum (`pending`, `approved`, `rejected`, `suspended`).
   - Add `status`, `max_students`, `rejection_reason` to `MentorProfile`.
   - Add `AvailabilitySlot` model (`day_of_week`, `start_time`, `end_time`, `is_active`).
   - Add `MentoringSession` model (`student_id`, `mentor_id`, `slot_id`, `scheduled_at`, `status`, `notes`, `meeting_link`).
2. Generate and run Alembic migration for the schema additions (or safe non-destructive migration script).
3. Update `routers/auth.py`:
   - Enforce registration role = strictly `student` (ignore any client-provided role).
   - Add `POST /api/auth/mentor-apply` for mentor applications with `pending` status.
4. Update `dependencies.py`:
   - Add `require_role(*roles)` and `require_approved_mentor`.
   - Guard mentor endpoints with `require_approved_mentor`.
5. Implement `utils/create_admin.py` CLI script with secure password prompt and documented usage.
6. Enhance `routers/admin.py`:
   - Add pagination, search, and filtering to `/users`.
   - Add `/mentors/pending`, `/mentors/{id}/approve`, `/mentors/{id}/reject`, `/mentors/{id}/suspend`.
   - Add `/assign-mentor` endpoint.
   - Record `AuditLog` on all admin state changes.
   - Add `/reports/export-csv` endpoint.

### Phase 2: Student Portal Enhancements
1. Connect session booking flow using mentor availability slots.
2. Display session status (`scheduled`, `completed`, `cancelled`) in student portal.
3. Clean up any remaining mock data fallbacks in student services.

### Phase 3: Mentor Portal Enhancements
1. Add profile completion percentage calculator and edit profile endpoint (`PUT /api/mentor/profile`).
2. Add availability slots management (`GET`/`POST`/`DELETE /api/mentor/availability`).
3. Add capacity check: reject request acceptance when accepted student count >= `max_students`.
4. Add Session Prep Card endpoint (`GET /api/mentor/students/{id}/prep-card`) showing student gaps, readiness, and recent progress.
5. Add sessions scheduling & completion endpoints (`/api/mentor/sessions`).

### Phase 4: Admin Portal Enhancements
1. Add Mentor Application review tab (Approve / Reject modal with reason).
2. Add Admin Health Panel metrics (students with no progress in 14 days, unassigned students, pending mentor applications).
3. Add Audit Log Viewer tab in Admin Dashboard.
4. Add CSV report export button for student progress and placement readiness.

### Phase 5: Frontend Refactoring
1. Create separate navigation definitions in `Sidebar.tsx` per role (`student`, `mentor`, `admin`).
2. Add "Awaiting Approval" notice page for mentors in `pending` status.
3. Add Session Prep Card modal in Mentor Dashboard.
4. Add Audit Logs and Health Panel in Admin Dashboard.
5. Remove mock data fallback overrides from `api.ts` to ensure transparent API error handling.

### Phase 6: Automated Testing & Verification
1. Backend test suite (`pytest`):
   - Mentor approval lifecycle (pending blocked from features, approve transitions, reject transitions).
   - Registration role-injection blocked (always student).
   - 401/403 RBAC verification across all new endpoints.
   - Admin audit logging verification.
2. Frontend verification: `npm run build` (type-checking + Vite bundle) and live browser smoke tests.

---

## 8. Status & Verification Summary

All implementation phases are complete and verified:
- **Phase 1 to Phase 6**: Completed and verified.
- **Phase 7 (Three-Portal Architecture & Single Admin Email)**:
  - Account Type selector dropdown (`Student`, `Staff`, `Admin`) integrated cleanly into `Login.tsx`.
  - Backend role enforcement prevents unauthorized role assumption.
  - Single configured Admin email (`SKILLNOVA_ADMIN_EMAIL=skillnova.admin@gmail.com`) strictly enforced for Google OAuth and password login; unauthorized Gmails rejected with HTTP 403.
  - Dedicated Staff Dashboard (`/staff-dashboard`) with Staff profile, assigned students, skill-gap summaries, roadmap tracking, mentoring activities, and feedback reports.
  - 58/58 backend automated tests passing in `pytest`.
  - Frontend TypeScript type-checking and Vite production build passing with 0 errors.

