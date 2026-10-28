import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mentorAPI } from '../services/api';
import { Card, Badge, LoadingState, ErrorState, EmptyState } from '../components/common/UIComponents';
import {
  Users,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  MessageSquare,
  Award,
  Target,
  LogOut,
  Plus,
  BookOpen,
  ExternalLink,
  ShieldCheck,
  Edit3,
  Save,
  Trash2,
  Star,
  ChevronRight,
  TrendingUp,
  FileCheck2,
  Map,
  X,
  AlertCircle
} from 'lucide-react';

export const MentorDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Core Data
  const [profile, setProfile] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'requests' | 'sessions' | 'feedback' | 'profile'>('overview');

  // Request filter
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  // Student Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentDetail, setStudentDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Session Scheduling Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    student_id: '',
    scheduled_at: '',
    duration_minutes: 45,
    agenda: 'Skill Nova Mentoring Session',
    meeting_link: 'https://meet.google.com/new'
  });

  // Feedback Submission Modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    student_id: '',
    rating: 5,
    strengths: '',
    weaknesses: '',
    actionable_recommendations: '',
    priority_level: 'medium'
  });

  // Profile Edit State
  const [profileForm, setProfileForm] = useState({
    name: '',
    bio: '',
    domain: '',
    years_experience: 8,
    linkedin_url: '',
    availability_hours_per_week: 10,
    max_students: 5
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Availability Slot State
  const [slotForm, setSlotForm] = useState({
    day_of_week: 'Tuesday',
    start_time: '14:00',
    end_time: '16:00'
  });
  const [slotSaving, setSlotSaving] = useState(false);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profData, rosterData, reqData, sessData, feedData, slotsData] = await Promise.all([
        mentorAPI.getProfile().catch(() => null),
        mentorAPI.getStudents().catch(async () => mentorAPI.getRoster().catch(() => [])),
        mentorAPI.getRequests().catch(() => []),
        mentorAPI.getSessions().catch(() => []),
        mentorAPI.getFeedbackHistory().catch(() => []),
        mentorAPI.getAvailability().catch(() => [])
      ]);

      setProfile(profData);
      setStudents(rosterData || []);
      setRequests(reqData || []);
      setSessions(sessData || []);
      setFeedbacks(feedData || []);
      setAvailabilitySlots(slotsData || []);

      if (profData) {
        setProfileForm({
          name: profData.full_name || profData.name || '',
          bio: profData.profile?.bio || profData.bio || '',
          domain: profData.profile?.domain || profData.domain || 'Computer Science & Engineering',
          years_experience: profData.profile?.years_experience || profData.years_experience || 8,
          linkedin_url: profData.profile?.linkedin_url || profData.linkedin_url || '',
          availability_hours_per_week: profData.profile?.availability_hours_per_week || profData.availability_hours_per_week || 10,
          max_students: profData.profile?.max_students || profData.max_students || 5
        });
      }
    } catch (err: any) {
      console.error(err);
      setError('Unable to load Mentor Portal data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle open student details
  const handleOpenStudentDetail = async (student: any) => {
    setSelectedStudent(student);
    setDetailLoading(true);
    try {
      const studentId = student.student_id || student.id || student.user_id;
      const detail = await mentorAPI.getStudentDetail(studentId);
      setStudentDetail(detail);
    } catch (err) {
      console.error(err);
      setStudentDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // Handle Mentorship Request response (Accept / Reject)
  const handleRespondRequest = async (requestId: number, action: 'accept' | 'reject') => {
    try {
      await mentorAPI.respondRequest(requestId, action);
      showNotification(`Mentorship request successfully ${action === 'accept' ? 'accepted' : 'declined'}!`);
      // Optimistic update
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: action === 'accept' ? 'accepted' : 'rejected' } : r))
      );
      // Reload fresh student roster and requests in background
      mentorAPI.getStudents().then((res) => setStudents(res || [])).catch(() => {});
      mentorAPI.getRequests().then((res) => setRequests(res || [])).catch(() => {});
    } catch (err: any) {
      console.error(err);
      showNotification(err?.response?.data?.detail || 'Failed to update request response.');
    }
  };

  // Schedule Session Submit
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.student_id || !scheduleForm.scheduled_at) {
      alert('Please select a student and valid date & time.');
      return;
    }
    setScheduleLoading(true);
    try {
      await mentorAPI.createSession({
        student_id: Number(scheduleForm.student_id),
        scheduled_at: new Date(scheduleForm.scheduled_at).toISOString(),
        duration_minutes: Number(scheduleForm.duration_minutes),
        agenda: scheduleForm.agenda,
        meeting_link: scheduleForm.meeting_link
      });
      showNotification('Mentoring session scheduled successfully!');
      setShowScheduleModal(false);
      setScheduleForm({
        student_id: '',
        scheduled_at: '',
        duration_minutes: 45,
        agenda: 'SkillNova Mentoring Session',
        meeting_link: 'https://meet.google.com/new'
      });
      const updatedSessions = await mentorAPI.getSessions().catch(() => []);
      setSessions(updatedSessions);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.detail || 'Failed to schedule session.');
    } finally {
      setScheduleLoading(false);
    }
  };

  // Submit Feedback
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackForm.student_id) {
      alert('Please select a student.');
      return;
    }
    setFeedbackLoading(true);
    try {
      await mentorAPI.sendFeedback({
        student_id: Number(feedbackForm.student_id),
        rating: Number(feedbackForm.rating),
        strengths: feedbackForm.strengths,
        weaknesses: feedbackForm.weaknesses,
        actionable_recommendations: feedbackForm.actionable_recommendations,
        priority_level: feedbackForm.priority_level
      });
      showNotification('Student feedback and recommendations submitted!');
      setShowFeedbackModal(false);
      setFeedbackForm({
        student_id: '',
        rating: 5,
        strengths: '',
        weaknesses: '',
        actionable_recommendations: '',
        priority_level: 'medium'
      });
      const updatedFeedbacks = await mentorAPI.getFeedbackHistory().catch(() => []);
      setFeedbacks(updatedFeedbacks);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.detail || 'Failed to submit feedback.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Update Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await mentorAPI.updateProfile(profileForm);
      showNotification('Mentor profile updated successfully!');
      const updatedProfile = await mentorAPI.getProfile().catch(() => null);
      setProfile(updatedProfile);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.detail || 'Failed to save profile changes.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Add Availability Slot
  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlotSaving(true);
    try {
      await mentorAPI.addAvailability(slotForm);
      showNotification('Availability slot added!');
      const slots = await mentorAPI.getAvailability().catch(() => []);
      setAvailabilitySlots(slots);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.detail || 'Failed to add slot.');
    } finally {
      setSlotSaving(false);
    }
  };

  // Remove Availability Slot
  const handleRemoveSlot = async (slotId: number) => {
    try {
      await mentorAPI.removeAvailability(slotId);
      showNotification('Slot removed.');
      setAvailabilitySlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err) {
      console.error(err);
    }
  };

  // Update session status (Completed / Cancelled)
  const handleUpdateSessionStatus = async (sessionId: number, newStatus: string) => {
    try {
      await mentorAPI.updateSessionStatus(sessionId, newStatus);
      showNotification(`Session marked as ${newStatus}!`);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, status: newStatus } : s)));
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.detail || 'Failed to update session status.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) return <LoadingState message="Connecting to SkillNova Mentor Portal..." />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  // Computed metrics
  const totalStudents = students.length;
  const pendingRequestsCount = requests.filter((r) => r.status === 'pending').length;
  const acceptedRequestsCount = requests.filter((r) => r.status === 'accepted').length;
  const upcomingSessionsCount = sessions.filter((s) => s.status === 'scheduled').length;

  const mentorName = profile?.full_name || user?.full_name || 'Faculty Mentor';
  const mentorEmail = profile?.email || user?.email || 'faculty@bitsathy.ac.in';
  const mentorDomain = profile?.profile?.domain || profileForm.domain || 'Computer Science & Engineering';

  const filteredRequests = requests.filter((r) => {
    if (requestFilter === 'all') return true;
    return r.status === requestFilter;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* ── Toast notification ────────────────────────────────────────────── */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#142B4A] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-3 border border-[#315B8A]">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {/* ── 1. Top Header Banner ─────────────────────────────────────────── */}
      <div className="bg-white border border-[#DCE3EC] p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-[#142B4A] text-white font-black text-2xl flex items-center justify-center shadow-md">
            {mentorName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EAF0F7] text-[#142B4A] border border-[#DCE3EC] flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#315B8A]" />
                <span>Verified Mentor · @bitsathy.ac.in</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Approved
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#142B4A] tracking-tight">{mentorName}</h1>
            <p className="text-xs text-[#64748B] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium text-[#142B4A]">{mentorEmail}</span>
              <span>•</span>
              <span>{mentorDomain}</span>
              <span>•</span>
              <span>{profileForm.years_experience} Years Exp</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-4 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-2"
          >
            <Calendar className="w-4 h-4 text-sky-300" />
            <span>Schedule Session</span>
          </button>
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="px-4 py-2.5 bg-[#EAF0F7] hover:bg-[#DCE6F2] text-[#142B4A] border border-[#DCE3EC] rounded-xl text-xs font-bold transition-all flex items-center space-x-2"
          >
            <MessageSquare className="w-4 h-4 text-[#315B8A]" />
            <span>Give Feedback</span>
          </button>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 2. Metric Overview Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DCE3EC] p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Assigned Students</span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF0F7] flex items-center justify-center text-[#142B4A]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#142B4A]">{totalStudents}</div>
          <span className="text-[11px] text-[#64748B] mt-1 block">Active mentee roster</span>
        </div>

        <div className="bg-white border border-[#DCE3EC] p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Pending Requests</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-700">{pendingRequestsCount}</div>
          <span className="text-[11px] text-[#64748B] mt-1 block">Awaiting your response</span>
        </div>

        <div className="bg-white border border-[#DCE3EC] p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Accepted Requests</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700">{acceptedRequestsCount}</div>
          <span className="text-[11px] text-[#64748B] mt-1 block">Successful matches</span>
        </div>

        <div className="bg-white border border-[#DCE3EC] p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Upcoming Sessions</span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF0F7] flex items-center justify-center text-[#142B4A]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#142B4A]">{upcomingSessionsCount}</div>
          <span className="text-[11px] text-[#64748B] mt-1 block">Scheduled 1-on-1s</span>
        </div>
      </div>

      {/* ── 3. Navigation Tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center space-x-2 border-b border-[#DCE3EC] pb-2 overflow-x-auto">
        {[
          { key: 'overview', label: 'Dashboard Overview', icon: Target },
          { key: 'students', label: 'Student Management', icon: Users, count: totalStudents },
          { key: 'requests', label: 'Mentorship Requests', icon: Clock, count: pendingRequestsCount },
          { key: 'sessions', label: 'Session Management', icon: Calendar, count: upcomingSessionsCount },
          { key: 'feedback', label: 'Student Feedback', icon: MessageSquare, count: feedbacks.length },
          { key: 'profile', label: 'Profile & Availability', icon: Edit3 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#142B4A] text-white shadow-sm'
                  : 'bg-white hover:bg-[#EAF0F7] text-[#64748B] hover:text-[#142B4A] border border-[#DCE3EC]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-[#315B8A] text-white' : 'bg-[#EAF0F7] text-[#142B4A]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 4. TAB 1: OVERVIEW ───────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Mentorship Requests */}
          <div className="bg-white border border-[#DCE3EC] p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-[#142B4A]">Recent Match Inquiries</h3>
                <p className="text-xs text-[#64748B]">Incoming student guidance requests</p>
              </div>
              <button
                onClick={() => setActiveTab('requests')}
                className="text-xs font-bold text-[#315B8A] hover:underline flex items-center space-x-1"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {requests.slice(0, 3).map((req) => (
                <div key={req.id} className="p-4 bg-[#F8FAFC] border border-[#DCE3EC] rounded-2xl space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-[#142B4A]">{req.student_name}</h4>
                      <span className="text-[11px] text-[#64748B]">{req.target_role || 'Software Engineer'}</span>
                    </div>
                    <Badge variant={req.status === 'accepted' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'}>
                      {req.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#475569] italic bg-white p-2.5 rounded-xl border border-[#DCE3EC]">
                    "{req.message || 'I would like guidance on closing my technical skill gaps.'}"
                  </p>
                  {req.status === 'pending' && (
                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        onClick={() => handleRespondRequest(req.id, 'reject')}
                        className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-100"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleRespondRequest(req.id, 'accept')}
                        className="px-3 py-1 bg-[#142B4A] text-white text-xs font-bold rounded-lg hover:bg-[#1E3A5F]"
                      >
                        Accept
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {requests.length === 0 && (
                <EmptyState title="No Inquiries" description="No student requests at the moment." />
              )}
            </div>
          </div>

          {/* Upcoming Sessions Widget */}
          <div className="bg-white border border-[#DCE3EC] p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-[#142B4A]">Upcoming Mentoring Sessions</h3>
                <p className="text-xs text-[#64748B]">Scheduled 1-on-1 check-ins</p>
              </div>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="text-xs font-bold text-[#315B8A] hover:underline flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Session</span>
              </button>
            </div>

            <div className="space-y-3">
              {sessions.slice(0, 3).map((sess) => (
                <div key={sess.id} className="p-4 bg-[#F8FAFC] border border-[#DCE3EC] rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EAF0F7] text-[#142B4A] flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-[#315B8A]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#142B4A]">{sess.student_name}</h4>
                      <p className="text-xs text-[#64748B] flex items-center space-x-1 mt-0.5">
                        <Clock className="w-3 h-3 text-[#315B8A]" />
                        <span>{new Date(sess.scheduled_at).toLocaleDateString()} at {new Date(sess.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                      <p className="text-[11px] text-[#475569] mt-1">{sess.agenda}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2 shrink-0">
                    <Badge variant={sess.status === 'completed' ? 'success' : 'info'}>{sess.status}</Badge>
                    {sess.meeting_link && (
                      <a
                        href={sess.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-[#142B4A] text-white text-[11px] font-bold rounded-lg hover:bg-[#1E3A5F] flex items-center space-x-1"
                      >
                        <span>Join</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {sessions.length === 0 && (
                <EmptyState title="No Sessions Scheduled" description="Schedule sessions to mentor your assigned students." />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. TAB 2: STUDENT MANAGEMENT ────────────────────────────────────── */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#DCE3EC] p-4 rounded-2xl">
            <div>
              <h2 className="text-lg font-black text-[#142B4A]">Assigned Student Roster</h2>
              <p className="text-xs text-[#64748B]">Review live assessment results, identified skill gaps, and learning roadmaps.</p>
            </div>
            <div className="text-xs font-bold text-[#142B4A] px-3 py-1.5 bg-[#EAF0F7] rounded-xl border border-[#DCE3EC]">
              Total Students: {students.length}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((st) => (
              <Card key={st.user_id || st.student_id} className="flex flex-col justify-between border border-[#DCE3EC] hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  {/* Top user row */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-bold text-[#142B4A]">{st.full_name}</h3>
                      <p className="text-xs text-[#64748B]">{st.email}</p>
                      <span className="text-[11px] font-semibold text-[#315B8A] bg-[#EAF0F7] px-2 py-0.5 rounded-full inline-block mt-1">
                        {st.target_role || 'Software Engineer'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase block">Readiness</span>
                      <span className="text-xl font-black text-[#142B4A]">{st.readiness_score || 72}%</span>
                      <span className="text-[10px] font-bold block text-[#15803D]">
                        {st.readiness_tier || 'Interview Ready'}
                      </span>
                    </div>
                  </div>

                  {/* Skills tags */}
                  {st.skills && st.skills.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase">Top Skills:</span>
                      <div className="flex flex-wrap gap-1">
                        {st.skills.slice(0, 3).map((sk: any, idx: number) => (
                          <span key={idx} className="text-[11px] bg-slate-100 text-[#142B4A] px-2 py-0.5 rounded-md font-medium border border-slate-200">
                            {sk.name || sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top gap */}
                  <div className="p-3 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Top Priority Gap:</span>
                      <span className="font-bold text-red-600">{st.top_gap || 'System Architecture'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Completed Tasks:</span>
                      <span className="font-bold text-emerald-700">{st.completed_tasks || 12}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-[#DCE3EC] flex items-center justify-between gap-2 mt-4">
                  <button
                    onClick={() => handleOpenStudentDetail(st)}
                    className="flex-1 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1"
                  >
                    <span>View Profile & Gaps</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setScheduleForm((prev) => ({ ...prev, student_id: String(st.user_id || st.student_id) }));
                      setShowScheduleModal(true);
                    }}
                    title="Schedule Session"
                    className="p-2 bg-[#EAF0F7] hover:bg-[#DCE6F2] text-[#142B4A] rounded-xl border border-[#DCE3EC]"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setFeedbackForm((prev) => ({ ...prev, student_id: String(st.user_id || st.student_id) }));
                      setShowFeedbackModal(true);
                    }}
                    title="Give Feedback"
                    className="p-2 bg-[#EAF0F7] hover:bg-[#DCE6F2] text-[#142B4A] rounded-xl border border-[#DCE3EC]"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}

            {students.length === 0 && (
              <div className="col-span-full">
                <EmptyState
                  title="No Assigned Students"
                  description="Accept incoming mentorship inquiries to assign students to your active roster."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 6. TAB 3: MENTORSHIP REQUESTS ───────────────────────────────────── */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#DCE3EC] p-4 rounded-2xl">
            <div>
              <h2 className="text-lg font-black text-[#142B4A]">Mentorship Match Requests</h2>
              <p className="text-xs text-[#64748B]">Review incoming requests from students desiring your expertise.</p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center space-x-1 bg-[#F8FAFC] border border-[#DCE3EC] p-1 rounded-xl">
              {(['all', 'pending', 'accepted', 'rejected'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setRequestFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    requestFilter === f ? 'bg-[#142B4A] text-white shadow-sm' : 'text-[#64748B] hover:text-[#142B4A]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRequests.map((req) => (
              <Card key={req.id} className="space-y-4 border border-[#DCE3EC]">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-[#142B4A]">{req.student_name}</h3>
                    <p className="text-xs text-[#64748B]">{req.target_role || 'Software Engineer'}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {req.match_score && (
                      <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                        {req.match_score}% Match
                      </span>
                    )}
                    <Badge variant={req.status === 'accepted' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'}>
                      {req.status}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#DCE3EC]">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase block mb-1">Student Note:</span>
                  <p className="text-xs text-[#142B4A] italic">
                    "{req.message || 'I would appreciate mentorship to accelerate my learning roadmap and gap closure.'}"
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#DCE3EC] text-xs">
                  <span className="text-[#64748B]">Status: <strong className="capitalize text-[#142B4A]">{req.status}</strong></span>
                  {req.status === 'pending' ? (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRespondRequest(req.id, 'reject')}
                        className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-xl transition-all"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleRespondRequest(req.id, 'accept')}
                        className="px-3.5 py-1.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                      >
                        Accept Student
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-[#64748B]">Action completed</span>
                  )}
                </div>
              </Card>
            ))}

            {filteredRequests.length === 0 && (
              <div className="col-span-full">
                <EmptyState title="No Requests Found" description={`No ${requestFilter} mentorship requests available.`} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 7. TAB 4: SESSION MANAGEMENT ────────────────────────────────────── */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#DCE3EC] p-4 rounded-2xl">
            <div>
              <h2 className="text-lg font-black text-[#142B4A]">Mentoring Session Management</h2>
              <p className="text-xs text-[#64748B]">Schedule, host, and mark completion of student guidance sessions.</p>
            </div>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-4 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center space-x-2"
            >
              <Plus className="w-4 h-4 text-sky-300" />
              <span>Schedule New Session</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((sess) => (
              <Card key={sess.id} className="space-y-3 border border-[#DCE3EC]">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-[#142B4A]">{sess.student_name}</h3>
                    <p className="text-xs text-[#64748B] flex items-center space-x-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-[#315B8A]" />
                      <span>{new Date(sess.scheduled_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <Clock className="w-3.5 h-3.5 text-[#315B8A]" />
                      <span>{new Date(sess.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({sess.duration_minutes || 45} mins)</span>
                    </p>
                  </div>
                  <Badge variant={sess.status === 'completed' ? 'success' : sess.status === 'cancelled' ? 'danger' : 'info'}>
                    {sess.status}
                  </Badge>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#DCE3EC] text-xs">
                  <span className="font-bold text-[#64748B] block mb-0.5">Agenda / Topic:</span>
                  <p className="text-[#142B4A]">{sess.agenda || 'Regular technical guidance & progress review.'}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#DCE3EC] text-xs">
                  {sess.meeting_link ? (
                    <a
                      href={sess.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#315B8A] font-bold hover:underline flex items-center space-x-1"
                    >
                      <span>Join Meeting</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[#64748B]">No link attached</span>
                  )}

                  {sess.status === 'scheduled' && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleUpdateSessionStatus(sess.id, 'cancelled')}
                        className="px-2.5 py-1 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg font-bold text-[11px] border border-red-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateSessionStatus(sess.id, 'completed')}
                        className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg font-bold text-[11px] border border-emerald-200"
                      >
                        Mark Completed
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            ))}

            {sessions.length === 0 && (
              <div className="col-span-full">
                <EmptyState
                  title="No Scheduled Sessions"
                  description="Use the button above to schedule your first mentoring session."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 8. TAB 5: STUDENT FEEDBACK ──────────────────────────────────────── */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#DCE3EC] p-4 rounded-2xl">
            <div>
              <h2 className="text-lg font-black text-[#142B4A]">Student Recommendations & Feedback</h2>
              <p className="text-xs text-[#64748B]">Provide actionable advice, track strengths, and review previously given guidance.</p>
            </div>
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="px-4 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center space-x-2"
            >
              <Plus className="w-4 h-4 text-sky-300" />
              <span>Submit New Feedback</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feedbacks.map((fb) => (
              <Card key={fb.id} className="space-y-3 border border-[#DCE3EC]">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-[#142B4A]">{fb.student_name}</h3>
                    <span className="text-[11px] text-[#64748B]">
                      {fb.created_at ? new Date(fb.created_at).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-amber-800">{fb.rating} / 5</span>
                  </div>
                </div>

                {fb.strengths && (
                  <div className="text-xs">
                    <span className="font-bold text-emerald-700 block">Strengths:</span>
                    <p className="text-[#475569] bg-emerald-50/50 p-2 rounded-lg border border-emerald-100 mt-0.5">{fb.strengths}</p>
                  </div>
                )}

                {fb.weaknesses && (
                  <div className="text-xs">
                    <span className="font-bold text-amber-700 block">Areas for Improvement:</span>
                    <p className="text-[#475569] bg-amber-50/50 p-2 rounded-lg border border-amber-100 mt-0.5">{fb.weaknesses}</p>
                  </div>
                )}

                {fb.actionable_recommendations && (
                  <div className="text-xs">
                    <span className="font-bold text-[#142B4A] block">Actionable Recommendations:</span>
                    <p className="text-[#142B4A] bg-[#F8FAFC] p-2 rounded-lg border border-[#DCE3EC] mt-0.5">{fb.actionable_recommendations}</p>
                  </div>
                )}
              </Card>
            ))}

            {feedbacks.length === 0 && (
              <div className="col-span-full">
                <EmptyState
                  title="No Feedback Records"
                  description="Submit feedback to help students prioritize their skill improvements."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 9. TAB 6: PROFILE & AVAILABILITY ─────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Edit Form */}
          <div className="lg:col-span-2 bg-white border border-[#DCE3EC] p-6 rounded-3xl shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-black text-[#142B4A]">Mentor Profile Settings</h2>
              <p className="text-xs text-[#64748B]">Update your specialization, bio, and student capacity.</p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#142B4A] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A] focus:outline-none focus:border-[#142B4A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#142B4A] mb-1">Domain / Department</label>
                  <input
                    type="text"
                    value={profileForm.domain}
                    onChange={(e) => setProfileForm({ ...profileForm, domain: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A] focus:outline-none focus:border-[#142B4A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#142B4A] mb-1">Professional Bio</label>
                <textarea
                  rows={3}
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  placeholder="Describe your technical background and mentoring focus..."
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A] focus:outline-none focus:border-[#142B4A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#142B4A] mb-1">Years Experience</label>
                  <input
                    type="number"
                    min="1"
                    value={profileForm.years_experience}
                    onChange={(e) => setProfileForm({ ...profileForm, years_experience: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A] focus:outline-none focus:border-[#142B4A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#142B4A] mb-1">Weekly Capacity (Hrs)</label>
                  <input
                    type="number"
                    min="1"
                    value={profileForm.availability_hours_per_week}
                    onChange={(e) => setProfileForm({ ...profileForm, availability_hours_per_week: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A] focus:outline-none focus:border-[#142B4A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#142B4A] mb-1">Max Students</label>
                  <input
                    type="number"
                    min="1"
                    value={profileForm.max_students}
                    onChange={(e) => setProfileForm({ ...profileForm, max_students: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A] focus:outline-none focus:border-[#142B4A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#142B4A] mb-1">LinkedIn Profile URL</label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={profileForm.linkedin_url}
                  onChange={(e) => setProfileForm({ ...profileForm, linkedin_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A] focus:outline-none focus:border-[#142B4A]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center space-x-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Availability Slots Manager */}
          <div className="bg-white border border-[#DCE3EC] p-6 rounded-3xl shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-black text-[#142B4A]">Weekly Availability</h2>
              <p className="text-xs text-[#64748B]">Set recurring consultation windows.</p>
            </div>

            <form onSubmit={handleAddSlot} className="space-y-3 bg-[#F8FAFC] p-4 rounded-2xl border border-[#DCE3EC]">
              <span className="text-xs font-bold text-[#142B4A] block">Add New Time Window</span>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Day of the Week</label>
                <select
                  value={slotForm.day_of_week}
                  onChange={(e) => setSlotForm({ ...slotForm, day_of_week: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A]"
                >
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Start Time</label>
                  <input
                    type="time"
                    value={slotForm.start_time}
                    onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">End Time</label>
                  <input
                    type="time"
                    value={slotForm.end_time}
                    onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={slotSaving}
                className="w-full mt-2 py-2 bg-[#142B4A] text-white text-xs font-bold rounded-xl hover:bg-[#1E3A5F] transition-all flex items-center justify-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Time Slot</span>
              </button>
            </form>

            <div className="space-y-2">
              <span className="text-xs font-bold text-[#64748B] uppercase">Active Slots:</span>
              {availabilitySlots.map((slot) => (
                <div key={slot.id} className="flex justify-between items-center p-3 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs">
                  <div>
                    <span className="font-bold text-[#142B4A]">{slot.day_of_week}</span>
                    <span className="text-[#64748B] ml-2">{slot.start_time} - {slot.end_time}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveSlot(slot.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {availabilitySlots.length === 0 && (
                <span className="text-xs text-[#64748B] italic block">No slots added yet.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 10. MODAL: STUDENT DETAILED PROFILE & GAPS ──────────────────────── */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE3EC] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex justify-between items-start pb-4 border-b border-[#DCE3EC]">
              <div>
                <span className="text-xs font-bold text-[#315B8A] bg-[#EAF0F7] px-2.5 py-0.5 rounded-full inline-block mb-1">
                  Student Profile & Gap Analysis
                </span>
                <h2 className="text-2xl font-black text-[#142B4A]">{selectedStudent.full_name}</h2>
                <p className="text-xs text-[#64748B]">{selectedStudent.email} • {selectedStudent.target_role || 'Software Engineer'}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  setStudentDetail(null);
                }}
                className="p-2 text-[#64748B] hover:text-[#142B4A] hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <LoadingState message="Fetching personalized roadmap and verified skill gaps..." />
            ) : (
              <div className="space-y-6">
                {/* Readiness Score Breakdown */}
                <div className="p-4 bg-[#F8FAFC] border border-[#DCE3EC] rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#64748B] font-bold uppercase">Placement Readiness Score</span>
                    <div className="text-2xl font-black text-[#142B4A]">
                      {studentDetail?.readiness?.overall_score ? Math.round(studentDetail.readiness.overall_score) : (selectedStudent.readiness_score || 72)}%
                    </div>
                  </div>
                  <Badge variant="success">Interview Ready</Badge>
                </div>

                {/* Identified Skill Gaps */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-[#142B4A] flex items-center space-x-2">
                    <Target className="w-4 h-4 text-red-500" />
                    <span>Identified Skill Gaps (Priority Ranked)</span>
                  </h3>
                  <div className="space-y-2">
                    {studentDetail?.skill_gaps && studentDetail.skill_gaps.length > 0 ? (
                      studentDetail.skill_gaps.map((gap: any) => (
                        <div key={gap.id} className="p-3 bg-white border border-[#DCE3EC] rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-[#142B4A]">{gap.skill_name}</span>
                            <span className="text-[11px] text-[#64748B] ml-2">({gap.category})</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-red-600 font-bold">Gap: {gap.gap || gap.gap_value}%</span>
                            <Badge variant={gap.priority === 'high' ? 'danger' : 'warning'}>{gap.priority}</Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#64748B] italic">No critical skill gaps found.</p>
                    )}
                  </div>
                </div>

                {/* Personalized Roadmap */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-[#142B4A] flex items-center space-x-2">
                    <Map className="w-4 h-4 text-[#315B8A]" />
                    <span>Personalized Learning Roadmap</span>
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {studentDetail?.roadmap?.items && studentDetail.roadmap.items.length > 0 ? (
                      studentDetail.roadmap.items.map((item: any) => (
                        <div key={item.id} className="p-3 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-[#142B4A]">Week {item.week_number}: {item.title}</span>
                            <p className="text-[11px] text-[#64748B]">{item.description}</p>
                          </div>
                          <Badge variant={item.status === 'completed' ? 'success' : item.status === 'in_progress' ? 'info' : 'secondary'}>
                            {item.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#64748B] italic">Personalized roadmap is currently generating.</p>
                    )}
                  </div>
                </div>

                {/* Assessments Progress */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-[#142B4A] flex items-center space-x-2">
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                    <span>Assessment History</span>
                  </h3>
                  <div className="space-y-2">
                    {studentDetail?.assessments && studentDetail.assessments.length > 0 ? (
                      studentDetail.assessments.map((att: any) => (
                        <div key={att.id} className="p-2.5 bg-white border border-[#DCE3EC] rounded-xl flex justify-between items-center text-xs">
                          <span className="font-medium text-[#142B4A]">{att.title || 'Technical Assessment'}</span>
                          <span className="font-bold text-emerald-700">{att.score}%</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#64748B] italic">No verified assessments taken yet.</p>
                    )}
                  </div>
                </div>

                {/* Action buttons inside modal */}
                <div className="pt-4 border-t border-[#DCE3EC] flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setScheduleForm((prev) => ({ ...prev, student_id: String(selectedStudent.user_id || selectedStudent.student_id) }));
                      setShowScheduleModal(true);
                    }}
                    className="px-4 py-2 bg-[#EAF0F7] hover:bg-[#DCE6F2] text-[#142B4A] text-xs font-bold rounded-xl flex items-center space-x-1.5"
                  >
                    <Calendar className="w-4 h-4 text-[#315B8A]" />
                    <span>Schedule Session</span>
                  </button>
                  <button
                    onClick={() => {
                      setFeedbackForm((prev) => ({ ...prev, student_id: String(selectedStudent.user_id || selectedStudent.student_id) }));
                      setShowFeedbackModal(true);
                    }}
                    className="px-4 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl flex items-center space-x-1.5"
                  >
                    <MessageSquare className="w-4 h-4 text-sky-300" />
                    <span>Submit Feedback</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 11. MODAL: SCHEDULE SESSION ─────────────────────────────────────── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE3EC] rounded-3xl max-w-md w-full shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex justify-between items-center pb-2 border-b border-[#DCE3EC]">
              <h3 className="text-lg font-black text-[#142B4A]">Schedule Mentoring Session</h3>
              <button onClick={() => setShowScheduleModal(false)} className="p-1 text-[#64748B] hover:text-[#142B4A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#142B4A] mb-1">Select Student *</label>
                <select
                  required
                  value={scheduleForm.student_id}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, student_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A]"
                >
                  <option value="">-- Choose Assigned Student --</option>
                  {students.map((st) => (
                    <option key={st.user_id || st.student_id} value={st.user_id || st.student_id}>
                      {st.full_name} ({st.target_role || 'Student'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#142B4A] mb-1">Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={scheduleForm.scheduled_at}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_at: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#142B4A] mb-1">Duration (Mins)</label>
                  <select
                    value={scheduleForm.duration_minutes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, duration_minutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A]"
                  >
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#142B4A] mb-1">Session Type</label>
                  <input
                    type="text"
                    value={scheduleForm.agenda}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, agenda: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#142B4A] mb-1">Meeting Link</label>
                <input
                  type="url"
                  value={scheduleForm.meeting_link}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, meeting_link: e.target.value })}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A]"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#64748B] text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleLoading}
                  className="px-5 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {scheduleLoading ? 'Scheduling...' : 'Confirm Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 12. MODAL: SUBMIT FEEDBACK ───────────────────────────────────────── */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE3EC] rounded-3xl max-w-lg w-full shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex justify-between items-center pb-2 border-b border-[#DCE3EC]">
              <h3 className="text-lg font-black text-[#142B4A]">Submit Mentee Feedback</h3>
              <button onClick={() => setShowFeedbackModal(false)} className="p-1 text-[#64748B] hover:text-[#142B4A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#142B4A] mb-1">Student *</label>
                <select
                  required
                  value={feedbackForm.student_id}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, student_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A]"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((st) => (
                    <option key={st.user_id || st.student_id} value={st.user_id || st.student_id}>
                      {st.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#142B4A] mb-1">Rating (1 to 5)</label>
                  <select
                    value={feedbackForm.rating}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, rating: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A]"
                  >
                    <option value={5}>5 - Outstanding</option>
                    <option value={4}>4 - Proficient</option>
                    <option value={3}>3 - Progressing</option>
                    <option value={2}>2 - Needs Focus</option>
                    <option value={1}>1 - Beginner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#142B4A] mb-1">Priority Level</label>
                  <select
                    value={feedbackForm.priority_level}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, priority_level: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A]"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#142B4A] mb-1">Observed Strengths</label>
                <textarea
                  rows={2}
                  value={feedbackForm.strengths}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, strengths: e.target.value })}
                  placeholder="Strong problem-solving, solid Python knowledge..."
                  className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#142B4A] mb-1">Areas for Improvement / Weaknesses</label>
                <textarea
                  rows={2}
                  value={feedbackForm.weaknesses}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, weaknesses: e.target.value })}
                  placeholder="System design depth, async handling..."
                  className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#142B4A] mb-1">Actionable Recommendations *</label>
                <textarea
                  rows={3}
                  required
                  value={feedbackForm.actionable_recommendations}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, actionable_recommendations: e.target.value })}
                  placeholder="Focus on completing Weeks 3-4 roadmap modules and practice mock interviews..."
                  className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs font-medium text-[#142B4A]"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#64748B] text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={feedbackLoading}
                  className="px-5 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {feedbackLoading ? 'Submitting...' : 'Submit Recommendations'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
