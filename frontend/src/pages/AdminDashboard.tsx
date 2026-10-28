import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { Card, Badge, LoadingState, ErrorState } from '../components/common/UIComponents';
import {
  Shield, Users, Sliders, UserCheck, Activity, ScrollText,
  CheckCircle2, XCircle, AlertTriangle, Download, RefreshCw,
  Clock, BarChart3, UserX
} from 'lucide-react';

type Tab = 'overview' | 'mentor-applications' | 'health' | 'audit-logs';

export const AdminDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = (tabParam && ['overview', 'mentor-applications', 'health', 'audit-logs'].includes(tabParam))
    ? tabParam
    : 'overview';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Overview tab state
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [configList, setConfigList] = useState<any[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  // Mentor applications tab
  const [pendingMentors, setPendingMentors] = useState<any[]>([]);
  const [decidingId, setDecidingId] = useState<number | null>(null);

  // Health panel tab
  const [healthData, setHealthData] = useState<any>(null);

  // Audit logs tab
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const AUDIT_PER_PAGE = 20;

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, usersRes, configData] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getUsers({ page: 1, limit: 50, search: userSearch, role: userRoleFilter }),
        adminAPI.getConfig()
      ]);
      setStats(statsData);
      setUsersList(Array.isArray(usersRes) ? usersRes : (usersRes?.items ?? []));
      setConfigList(configData);
      const initial: Record<string, string> = {};
      configData.forEach((c: any) => { initial[c.config_key] = c.config_value; });
      setEditValues(initial);
    } catch (err: any) {
      setError('Failed to fetch administrator records. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [userSearch, userRoleFilter]);

  const loadPendingMentors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminAPI.getPendingMentors();
      setPendingMentors(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load mentor applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHealthPanel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminAPI.getHealthPanel();
      setHealthData(data);
    } catch (err) {
      setError('Failed to load health panel.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.getAuditLogs({ page: auditPage, limit: AUDIT_PER_PAGE });
      setAuditLogs(res?.items ?? []);
      setAuditTotal(res?.total ?? 0);
    } catch (err) {
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [auditPage]);

  useEffect(() => {
    if (activeTab === 'overview') loadOverview();
    else if (activeTab === 'mentor-applications') loadPendingMentors();
    else if (activeTab === 'health') loadHealthPanel();
    else if (activeTab === 'audit-logs') loadAuditLogs();
  }, [activeTab, loadOverview, loadPendingMentors, loadHealthPanel, loadAuditLogs]);

  const handleSaveConfig = async (key: string) => {
    setSavingKey(key);
    try {
      await adminAPI.updateConfig(key, editValues[key]);
      await loadOverview();
    } catch { /* silently handled */ } finally {
      setSavingKey(null);
    }
  };

  const handleMentorDecision = async (mentorId: number, action: 'approve' | 'reject', reason?: string) => {
    setDecidingId(mentorId);
    try {
      if (action === 'approve') await adminAPI.approveMentor(mentorId);
      else await adminAPI.rejectMentor(mentorId, reason || 'Application not approved at this time.');
      await loadPendingMentors();
      window.dispatchEvent(new Event('pending-mentors-updated'));
    } catch { /* silently handled */ } finally {
      setDecidingId(null);
    }
  };

  const handleExportCSV = async (type: 'students' | 'mentors' | 'audit') => {
    try {
      await adminAPI.exportCSV(type);
    } catch { /* silently handled */ }
  };

  if (loading && activeTab === 'overview' && !stats) return <LoadingState message="Loading platform control panel..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#DCE3EC] p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-[#315B8A] text-xs font-bold mb-1">
            <Shield className="w-4 h-4" />
            <span>Platform Administration</span>
          </div>
          <h1 className="text-2xl font-black text-[#142B4A] tracking-tight">Admin Operations Panel</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Manage system users, mentor approvals, platform health, and audit trails.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleExportCSV('students')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-[#EAF0F7] border border-[#142B4A] text-[#142B4A] rounded-xl text-xs font-bold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Students CSV</span>
          </button>
          <button
            onClick={() => handleExportCSV('audit')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-xs font-bold">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 text-[#64748B]">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-[#142B4A]" />
          <span className="text-sm font-semibold text-[#142B4A]">Loading...</span>
        </div>
      )}

      {/* ── OVERVIEW TAB ── */}
      {!loading && activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Users', value: stats?.total_users ?? 0, color: 'text-[#142B4A]' },
              { label: 'Active Students', value: stats?.total_students ?? 0, color: 'text-[#142B4A]' },
              { label: 'Verified Mentors', value: stats?.approved_mentors ?? stats?.total_mentors ?? 0, color: 'text-[#142B4A]' },
              { label: 'Pending Applications', value: stats?.pending_mentors ?? 0, color: 'text-amber-700' },
            ].map(m => (
              <Card key={m.label} className="p-4">
                <span className="text-xs text-[#64748B] font-bold uppercase tracking-wider block">{m.label}</span>
                <span className={`text-2xl font-black ${m.color}`}>{m.value}</span>
              </Card>
            ))}
          </div>

          {/* Config editor */}
          <Card className="space-y-4">
            <h3 className="text-base font-bold text-[#142B4A] flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-[#315B8A]" />
              <span>Placement Readiness Weights & App Configuration</span>
            </h3>
            {configList.length === 0 && (
              <p className="text-xs text-[#64748B]">No configuration entries found.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {configList.map((cfg) => (
                <div key={cfg.id} className="p-3.5 bg-[#F5F7FA] rounded-xl border border-[#DCE3EC] space-y-2">
                  <label className="block text-xs font-bold text-[#142B4A] uppercase tracking-wider">
                    {cfg.config_key}
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={editValues[cfg.config_key] || ''}
                      onChange={(e) => setEditValues({ ...editValues, [cfg.config_key]: e.target.value })}
                      className="flex-1 px-3 py-1.5 bg-white border border-[#DCE3EC] rounded-lg text-xs text-[#142B4A] font-mono focus:outline-none focus:border-[#142B4A]"
                    />
                    <button
                      onClick={() => handleSaveConfig(cfg.config_key)}
                      disabled={savingKey === cfg.config_key}
                      className="px-3.5 py-1.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {savingKey === cfg.config_key ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Users table */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-base font-bold text-[#142B4A] flex items-center space-x-2">
                <Users className="w-4 h-4 text-[#315B8A]" />
                <span>Registered Platform Users ({usersList.length})</span>
              </h3>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search name/email..."
                  value={userSearch}
                  onChange={e => { setUserSearch(e.target.value); }}
                  className="px-3 py-1.5 bg-white border border-[#DCE3EC] rounded-lg text-xs text-[#142B4A] focus:outline-none focus:border-[#142B4A] w-44"
                />
                <select
                  value={userRoleFilter}
                  onChange={e => setUserRoleFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-[#DCE3EC] rounded-lg text-xs text-[#142B4A] focus:outline-none focus:border-[#142B4A] cursor-pointer"
                >
                  <option value="">All Roles</option>
                  <option value="student">Student</option>
                  <option value="mentor">Mentor</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={loadOverview}
                  className="p-2 bg-white hover:bg-[#EAF0F7] border border-[#DCE3EC] text-[#142B4A] rounded-lg text-xs transition-all"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#142B4A]">
                <thead className="bg-[#F5F7FA] text-[#64748B] uppercase text-[10px] font-bold border-b border-[#DCE3EC]">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Full Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Mentor Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3EC]">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-[#F5F7FA] transition-colors">
                      <td className="p-3 font-mono text-[#64748B]">#{u.id}</td>
                      <td className="p-3 font-bold text-[#142B4A]">{u.full_name}</td>
                      <td className="p-3 text-[#64748B]">{u.email}</td>
                      <td className="p-3">
                        <Badge variant={u.role === 'admin' ? 'danger' : u.role === 'mentor' ? 'info' : 'primary'}>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className={u.is_active ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="p-3">
                        {u.mentor_status ? (
                          <Badge variant={
                            u.mentor_status === 'approved' ? 'success' :
                            u.mentor_status === 'pending' ? 'warning' :
                            u.mentor_status === 'rejected' ? 'danger' : 'info'
                          }>
                            {u.mentor_status}
                          </Badge>
                        ) : (
                          <span className="text-[#64748B]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {usersList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-[#64748B]">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── MENTOR APPLICATIONS TAB ── */}
      {!loading && activeTab === 'mentor-applications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#142B4A] flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-[#315B8A]" />
              <span>Pending Mentor Applications</span>
              <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {pendingMentors.length}
              </span>
            </h2>
            <button
              onClick={loadPendingMentors}
              className="flex items-center space-x-1 px-3 py-1.5 bg-white hover:bg-[#EAF0F7] border border-[#DCE3EC] text-[#142B4A] rounded-xl text-xs font-bold transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {pendingMentors.length === 0 ? (
            <Card className="p-8 flex flex-col items-center text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              <p className="font-bold text-[#142B4A]">All caught up!</p>
              <p className="text-xs text-[#64748B]">No pending mentor applications at this time.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {pendingMentors.map(mentor => (
                <Card key={mentor.mentor_id} className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-[#142B4A]">{mentor.name}</h4>
                      <p className="text-xs text-[#64748B]">{mentor.email}</p>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: 'Domain', value: mentor.domain || 'N/A' },
                      { label: 'Experience', value: `${mentor.years_experience} yrs` },
                      { label: 'Avail. hrs/week', value: mentor.availability_hours_per_week },
                      { label: 'LinkedIn', value: mentor.linkedin_url ? '✓ Provided' : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-[#F5F7FA] rounded-lg p-2 border border-[#DCE3EC]">
                        <span className="text-[#64748B] block text-[10px] uppercase font-bold">{label}</span>
                        <span className="text-[#142B4A] font-bold">{value}</span>
                      </div>
                    ))}
                  </div>

                  {mentor.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {mentor.skills.slice(0, 5).map((s: string, i: number) => (
                        <span key={i} className="text-[10px] bg-[#EAF0F7] text-[#142B4A] border border-[#DCE3EC] px-2 py-0.5 rounded-full font-semibold">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {mentor.bio && (
                    <p className="text-xs text-[#142B4A] bg-[#F5F7FA] rounded-xl p-3 border border-[#DCE3EC] italic leading-relaxed">
                      "{mentor.bio}"
                    </p>
                  )}

                  <div className="flex space-x-2 pt-2 border-t border-[#DCE3EC]">
                    <button
                      onClick={() => handleMentorDecision(mentor.mentor_id, 'reject')}
                      disabled={decidingId === mentor.mentor_id}
                      className="flex-1 flex items-center justify-center space-x-1 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleMentorDecision(mentor.mentor_id, 'approve')}
                      disabled={decidingId === mentor.mentor_id}
                      className="flex-1 flex items-center justify-center space-x-1 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{decidingId === mentor.mentor_id ? 'Processing...' : 'Approve'}</span>
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── HEALTH PANEL TAB ── */}
      {!loading && activeTab === 'health' && healthData && (
        <div className="space-y-5">
          <h2 className="text-lg font-bold text-[#142B4A] flex items-center space-x-2">
            <Activity className="w-5 h-5 text-[#315B8A]" />
            <span>Platform Health Dashboard</span>
          </h2>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Stalled Students',
                value: healthData.stalled_students_count,
                desc: 'No progress in 14+ days',
                color: 'text-red-600',
                icon: UserX
              },
              {
                label: 'Unanswered Requests',
                value: healthData.unanswered_requests_count,
                desc: 'Pending 48+ hours',
                color: 'text-amber-700',
                icon: Clock
              },
              {
                label: 'Unassigned Students',
                value: healthData.unassigned_students_count,
                desc: 'No mentor match yet',
                color: 'text-[#142B4A]',
                icon: Users
              },
              {
                label: 'Pending Mentor Apps',
                value: healthData.pending_mentor_applications,
                desc: 'Awaiting admin review',
                color: 'text-[#315B8A]',
                icon: UserCheck
              },
            ].map(kpi => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label} className="p-4 flex items-start space-x-3">
                  <div className="p-2 bg-[#EAF0F7] rounded-lg flex-shrink-0">
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  <div>
                    <span className="text-xs text-[#64748B] font-bold block">{kpi.label}</span>
                    <span className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</span>
                    <span className="text-[10px] text-[#64748B] block">{kpi.desc}</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Stalled students list */}
          {healthData.stalled_students?.length > 0 && (
            <Card className="space-y-3">
              <h3 className="text-sm font-bold text-[#142B4A] flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Stalled Students — Attention Advised</span>
              </h3>
              <div className="space-y-2">
                {healthData.stalled_students.map((s: any) => (
                  <div key={s.student_id} className="flex items-center justify-between p-3 bg-[#F5F7FA] border border-[#DCE3EC] rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-[#142B4A]">{s.name}</p>
                      <p className="text-[11px] text-[#64748B]">{s.email} · {s.target_role || 'N/A'}</p>
                    </div>
                    <span className="text-[10px] text-red-700 font-bold flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Stalled</span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── AUDIT LOGS TAB ── */}
      {!loading && activeTab === 'audit-logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#142B4A] flex items-center space-x-2">
              <ScrollText className="w-5 h-5 text-[#315B8A]" />
              <span>Immutable Audit Trail</span>
              <span className="text-xs text-[#64748B] font-normal">({auditTotal} records total)</span>
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleExportCSV('audit')}
                className="flex items-center space-x-1 px-3 py-1.5 bg-white hover:bg-[#EAF0F7] border border-[#142B4A] text-[#142B4A] rounded-xl text-xs font-bold transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
              <button
                onClick={loadAuditLogs}
                className="flex items-center space-x-1 px-3 py-1.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <Card className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#142B4A]">
              <thead className="bg-[#F5F7FA] text-[#64748B] uppercase text-[10px] font-bold border-b border-[#DCE3EC]">
                <tr>
                  <th className="p-3">Log ID</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Table</th>
                  <th className="p-3">Target ID</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3EC]">
                {auditLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-[#F5F7FA] transition-colors">
                    <td className="p-3 font-mono text-[#64748B]">#{log.id}</td>
                    <td className="p-3">
                      <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${
                        log.action_type?.includes('REJECT') || log.action_type?.includes('SUSPEND')
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : log.action_type?.includes('APPROVE')
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-[#EAF0F7] text-[#142B4A] border border-[#DCE3EC]'
                      }`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="p-3 text-[#64748B] font-mono text-[10px]">{log.target_table}</td>
                    <td className="p-3 font-mono text-[#64748B]">#{log.target_id}</td>
                    <td className="p-3 text-[#64748B]">#{log.actor_user_id}</td>
                    <td className="p-3 text-[#64748B] max-w-[200px] truncate" title={log.reason}>{log.reason || '—'}</td>
                    <td className="p-3 text-[#64748B] text-[10px] font-mono whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-[#64748B]">No audit records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          {/* Pagination */}
          {auditTotal > AUDIT_PER_PAGE && (
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                disabled={auditPage === 1}
                className="px-3 py-1.5 bg-white border border-[#DCE3EC] text-[#142B4A] rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-[#EAF0F7] transition-all"
              >
                Previous
              </button>
              <span className="text-xs text-[#64748B]">
                Page {auditPage} of {Math.ceil(auditTotal / AUDIT_PER_PAGE)}
              </span>
              <button
                onClick={() => setAuditPage(p => p + 1)}
                disabled={auditPage >= Math.ceil(auditTotal / AUDIT_PER_PAGE)}
                className="px-3 py-1.5 bg-white border border-[#DCE3EC] text-[#142B4A] rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-[#EAF0F7] transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
