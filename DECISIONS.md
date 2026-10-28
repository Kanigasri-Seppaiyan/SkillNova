# DECISIONS.md — Smart AI Career Companion

All architectural decisions, assumptions, and deviations from the spec are logged here chronologically.

---

## Phase 1 — Scaffold

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **OpenAI GPT-4o** for all LLM calls | Best reasoning for career domain; configured via `OPENAI_API_KEY` env var server-side only. Stub mode auto-activates when key is absent — all other phases unaffected. |
| 2 | **Web Speech API** (browser-native) for Voice STT/TTS | Zero-cost, no API key needed for demo. Works in Chrome/Edge/Safari. Graceful permission-denied handling included. Firefox not supported — shown as browser notice. |
| 3 | **PyMuPDF (fitz)** for PDF text extraction | Pure Python, fast, no external service needed. DOCX handled via `python-docx`. |
| 4 | **Alembic** for database migrations | Standard FastAPI/SQLAlchemy migration tool. All migrations in `backend/alembic/versions/`. |
| 5 | **Redis NOT included** | Caching deferred to a post-demo phase. Recalculation cascade is synchronous and fast enough at demo scale. |
| 6 | **i18next** (frontend) + GPT `language` param (backend AI) | Covers both UI strings and AI-generated answers in selected language. Technical terms intentionally left untranslated per spec. |
| 7 | **JWT in Authorization header** | Bearer token sent via Axios interceptor. httpOnly cookie also accepted if client prefers — both supported by backend. |
| 8 | **Placement readiness weights in `app_config` DB table** | Admin dashboard can edit weights without code changes. Default weights match spec (Technical 35%, DSA 15%, etc.). |
| 9 | **JSON breakdown column on `skill_gaps` and `placement_readiness`** | Enables "explain why" UI without recomputing. Stored on every write, never recomputed client-side. |
| 10 | **Seed script is idempotent** | Safe to run multiple times (uses INSERT ... ON CONFLICT DO NOTHING). Demo accounts: `student@demo.com`, `mentor@demo.com`, `admin@demo.com`, password `Demo1234!`. |
| 11 | **Gap priority thresholds in `app_config`** | HIGH ≥ 30, MEDIUM 15–29, LOW < 15. Editable via admin dashboard. |
| 12 | **Mentor match weights in `app_config`** | Skill 30%, Career 25%, Domain 15%, Availability 10%, Experience 10%, Preference 10%. Editable. |
| 13 | **`blended_level` formula** | `blended = (self_rating * 0.3 + assessed_level * 0.5 + evidence_bonus * 0.2)` where `evidence_bonus = min(100, evidence_count * 10)`. Self-rating alone never final once assessment data exists. |
| 14 | **Project root `.env.example`** | Separate sections for backend and frontend variables. Frontend vars must start with `VITE_` prefix. No secrets ever committed. |
| 15 | **Career Twin** | Implemented as a comparison against an AI-generated "ideal peer" profile based on same career goal + similar experience level. Updates on every profile change. |

---

## Phase 2 — Database

| # | Decision | Rationale |
|---|----------|-----------|
| 16 | **27 core tables + `app_config`** | `app_config` stores all configurable thresholds and weights as key→JSON-value pairs. |
| 17 | **`assessment_questions.options` is JSON array** | Stores `[{id, text}]` for MCQ. `correct_answer` stores the option id string. |
| 18 | **`skill_gaps.breakdown` JSON structure** | `{ self_rating, assessed_level, blended_level, required_level, gap, priority, factors: [...] }` |
| 19 | **`placement_readiness.breakdown` JSON structure** | `{ weights: {...}, scores: {...}, weighted_scores: {...}, overall, limiting_factors: [...] }` |
| 20 | **`mentor_matches.breakdown` JSON structure** | `{ skill_match, career_match, domain_match, availability, experience, preference, total }` |

---

## Phase 3 — Authentication & Security

| # | Decision | Rationale |
|---|----------|-----------|
| 21 | **Institutional domain restricted to `@bitsathy.ac.in`** | All registration, login, and password resets are strictly restricted to official `@bitsathy.ac.in` emails. Validated via exact last-`@` domain extraction (`ALLOWED_DOMAIN = "bitsathy.ac.in"`) across frontend, API middleware/route layer, and database ORM layer (`@validates("email")`). |

---

## Phase 4 — Career Engine & Test Matrix Verification

