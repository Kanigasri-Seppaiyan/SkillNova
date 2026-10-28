import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, staffAPI } from '../../services/api';
import {
  LayoutDashboard,
  Target,
  FileCheck2,
  Map,
  Award,
  FolderGit2,
  Users,
  Bot,
  Compass,
  FileText,
  UserCheck,
  Shield,
  BarChart3,
  Activity,
  ScrollText,
  BookOpen,
  Calendar,
  MessageSquare,
} from 'lucide-react';

const STUDENT_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/skills', label: 'Skills & Gaps', icon: Target },
  { to: '/assessments', label: 'Assessments', icon: FileCheck2 },
  { to: '/roadmap', label: 'Roadmap', icon: Map },
  { to: '/placement-readiness', label: 'Placement Score', icon: Award },
  { to: '/projects', label: 'Projects', icon: FolderGit2 },
  { to: '/mentors', label: 'Mentors', icon: Users },
  { to: '/ai-chat', label: 'AI Career Coach', icon: Bot },
  { to: '/career-gps', label: 'Career GPS', icon: Compass },
  { to: '/resume-upload', label: 'Resume Analyzer', icon: FileText },
];

const STAFF_NAV = [
  { to: '/staff-dashboard?tab=roster', tabId: 'roster', label: 'Assigned Students', icon: Users, badgeKey: 'roster' },
  { to: '/staff-dashboard?tab=gaps', tabId: 'gaps', label: 'Skill-Gap Summaries', icon: Target },
  { to: '/staff-dashboard?tab=roadmap', tabId: 'roadmap', label: 'Roadmap Progress', icon: BookOpen },
  { to: '/staff-dashboard?tab=activities', tabId: 'activities', label: 'Mentoring & Sessions', icon: Calendar, badgeKey: 'requests' },
  { to: '/staff-dashboard?tab=feedback', tabId: 'feedback', label: 'Feedback & Reports', icon: MessageSquare },
  { to: '/mentor-dashboard', label: 'Mentor Hub', icon: UserCheck },
];

const MENTOR_NAV = [
  { to: '/mentor-dashboard', label: 'Mentor Dashboard', icon: UserCheck },
];

