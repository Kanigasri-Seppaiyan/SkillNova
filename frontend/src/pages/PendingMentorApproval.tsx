import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, Shield, Mail, LogOut, CheckCircle2, AlertCircle, Hourglass } from 'lucide-react';

export const PendingMentorApproval: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#142B4A] flex flex-col items-center justify-center p-6">
      <div className="relative max-w-lg w-full space-y-6">

        {/* Logo / Brand */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-[#142B4A] font-extrabold text-2xl mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#142B4A] text-white flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span>SkillNova</span>
          </div>
          <p className="text-xs text-[#64748B]">Academic & Mentorship Platform</p>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-[#DCE3EC] rounded-3xl p-8 shadow-sm space-y-6">

          {/* Status icon */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <div className="w-16 h-16 bg-[#EAF0F7] border border-[#DCE3EC] rounded-full flex items-center justify-center">
                <Hourglass className="w-8 h-8 text-[#142B4A]" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-black text-[#142B4A] tracking-tight">
                Application Under Review
              </h1>
              <p className="text-[#64748B] text-xs mt-1 leading-relaxed">
                Hello <span className="text-[#142B4A] font-bold">{user?.full_name || 'Mentor'}</span>! Your faculty/mentor application has been received and is pending admin approval.
              </p>
            </div>
          </div>

          {/* What happens next */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-[#142B4A] uppercase tracking-wider">What happens next</p>

            <div className="space-y-2">
              {[
                {
                  icon: CheckCircle2,
                  color: 'text-emerald-700',
                  bg: 'bg-emerald-50 border-emerald-200',
                  title: 'Application Submitted',
                  desc: 'Your application has been recorded and queued for review.',
                  done: true
                },
                {
                  icon: Clock,
                  color: 'text-amber-700',
                  bg: 'bg-amber-50 border-amber-200',
                  title: 'Admin Review in Progress',
                  desc: 'Our team will verify your faculty profile and domain details.',
                  done: false
                },
                {
                  icon: Mail,
                  color: 'text-[#142B4A]',
                  bg: 'bg-[#EAF0F7] border-[#DCE3EC]',
                  title: 'Notification & Access Grant',
                  desc: "You'll receive notification upon approval with full Faculty Hub access.",
                  done: false
                },
              ].map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className={`flex items-start space-x-3 p-3.5 rounded-xl border ${step.bg}`}>
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${step.color}`} />
                    <div>
                      <p className={`text-xs font-bold text-[#142B4A]`}>{step.title}</p>
                      <p className="text-[11px] text-[#64748B] mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start space-x-3 bg-[#F5F7FA] border border-[#DCE3EC] rounded-2xl p-4">
            <AlertCircle className="w-4 h-4 text-[#315B8A] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              Typical review time is <span className="text-[#142B4A] font-bold">1–3 business days</span>. If you require urgent access, contact the platform administrator at{' '}
              <a href="mailto:admin@bitsathy.ac.in" className="text-[#142B4A] underline font-semibold">admin@bitsathy.ac.in</a>.
            </p>
          </div>

          {/* Account info */}
          <div className="flex items-center justify-between p-3 bg-[#F5F7FA] rounded-xl border border-[#DCE3EC]">
            <div>
              <p className="text-xs font-bold text-[#142B4A]">{user?.email}</p>
              <p className="text-[10px] text-[#64748B]">Mentor Application · Pending</p>
            </div>
            <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 py-2.5 bg-white hover:bg-[#EAF0F7] border border-[#142B4A] text-[#142B4A] rounded-xl text-xs font-bold transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        <p className="text-center text-[11px] text-[#64748B]">
          SkillNova · Restricted to institutional accounts
        </p>
      </div>
    </div>
  );
};
