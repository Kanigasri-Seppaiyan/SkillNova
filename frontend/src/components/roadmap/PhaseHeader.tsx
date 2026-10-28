import React from 'react';
import { Target, Award, CheckCircle2 } from 'lucide-react';

interface PhaseHeaderProps {
  phaseName: string;
  phaseNumber: number;
  weeksRange: string;
  description: string;
  completedTasks: number;
  totalTasks: number;
}

export const PhaseHeader: React.FC<PhaseHeaderProps> = ({
  phaseName,
  phaseNumber,
  weeksRange,
  description,
  completedTasks,
  totalTasks,
}) => {
  const isDone = totalTasks > 0 && completedTasks === totalTasks;
  const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="pt-6 pb-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE3EC] pb-3">
        <div className="flex items-center space-x-3">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs border ${
              isDone
                ? 'bg-[#F0FDF4] text-[#15803D] border-[#15803D]/30'
                : 'bg-[#EAF0F7] text-[#315B8A] border-[#315B8A]/30'
            }`}
          >
            {isDone ? <CheckCircle2 className="w-4 h-4 text-[#15803D]" /> : `P${phaseNumber}`}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-extrabold text-[#142B4A] tracking-tight">
                {phaseName}
              </h2>
              <span className="text-[11px] font-mono text-[#315B8A] bg-[#EAF0F7] border border-[#DCE3EC] px-2 py-0.5 rounded-full">
                {weeksRange}
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">{description}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs text-[#64748B] self-start sm:self-auto">
          <span>
            {completedTasks}/{totalTasks} completed ({percent}%)
          </span>
          <div className="w-16 h-1.5 bg-[#EAF0F7] rounded-full overflow-hidden border border-[#DCE3EC]">
            <div
              className="h-full bg-[#142B4A] transition-all duration-300 rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const PhaseMilestone: React.FC<{ milestone: string; isAchieved: boolean }> = ({
  milestone,
  isAchieved,
}) => (
  <div
    className={`my-4 p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
      isAchieved
        ? 'bg-[#F0FDF4] border-[#15803D]/30 text-[#15803D]'
        : 'bg-[#F5F7FA] border-[#DCE3EC] text-[#475569]'
    }`}
  >
    <div className="flex items-center space-x-3">
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
          isAchieved ? 'bg-[#15803D]/10 text-[#15803D]' : 'bg-[#EAF0F7] text-[#64748B]'
        }`}
      >
        <Award className="w-4 h-4" />
      </div>
      <div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] block">
          Phase Milestone
        </span>
        <span className={`text-xs font-semibold ${isAchieved ? 'text-[#15803D]' : 'text-[#142B4A]'}`}>
          {milestone}
        </span>
      </div>
    </div>

    {isAchieved ? (
      <span className="inline-flex items-center space-x-1 text-xs font-bold text-[#15803D] bg-[#F0FDF4] px-2.5 py-1 rounded-full border border-[#15803D]/20">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Achieved</span>
      </span>
    ) : (
      <span className="text-[11px] font-medium text-[#64748B] bg-[#EAF0F7] px-2.5 py-1 rounded-full border border-[#DCE3EC]">
        In Progress
      </span>
    )}
  </div>
);
