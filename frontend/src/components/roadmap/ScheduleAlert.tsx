import React from 'react';
import { AlertTriangle, FastForward, CalendarPlus } from 'lucide-react';

interface ScheduleAlertProps {
  daysBehind: number;
  onCompress: () => void;
  onExtend: () => void;
  loading?: boolean;
}

export const ScheduleAlert: React.FC<ScheduleAlertProps> = ({
  daysBehind,
  onCompress,
  onExtend,
  loading = false,
}) => {
  if (daysBehind <= 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-amber-900 tracking-tight">
              Adaptive Alert: You are {daysBehind} {daysBehind === 1 ? 'day' : 'days'} behind schedule
            </h3>
            <p className="text-xs text-amber-700 mt-0.5">
              Your actual completion pace is trailing the target horizon. Let SkillNova adapt your trajectory.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onCompress}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm disabled:opacity-60"
          >
            <FastForward className="w-3.5 h-3.5 text-amber-600" />
            <span>Compress Upcoming Weeks</span>
          </button>

          <button
            type="button"
            onClick={onExtend}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm disabled:opacity-60"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>Extend Horizon by 1 Week</span>
          </button>
        </div>
      </div>
    </div>
  );
};