const ADMIN_NAV = [
  { to: '/admin?tab=overview', tabId: 'overview', label: 'Overview', icon: BarChart3 },
  { to: '/admin?tab=mentor-applications', tabId: 'mentor-applications', label: 'Mentor Applications', icon: UserCheck, hasBadge: true },
  { to: '/admin?tab=health', tabId: 'health', label: 'Health Panel', icon: Activity },
  { to: '/admin?tab=audit-logs', tabId: 'audit-logs', label: 'Audit Logs', icon: ScrollText },
];

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [pendingMentorCount, setPendingMentorCount] = useState<number>(0);
  const [staffRosterCount, setStaffRosterCount] = useState<number>(0);
  const [staffRequestsCount, setStaffRequestsCount] = useState<number>(0);

  useEffect(() => {
    if (user?.role === 'admin') {
      const fetchPending = async () => {
        try {
          const data = await adminAPI.getPendingMentors();
          if (Array.isArray(data)) {
            setPendingMentorCount(data.length);
          }
        } catch {
          // ignore
        }
      };

      fetchPending();
      window.addEventListener('pending-mentors-updated', fetchPending);
      return () => window.removeEventListener('pending-mentors-updated', fetchPending);
    } else if (user?.role === 'staff') {
      const fetchStaffCounts = async () => {
        try {
          const [rosterData, reqData] = await Promise.all([
            staffAPI.getRoster().catch(() => []),
            staffAPI.getRequests().catch(() => []),
          ]);
          if (Array.isArray(rosterData)) {
            setStaffRosterCount(rosterData.length);
          }
          if (Array.isArray(reqData)) {
            setStaffRequestsCount(reqData.length);
          }
        } catch {
          // ignore
        }
      };

      fetchStaffCounts();
      window.addEventListener('staff-counts-updated', fetchStaffCounts);
      return () => window.removeEventListener('staff-counts-updated', fetchStaffCounts);
    }
  }, [user, location.search]);

  let navItems: any[] = STUDENT_NAV;
  let sectionLabel = 'Student Portal';

  if (user?.role === 'admin') {
    navItems = ADMIN_NAV;
    sectionLabel = 'Administration';
  } else if (user?.role === 'staff') {
    navItems = STAFF_NAV;
    sectionLabel = 'Staff Portal';
  } else if (user?.role === 'mentor') {
    navItems = MENTOR_NAV;
    sectionLabel = 'Mentor Portal';
  }

  const footerMap: Record<'admin' | 'staff' | 'mentor' | 'student', { icon: React.ReactNode; title: string; desc: string }> = {
    admin: {
      icon: <Shield className="w-4 h-4 text-white" />,
      title: 'Admin Control Center',
      desc: 'Platform metrics, health monitoring, and audit trails.',
    },
    staff: {
      icon: <UserCheck className="w-4 h-4 text-white" />,
      title: 'Staff Portal Active',
      desc: 'Monitor assigned students, roadmap progress & feedback.',
    },
    mentor: {
      icon: <UserCheck className="w-4 h-4 text-white" />,
      title: 'Mentor Hub Active',
      desc: 'Review mentorship requests & track progress.',
    },
    student: {
      icon: <Bot className="w-4 h-4 text-white" />,
      title: 'AI Coach Ready',
      desc: 'Ask AI questions regarding gaps and roadmap.',
    },
  };

  const roleKey = (user?.role as 'admin' | 'staff' | 'mentor' | 'student') || 'student';
  const footerContent = footerMap[roleKey];

  return (
    <aside className="w-64 bg-[#142B4A] text-white hidden md:flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)] border-r border-[#0D1C30]/40 shrink-0">
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-bold text-slate-300/70 uppercase tracking-wider mb-2">
          {sectionLabel}
        </p>
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const searchParams = new URLSearchParams(location.search);
          const currentTab = searchParams.get('tab');

          let isActive = false;
          if (user?.role === 'admin') {
            const adminTab = currentTab || 'overview';
            isActive = location.pathname === '/admin' && (item.tabId === adminTab);
          } else if (user?.role === 'staff') {
            if (item.tabId) {
              const staffTab = currentTab || 'roster';
              isActive = (location.pathname === '/staff-dashboard' || location.pathname === '/staff') && (item.tabId === staffTab);
            } else {
              isActive = location.pathname === item.to;
            }
          } else {
            isActive = location.pathname === item.to;
          }

          let badgeCount = 0;
          if (user?.role === 'admin' && item.hasBadge) {
            badgeCount = pendingMentorCount;
          } else if (user?.role === 'staff') {
            if (item.badgeKey === 'roster') badgeCount = staffRosterCount;
            if (item.badgeKey === 'requests') badgeCount = staffRequestsCount;
          }

          return (
            <Link
              key={`${item.to}-${idx}`}
              to={item.to}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#1E3A5F] text-white shadow-sm border border-[#315B8A]/40'
                  : 'text-slate-300 hover:text-white hover:bg-[#1E3A5F]/60 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4 text-slate-300" />
                <span>{item.label}</span>
              </div>
              {badgeCount > 0 && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                    user?.role === 'admin'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-sm font-black'
                      : isActive
                      ? 'bg-[#EAF0F7] text-[#142B4A] shadow-xs'
                      : 'bg-[#0D1D33] text-[#A0B3CC] border border-[#234773]'
                  }`}
                >
                  {badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="p-3.5 rounded-2xl bg-[#1E3A5F] border border-[#315B8A]/40 text-white">
        <div className="flex items-center space-x-2 text-xs font-bold mb-1">
          {footerContent.icon}
          <span>{footerContent.title}</span>
        </div>
        <p className="text-[11px] text-slate-300/80 leading-snug">
          {footerContent.desc}
        </p>
      </div>
    </aside>
  );
};
