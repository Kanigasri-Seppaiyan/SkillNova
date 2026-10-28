import React from 'react';
import { Card, ProgressBar } from '../common/UIComponents';
import { Flame, Clock, CheckCircle2, Target } from 'lucide-react';

interface ProgressSummaryProps {
  totalItems: number;
  completedItems: number;
  totalHours: number;
  completedHours: number;
  activeWeekNum: number;
  activeWeekTotalHours: number;
  activeWeekDoneHours: number;
  activeWeekDoneTasks: number;
  activeWeekTotalTasks: number;
  streakDays?: number;
}

export const ProgressSummary: React.FC<ProgressSummaryProps> = ({
  totalItems,
  completedItems,
  totalHours,
  completedHours,
  activeWeekNum,
  activeWeekTotalHours,
  activeWeekDoneHours,
  activeWeekDoneTasks,
  activeWeekTotalTasks,
  streakDays = 5,
}) => {
  const overallPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const activeWeekPercent =
    activeWeekTotalHours > 0
      ? Math.round((activeWeekDoneHours / activeWeekTotalHours) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Overall Progress Card */}
      <Card gradientBorder className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6">
        <div className="flex-1 space-y-2.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-[#142B4A] flex items-center space-x-1.5">
              <Target className="w-3.5 h-3.5 text-[#315B8A]" />
              <span>Overall Roadmap Progress</span>
            </span>
            <span className="font-extrabold text-[#315B8A] text-sm">
              {overallPercentage}%
            </span>
          </div>
          <ProgressBar value={overallPercentage} showPercent={false} />
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>
              <strong className="text-[#142B4A]">{completedItems}</strong> of{' '}
              <strong className="text-[#142B4A]">{totalItems}</strong> action items completed
            </span>
            <span>
              {completedHours.toFixed(1)}h of {totalHours.toFixed(0)}h finished
            </span>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-6 border-t lg:border-t-0 lg:border-l border-[#DCE3EC] pt-4 lg:pt-0 lg:pl-6 text-xs text-[#64748B]">
          <div>
            <span className="block text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
              Total Commitment
            </span>
            <span className="text-lg font-black text-[#142B4A]">{totalHours.toFixed(0)} Hours</span>
          </div>

          <div>
            <span className="block text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
              Remaining
            </span>
            <span className="text-lg font-black text-[#315B8A]">
              {Math.max(0, totalHours - completedHours).toFixed(0)} Hours
            </span>
          </div>
        </div>
      </Card>

      {/* Weekly Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Weekly Hours Done */}
        <div className="bg-white border border-[#DCE3EC] rounded-2xl p-3.5 flex items-center space-x-3 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-[#EAF0F7] border border-[#315B8A]/20 flex items-center justify-center text-[#315B8A] shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
              Week {activeWeekNum} Hours
            </span>
            <span className="text-xs font-bold text-[#142B4A]">
              {activeWeekDoneHours.toFixed(1)}h of {activeWeekTotalHours.toFixed(1)}h done ({activeWeekPercent}%)
            </span>
          </div>
        </div>

        {/* Tasks done this week */}
        <div className="bg-white border border-[#DCE3EC] rounded-2xl p-3.5 flex items-center space-x-3 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] border border-[#15803D]/20 flex items-center justify-center text-[#15803D] shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
              Tasks This Week
            </span>
            <span className="text-xs font-bold text-[#142B4A]">
              {activeWeekDoneTasks} of {activeWeekTotalTasks} completed
            </span>
          </div>
        </div>

        {/* Study Streak Counter */}
        <div className="bg-white border border-[#DCE3EC] rounded-2xl p-3.5 flex items-center space-x-3 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
              Study Streak
            </span>
            <span className="text-xs font-extrabold text-amber-700">
              🔥 {streakDays}-Day Momentum Streak
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