| # | Decision | Rationale |
|---|----------|-----------|
| 22 | **Comprehensive automated test matrix in `backend/tests/`** | Added automated test suite [test_career_and_placement.py](file:///c:/Users/Kanigasri/SkillNova/backend/tests/test_career_and_placement.py) validating Career GPS milestones, Career Twin peer comparison, Career Simulator projections, and Placement Readiness scoring. Verified isolation alongside [test_domain_auth.py](file:///c:/Users/Kanigasri/SkillNova/backend/tests/test_domain_auth.py) and [test_rbac.py](file:///c:/Users/Kanigasri/SkillNova/backend/tests/test_rbac.py). |
| 23 | **Assessment & Mentorship Verification** | Added [test_assessments_and_grading.py](file:///c:/Users/Kanigasri/SkillNova/backend/tests/test_assessments_and_grading.py) (MCQ delivery, scoring, attempt tracking) and [test_mentor_matching.py](file:///c:/Users/Kanigasri/SkillNova/backend/tests/test_mentor_matching.py) (mentor listing, match ranking, request deduplication). Fixed attribute mapping in [routers/mentors.py](file:///c:/Users/Kanigasri/SkillNova/backend/routers/mentors.py) (`created_at` timestamp). |
| 24 | **Google OAuth Transport Fallback** | Added `_get_google_transport()` in [routers/auth.py](file:///c:/Users/Kanigasri/SkillNova/backend/routers/auth.py) using an HTTPX-backed adapter adhering to `google.auth.transport.Request` and `Response` interfaces. Eliminates reliance on `requests` in minimal environments while maintaining Google token verification integrity. |

---

_Last updated: 2026-10-13_

---

## Phase 6 — Automated Testing & Verification

| # | Decision | Rationale |
|---|----------|-----------| 
| 31 | **Test DB stale schema** | Persistent `.db` test files (`test_rbac.db`, `test_mentor_matching.db`, etc.) predated `MentorProfile.status`, `max_students`, `rejection_reason` column additions. Fixed by deleting stale files so `Base.metadata.create_all` rebuilds the correct schema on next run. |
| 32 | **`test_domain_auth` mentor-apply fix** | `test_api_google_auth_existing_mentor_preserves_role` was registering a mentor via `POST /api/auth/register` with `role: "mentor"` — which is now correctly rejected by the hardened registration endpoint. Updated to use `POST /api/auth/mentor-apply` to create the mentor account, preserving the test's intent. |
| 33 | **`Notification.message` → `body` fix** | `routers/admin.py` `approve_mentor` and `reject_mentor` were using `Notification(message=...)` — the model column is `body`. Fixed both constructor calls. Also fixed `metadata=` → `meta_data=` in `routers/mentors.py` (SQLAlchemy uses `meta_data` as Python attribute to avoid collision with `DeclarativeBase.metadata`). |
| 34 | **Test mentor fixture status** | `test_list_and_recommend_mentors` fixture created `MentorProfile` without explicit `status`, defaulting to `pending`. The `/mentors/` endpoint correctly filters to `status == "approved"` only, so the test returned an empty list. Added `status="approved"` to the fixture. |
| 35 | **Final test result: 35/35 PASSED** | All backend tests green. Frontend TypeScript build also passes cleanly. |


---

## Phase 5 — Frontend Refactoring

| # | Decision | Rationale |
|---|----------|-----------|
| 25 | **Role-specific Sidebar navigation** | Sidebar now shows distinct nav items per role: students see the full 11-item student portal nav, mentors see mentor-only nav (Mentor Hub, Notifications), and admins see admin-only nav. Each role has a distinct accent color (indigo/violet/rose) and footer widget. |
| 26 | **`PendingMentorApproval.tsx` screen** | New standalone page shown to mentors in `pending` status. No layout wrapper — full-screen branded design with step-by-step status tracker (Application Submitted → Admin Review → Access Grant), 1-3 day SLA notice, and sign-out button. |
| 27 | **ProtectedRoute pending mentor guard** | `ProtectedRoute` now checks `user.mentor_status === 'pending'` before rendering any protected content. Pending mentors see `PendingMentorApproval` regardless of the target route. |
| 28 | **AdminDashboard 4-tab redesign** | Overview, Mentor Applications, Health Panel, Audit Logs tabs. Each tab lazy-loads its own data. Mentor Applications supports single-click Approve/Reject with full profile preview. Health Panel shows KPIs. Audit Logs has pagination + CSV export. |
| 29 | **`adminAPI` comprehensive replacement** | Removed all mock fallbacks from admin API calls (mock data masked real errors). New methods: `getDashboard`, `getUsers` (with filters), `getPendingMentors`, `approveMentor`, `rejectMentor`, `suspendMentor`, `assignMentor`, `updateUserStatus`, `updateUserRole`, `getHealthPanel`, `getAuditLogs`, `exportCSV` (auto-download). |
| 30 | **`mentor_status` field in User type** | Added `mentor_status?: 'pending' | 'approved' | 'rejected' | 'suspended' | null` to the `User` TypeScript interface so the routing guard is type-safe. |

---

## Phase 7 — Three-Portal Architecture (Student, Staff, Admin) & Configured Admin Email

| # | Decision | Rationale |
|---|----------|-----------|
| 36 | **Account Type Selector on Login** | Dropdown options: `Student`, `Staff`, `Admin`. Seamlessly switches demo fill credentials without disrupting existing login layout. Dispatches `account_type` to backend for explicit verification. |
| 37 | **Strict Backend Verification of Selected Account Type** | Backend matches chosen `account_type` against database role and authorization: student accounts cannot select Staff or Admin; staff accounts cannot select Student or Admin; Admin requires authorized email match. |
| 38 | **Configured Admin Email (`SKILLNOVA_ADMIN_EMAIL`)** | Single authorized Admin email configured via backend environment variable `SKILLNOVA_ADMIN_EMAIL` (default: `skillnova.admin@gmail.com`). Only this exact verified email can authenticate as Admin. All other Gmail accounts and non-admin logins are strictly rejected. |
| 39 | **Dedicated Staff Dashboard (`/staff-dashboard`)** | Full-featured staff dashboard with Staff profile, Assigned students roster, Student skill-gap summaries, Learning roadmap progress tracking, Mentoring & guidance activities, and Feedback & student progress reports. |
| 40 | **Role-Based Redirects** | Students redirect to `/onboarding` if incomplete, else `/dashboard`. Staff redirect to `/staff-dashboard`. Admin redirects to `/admin`. Unauthorized requests remain on login page with clear error alerts. |
| 41 | **Direct Route Guarding in `ProtectedRoute`** | Frontend checks token, role, and permissions; unauthenticated or unauthorized users attempting direct route access are redirected to `/login` or their authorized dashboard. |
| 42 | **Comprehensive Test Suite in `test_three_portals.py`** | Automated testing covering all 7 criteria: authorized student, authorized staff (`@bitsathy.ac.in`), configured admin email (`skillnova.admin@gmail.com`), unauthorized Gmail rejection, student denied staff access, unauthorized role selection rejection, and unauthenticated access blocking. All 58 backend tests passing. |

