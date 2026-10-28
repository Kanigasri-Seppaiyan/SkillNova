import React from 'react';
import { Check, Lock } from 'lucide-react';

interface TimelineStripProps {
  totalWeeks: number;
  activeWeekNum: number;
  weeksStatus: Record<number, { isComplete: boolean; isLocked: boolean; itemCount: number }>;
  onSelectWeek: (weekNum: number) => void;
}

export const TimelineStrip: React.FC<TimelineStripProps> = ({
  totalWeeks = 12,
  activeWeekNum,
  weeksStatus,
  onSelectWeek,
}) => {
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  return (
    <div className="bg-white border border-[#DCE3EC] rounded-2xl p-3 overflow-x-auto scrollbar-none shadow-sm">
      <div className="flex items-center justify-between min-w-[650px] gap-2 px-1">
        {weeks.map((w, index) => {
          const status = weeksStatus[w] || { isComplete: false, isLocked: w > activeWeekNum, itemCount: 0 };
          const isActive = w === activeWeekNum;
          const isComplete = status.isComplete;
          const isLocked = status.isLocked && !isComplete && !isActive;

          return (
            <React.Fragment key={w}>
              <button
                type="button"
                onClick={() => onSelectWeek(w)}
                className={`group relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-[#142B4A] border-[#315B8A] text-white shadow-sm scale-105 z-10'
                    : isComplete
                    ? 'bg-[#F0FDF4] border-[#15803D]/40 text-[#15803D] hover:border-[#15803D]'
                    : isLocked
                    ? 'bg-[#F5F7FA] border-[#DCE3EC] text-[#94A3B8] hover:border-[#64748B]'
                    : 'bg-[#EAF0F7] border-[#DCE3EC] text-[#142B4A] hover:border-[#315B8A]'
                }`}
                title={`Week ${w}: ${isComplete ? 'Completed' : isActive ? 'Active' : 'Upcoming'}`}
              >
                <div className="flex items-center justify-center w-6 h-6">
                  {isComplete ? (
                    <Check className="w-3.5 h-3.5 text-[#15803D] stroke-[3]" />
                  ) : isLocked ? (
                    <Lock className="w-3 h-3 text-[#94A3B8]" />
                  ) : (
                    <span className="text-[11px] font-black">{w}</span>
                  )}
                </div>
                <span className="text-[9px] font-mono tracking-tighter opacity-80 mt-0.5">
                  W{w}
                </span>

                {isActive && (
                  <span className="absolute -top-1 w-2 h-2 rounded-full bg-[#315B8A] animate-ping" />
                )}
              </button>

              {/* Connecting line between weeks */}
              {index < weeks.length - 1 && (
                <div
                  className={`h-0.5 flex-1 transition-colors ${
                    isComplete
                      ? 'bg-[#15803D]/40'
                      : isActive
                      ? 'bg-gradient-to-r from-[#315B8A] to-[#DCE3EC]'
                      : 'bg-[#DCE3EC]'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
