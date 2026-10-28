import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { staffAPI } from '../services/api';
import { Card, Badge, LoadingState, ErrorState, EmptyState } from '../components/common/UIComponents';
import {
  Users,
  CheckCircle2,
  XCircle,
  Award,
  Target,
  TrendingUp,
  UserCheck,
  BookOpen,
  Calendar,
  MessageSquare,
  FileSpreadsheet,
  Send,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  GraduationCap
} from 'lucide-react';

export type StaffTab = 'roster' | 'gaps' | 'roadmap' | 'activities' | 'feedback';

export const StaffDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core data states
  const [profile, setProfile] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  // Selected student for detail / prep card
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentPrepCard, setStudentPrepCard] = useState<any>(null);
  const [prepLoading, setPrepLoading] = useState(false);

  // Feedback form state
  const [feedbackStudentId, setFeedbackStudentId] = useState<number | ''>('');
  const [feedbackRating, setFeedbackRating] = useState<number>(4.5);
  const [feedbackStrengths, setFeedbackStrengths] = useState<string>('');
  const [feedbackWeaknesses, setFeedbackWeaknesses] = useState<string>('');
  const [feedbackRecs, setFeedbackRecs] = useState<string>('');
  const [feedbackPriority, setFeedbackPriority] = useState<string>('high');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string>('');

  // Active sub-tab synced with URL query param ?tab=
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as StaffTab | null;
  const activeTab: StaffTab = (tabParam && ['roster', 'gaps', 'roadmap', 'activities', 'feedback'].includes(tabParam))
    ? tabParam
    : 'roster';

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, rosterData, requestsData] = await Promise.all([
        staffAPI.getProfile().catch(() => null),
        staffAPI.getRoster().catch(() => []),
        staffAPI.getRequests().catch(() => [])
      ]);

      setProfile(profileData);
      setRoster(rosterData || []);
      setRequests(requestsData || []);

      // If we have students, set default selected student
      if (rosterData && rosterData.length > 0 && !selectedStudent) {
        setSelectedStudent(rosterData[0]);
        loadPrepCard(rosterData[0].user_id);
      }

      // Notify sidebar so badge counts update
      window.dispatchEvent(new Event('staff-counts-updated'));

      // Load sessions and feedback asynchronously
      staffAPI.getSessions().then((s) => setSessions(s || [])).catch(() => {});
      staffAPI.getFeedbackHistory().then((f) => setFeedbacks(f || [])).catch(() => {});
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch staff dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const loadPrepCard = async (studentId: number) => {
    setPrepLoading(true);
    try {
      const card = await staffAPI.getStudentPrepCard(studentId);
      setStudentPrepCard(card);
    } catch (err) {
      console.error(err);
      setStudentPrepCard(null);
    } finally {
      setPrepLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRespond = async (requestId: number, action: 'accept' | 'reject') => {
    try {
      await staffAPI.respondRequest(requestId, action);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackStudentId) return;
    setFeedbackSending(true);
    setFeedbackSuccess('');
    try {
      await staffAPI.sendFeedback({
        student_id: Number(feedbackStudentId),
        rating: Number(feedbackRating),
        strengths: feedbackStrengths,
        weaknesses: feedbackWeaknesses,
        actionable_recommendations: feedbackRecs,
        priority_level: feedbackPriority
      });
      setFeedbackSuccess('Feedback successfully sent to student!');
      setFeedbackStrengths('');
      setFeedbackWeaknesses('');
      setFeedbackRecs('');
      const updatedFeedbacks = await staffAPI.getFeedbackHistory().catch(() => []);
      setFeedbacks(updatedFeedbacks);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Failed to submit student feedback.');
    } finally {
      setFeedbackSending(false);
    }
  };

  if (loading) return <LoadingState message="Loading Staff & Guidance Control Center..." />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  const staffName = profile?.full_name || 'Faculty Mentor';
  const staffEmail = profile?.email || 'mentor@bitsathy.ac.in';
  const staffDomain = profile?.profile?.domain || 'Computer Science & Engineering';
  const staffExp = profile?.profile?.years_experience || 8;
  const staffHours = profile?.profile?.availability_hours_per_week || 10;
  const staffStatus = profile?.status || 'approved';

  return (
    <div className="space-y-8">
      {/* ── 1. Staff Profile Header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-[#142B4A] border border-[#234773] rounded-3xl p-6 sm:p-8 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#315B8A] flex items-center justify-center text-white font-extrabold text-2xl shadow-sm shrink-0">
              {staffName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1E3A5F] border border-[#315B8A] text-[#DCE3EC] flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-[#A0B3CC]" />
                  Staff & Faculty Advisor
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 capitalize">
                  {staffStatus}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{staffName}</h1>
              <p className="text-xs text-[#A0B3CC] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{staffEmail}</span>
                <span>•</span>
                <span>{staffDomain}</span>
                <span>•</span>
                <span>{staffExp} Years Academic & Industry Exp</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-4 bg-[#0D1D33]/90 border border-[#234773] p-3 rounded-2xl">
            <div className="text-center px-3 border-r border-[#234773]">
              <span className="text-xs text-[#A0B3CC] block font-medium">Assigned</span>
              <span className="text-xl font-black text-white">{roster.length}</span>
            </div>
            <div className="text-center px-3 border-r border-[#234773]">
              <span className="text-xs text-[#A0B3CC] block font-medium">Pending Requests</span>
              <span className="text-xl font-black text-amber-400">{requests.length}</span>
            </div>
            <div className="text-center px-3">
              <span className="text-xs text-[#A0B3CC] block font-medium">Weekly Capacity</span>
              <span className="text-xl font-black text-sky-400">{staffHours}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Assigned Students Roster Tab ─────────────────────────────────── */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#142B4A] flex items-center gap-2">
                <span>Active Student Roster</span>
                <Badge variant="info">{roster.length} Assigned</Badge>
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">Assigned undergraduates under faculty mentorship and guidance.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {roster.map((st) => (
              <div
                key={st.user_id}
                onClick={() => {
                  setSelectedStudent(st);
                  loadPrepCard(st.user_id);
                }}
              >
                <Card
                  className={`cursor-pointer transition-all border ${
                    selectedStudent?.user_id === st.user_id
                      ? 'border-[#315B8A] ring-2 ring-[#315B8A]/20 shadow-md'
                      : 'border-[#DCE3EC] hover:border-[#315B8A]/60'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-base font-bold text-[#142B4A]">{st.full_name}</h4>
                      <span className="text-xs text-[#315B8A] font-semibold block">{st.target_role}</span>
                      <span className="text-[11px] text-[#64748B]">{st.department} • {st.academic_year}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#64748B] uppercase tracking-wider block font-bold">Readiness</span>
                      <span className={`text-lg font-black ${
                        st.readiness_score >= 80 ? 'text-emerald-700' : st.readiness_score >= 60 ? 'text-[#1E3A5F]' : 'text-amber-700'
                      }`}>
                        {st.readiness_score}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-[#142B4A] pt-3 border-t border-[#DCE3EC]">
                    <div className="flex justify-between items-center">
                      <span className="text-[#64748B] font-medium">Primary Skill Gap:</span>
                      <span className="font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                        {st.top_gap || 'None'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#64748B] font-medium">Milestones Done:</span>
                      <span className="font-bold text-emerald-700">{st.completed_tasks} completed</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#DCE3EC] flex items-center justify-between text-xs text-[#1E3A5F] hover:text-[#142B4A] font-bold">
                    <span>View Guidance Prep Card</span>
                    <ChevronRight className="w-4 h-4 text-[#315B8A]" />
                  </div>
                </Card>
              </div>
            ))}

            {roster.length === 0 && (
              <div className="col-span-full">
                <EmptyState
                  title="No Assigned Students"
                  description="Your student roster is empty. Accept pending match requests from the Guidance tab to add students."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 3. Student Skill-Gap Summaries Tab ───────────────────────────────── */}
      {activeTab === 'gaps' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#142B4A]">Student Skill-Gap Breakdown & Diagnosis</h2>
              <p className="text-xs text-[#64748B] mt-0.5">Identify high-priority deficits to plan targeted faculty interventions.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Selector column */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Select Student</h3>
              {roster.map((st) => (
                <button
                  key={st.user_id}
                  onClick={() => {
                    setSelectedStudent(st);
                    loadPrepCard(st.user_id);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                    selectedStudent?.user_id === st.user_id
                      ? 'bg-[#EAF0F7] border-[#315B8A] text-[#142B4A] shadow-sm'
                      : 'bg-white border-[#DCE3EC] text-[#142B4A] hover:border-[#315B8A]/60'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-[#142B4A]">{st.full_name}</span>
                    <span className="text-xs font-bold text-[#1E3A5F]">{st.readiness_score}%</span>
                  </div>
                  <span className="text-xs text-[#64748B] block mt-0.5">{st.target_role}</span>
                  <span className="text-[11px] text-rose-700 font-semibold mt-1 block">Gap: {st.top_gap || 'None'}</span>
                </button>
              ))}
            </div>

            {/* Detailed Gap Inspector */}
            <div className="lg:col-span-2">
              {prepLoading ? (
                <LoadingState message="Calculating student skill telemetry..." />
              ) : selectedStudent && studentPrepCard ? (
                <Card className="space-y-6">
                  <div className="flex justify-between items-start border-b border-[#DCE3EC] pb-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-[#142B4A]">{selectedStudent.full_name} — Skill Gap Analysis</h3>
                      <p className="text-xs text-[#64748B]">Target Role: {selectedStudent.target_role} • Department: {selectedStudent.department}</p>
                    </div>
                    <Badge variant="warning">High Priority Review</Badge>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Top Detected Skill Gaps</h4>
                    <div className="space-y-2.5">
                      {studentPrepCard.top_gaps?.map((gap: any, i: number) => (
                        <div key={i} className="p-3.5 rounded-xl bg-[#F5F7FA] border border-[#DCE3EC] flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold text-[#142B4A] block">{gap.skill_name}</span>
                            <span className="text-[11px] text-[#64748B]">
                              Current Blended: {gap.blended_level || 'Level 2.0'} / Required: {gap.required_level || 'Level 4.0'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md">
                              {gap.gap ? `${Math.round(gap.gap)}% Gap` : 'High Priority'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {(!studentPrepCard.top_gaps || studentPrepCard.top_gaps.length === 0) && (
                        <p className="text-xs text-[#64748B] italic">No severe gaps detected for this student profile.</p>
                      )}
                    </div>
                  </div>

                  {studentPrepCard.latest_assessment && (
                    <div className="p-4 rounded-2xl bg-[#EAF0F7] border border-[#DCE3EC] space-y-1">
                      <span className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider">Latest Assessment Score</span>
                      <p className="text-sm text-[#142B4A]">
                        Status: <strong className="text-[#142B4A] font-bold">{studentPrepCard.latest_assessment.status}</strong>
                        {studentPrepCard.latest_assessment.score && ` · Score: ${studentPrepCard.latest_assessment.score}%`}
                      </p>
                    </div>
                  )}
                </Card>
              ) : (
                <EmptyState title="Select a Student" description="Click any student in the list to inspect their verified skill gaps." />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Learning Roadmap Progress Tab ────────────────────────────────── */}
      {activeTab === 'roadmap' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#142B4A]">Student Learning Roadmap & Milestone Progress</h2>
              <p className="text-xs text-[#64748B] mt-0.5">Track weekly module completion and project proofs across assigned students.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roster.map((st) => {
              const progressPct = Math.min(100, Math.round((st.completed_tasks / 24) * 100));
              return (
                <Card key={st.user_id} className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-bold text-[#142B4A]">{st.full_name}</h4>
                      <span className="text-xs text-[#64748B]">{st.target_role}</span>
                    </div>
                    <Badge variant={progressPct >= 70 ? 'success' : 'info'}>{progressPct}% Complete</Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-[#64748B] font-semibold">
                      <span>Curriculum Completion</span>
                      <span className="text-[#142B4A]">{st.completed_tasks} / 24 Milestones</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[#EAF0F7] border border-[#DCE3EC] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#142B4A] to-[#315B8A] rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F5F7FA] border border-[#DCE3EC] text-xs text-[#142B4A] space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Current Phase:</span>
                      <span className="font-semibold text-[#142B4A]">Phase 2: Core Engineering</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Weekly Pace:</span>
                      <span className="font-bold text-emerald-700">On Track (3 hrs/wk)</span>
                    </div>
                  </div>
                </Card>
              );
            })}

            {roster.length === 0 && (
              <div className="col-span-full">
                <EmptyState title="No Active Roadmaps" description="Roadmap tracking will appear once students are assigned to your roster." />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 5. Mentoring or Guidance Activities Tab ─────────────────────────── */}
      {activeTab === 'activities' && (
        <div className="space-y-8">
          {/* Pending Match Inquiries */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#142B4A] flex items-center gap-2">
              <span>Pending Mentorship Match Inquiries</span>
              <Badge variant="warning">{requests.length}</Badge>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.map((req) => (
                <Card key={req.id} className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-[#142B4A]">{req.student_name}</h4>
                      <span className="text-xs text-[#64748B]">{req.target_role}</span>
                    </div>
                    <Badge variant="info">Inquiry</Badge>
                  </div>

                  <p className="text-xs text-[#142B4A] bg-[#F5F7FA] p-3 rounded-xl border border-[#DCE3EC] italic">
                    "{req.message}"
                  </p>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#DCE3EC]">
                    <button
                      onClick={() => handleRespond(req.id, 'reject')}
                      className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-100 transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                    <button
                      onClick={() => handleRespond(req.id, 'accept')}
                      className="px-3 py-1.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Accept Student</span>
                    </button>
                  </div>
                </Card>
              ))}

              {requests.length === 0 && (
                <div className="col-span-full">
                  <EmptyState title="No Pending Inquiries" description="You have responded to all student guidance requests." />
                </div>
              )}
            </div>
          </div>

          {/* Scheduled Guidance Sessions */}
          <div className="space-y-4 pt-4 border-t border-[#DCE3EC]">
            <h2 className="text-lg font-bold text-[#142B4A] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#315B8A]" />
              <span>Scheduled 1-on-1 Guidance Sessions</span>
              <Badge variant="secondary">{sessions.length}</Badge>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((s) => (
                <Card key={s.id} className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-bold text-[#142B4A]">{s.student_name}</h4>
                    <Badge variant="info">{s.status}</Badge>
                  </div>
                  <p className="text-xs text-[#64748B]">{s.agenda || 'Career Mentoring & Project Review'}</p>
                  <div className="text-xs text-[#64748B] flex items-center gap-1.5 pt-2 border-t border-[#DCE3EC]">
                    <Clock className="w-3.5 h-3.5 text-[#315B8A]" />
                    <span>{s.scheduled_at ? new Date(s.scheduled_at).toLocaleString() : 'Upcoming'} ({s.duration_minutes}m)</span>
                  </div>
                </Card>
              ))}

              {sessions.length === 0 && (
                <div className="col-span-full">
                  <EmptyState title="No Scheduled Sessions" description="1-on-1 guidance appointments will appear here once booked." />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Feedback & Student Progress Reports Tab ──────────────────────── */}
      {activeTab === 'feedback' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Feedback Submission Form */}
            <Card className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-[#142B4A] flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#315B8A]" />
                  <span>Deliver Advisory Feedback to Student</span>
                </h3>
                <p className="text-xs text-[#64748B] mt-1">Submit actionable evaluations directly to a student's companion feed.</p>
              </div>

              {feedbackSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{feedbackSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSendFeedback} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#142B4A] mb-1">Target Student</label>
                  <select
                    value={feedbackStudentId}
                    onChange={(e) => setFeedbackStudentId(e.target.value ? Number(e.target.value) : '')}
                    required
                    className="w-full bg-white border border-[#DCE3EC] rounded-xl px-3 py-2 text-sm text-[#142B4A] focus:border-[#142B4A] outline-none shadow-2xs"
                  >
                    <option value="">Select an assigned student...</option>
                    {roster.map((st) => (
                      <option key={st.user_id} value={st.user_id}>
                        {st.full_name} ({st.target_role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#142B4A] mb-1">Rating (1 - 5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      step="0.5"
                      value={feedbackRating}
                      onChange={(e) => setFeedbackRating(Number(e.target.value))}
                      className="w-full bg-white border border-[#DCE3EC] rounded-xl px-3 py-2 text-sm text-[#142B4A] focus:border-[#142B4A] outline-none shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#142B4A] mb-1">Priority Level</label>
                    <select
                      value={feedbackPriority}
                      onChange={(e) => setFeedbackPriority(e.target.value)}
                      className="w-full bg-white border border-[#DCE3EC] rounded-xl px-3 py-2 text-sm text-[#142B4A] focus:border-[#142B4A] outline-none shadow-2xs"
                    >
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#142B4A] mb-1">Observed Strengths</label>
                  <input
                    type="text"
                    value={feedbackStrengths}
                    onChange={(e) => setFeedbackStrengths(e.target.value)}
                    placeholder="e.g. Strong foundational syntax, proactive roadmap completion"
                    className="w-full bg-white border border-[#DCE3EC] rounded-xl px-3 py-2 text-sm text-[#142B4A] focus:border-[#142B4A] outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#142B4A] mb-1">Improvement Areas</label>
                  <input
                    type="text"
                    value={feedbackWeaknesses}
                    onChange={(e) => setFeedbackWeaknesses(e.target.value)}
                    placeholder="e.g. Lacks practice in concurrency and database sharding"
                    className="w-full bg-white border border-[#DCE3EC] rounded-xl px-3 py-2 text-sm text-[#142B4A] focus:border-[#142B4A] outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#142B4A] mb-1">Actionable Recommendations</label>
                  <textarea
                    rows={3}
                    value={feedbackRecs}
                    onChange={(e) => setFeedbackRecs(e.target.value)}
                    placeholder="Provide specific exercises or milestones the student must complete..."
                    className="w-full bg-white border border-[#DCE3EC] rounded-xl px-3 py-2 text-sm text-[#142B4A] focus:border-[#142B4A] outline-none shadow-2xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={feedbackSending || !feedbackStudentId}
                  className="w-full py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                >
                  {feedbackSending ? 'Submitting Feedback...' : 'Dispatch Advisory Feedback'}
                </button>
              </form>
            </Card>

            {/* Past Feedback Log & Student Progress Reports */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#142B4A] flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Student Advisory History & Reports</span>
              </h3>

              <div className="space-y-3">
                {feedbacks.map((fb, idx) => (
                  <Card key={idx} className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-[#142B4A]">Student #{fb.student_user_id || fb.student_id}</h4>
                        <span className="text-[11px] text-[#64748B]">Rating: {fb.rating}/5 · Priority: {fb.priority_level}</span>
                      </div>
                      <Badge variant="success">Dispatched</Badge>
                    </div>
                    {fb.actionable_recommendations && (
                      <p className="text-xs text-[#142B4A] bg-[#F5F7FA] p-2.5 rounded-xl border border-[#DCE3EC]">
                        "{fb.actionable_recommendations}"
                      </p>
                    )}
                  </Card>
                ))}

                {feedbacks.length === 0 && (
                  <EmptyState title="No Past Feedback" description="Feedback submitted to students will be chronologically archived here." />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
