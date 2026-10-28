import React, { useState } from 'react';
import { RoadmapItem } from '../../types';
import { TaskCard } from './TaskCard';
import {
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  ArrowRight,
  ListTodo
} from 'lucide-react';

interface WeekSectionProps {
  weekNum: number;
  items: RoadmapItem[];
  isActiveWeek: boolean;
  isLocked: boolean;
  isFullyDone: boolean;
  nextUpTaskId?: number;
  onStatusChange: (item: RoadmapItem, newStatus: 'pending' | 'in_progress' | 'completed') => void;
  onRequestProof: (item: RoadmapItem) => void;
  onStartNextWeek?: () => void;
}

export const WeekSection: React.FC<WeekSectionProps> = ({
  weekNum,
  items,
  isActiveWeek,
  isLocked,
  isFullyDone,
  nextUpTaskId,
  onStatusChange,
  onRequestProof,
  onStartNextWeek,
}) => {
  // If locked or future, start collapsed; if active, start open
  const [isExpanded, setIsExpanded] = useState<boolean>(!isLocked || isActiveWeek);
  const [showCompletedTasks, setShowCompletedTasks] = useState<boolean>(false);

  const completedTasks = items.filter((item) => item.status === 'completed');
  const activeTasks = items.filter((item) => item.status !== 'completed');
  const totalHours = items.reduce((acc, curr) => acc + (curr.estimated_hours || 0), 0);
  const completedHours = completedTasks.reduce((acc, curr) => acc + (curr.estimated_hours || 0), 0);

  return (
    <div
      id={`week-${weekNum}`}
      className={`rounded-3xl border transition-all duration-300 ${
        isActiveWeek
          ? 'bg-white border-[#315B8A] shadow-md'
          : isFullyDone
          ? 'bg-white border-[#15803D]/30'
          : isLocked
          ? 'bg-[#F5F7FA] border-[#DCE3EC] opacity-80'
          : 'bg-white border-[#DCE3EC]'
      } overflow-hidden`}
    >
      {/* Week Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F5F7FA] transition-colors"
      >
        <div className="flex items-center space-x-3.5">
          {/* Week Badge */}
          <div
            className={`w-10 h-10 rounded-2xl font-black text-sm flex items-center justify-center border transition-all ${
              isActiveWeek
                ? 'bg-[#142B4A] border-[#315B8A] text-white shadow-sm'
                : isFullyDone
                ? 'bg-[#F0FDF4] border-[#15803D]/40 text-[#15803D]'
                : isLocked
                ? 'bg-[#EAF0F7] border-[#DCE3EC] text-[#64748B]'
                : 'bg-[#EAF0F7] border-[#DCE3EC] text-[#142B4A]'
            }`}
          >
            {isFullyDone ? (
              <CheckCircle2 className="w-5 h-5 text-[#15803D]" />
            ) : isLocked ? (
              <Lock className="w-4 h-4 text-[#64748B]" />
            ) : (
              <span>W{weekNum}</span>
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-[#142B4A] tracking-tight">
                Week {weekNum} Action Plan
              </h3>
              {isActiveWeek && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#EAF0F7] text-[#315B8A] border border-[#315B8A]/30 shadow-sm animate-pulse">
                  Active Week
                </span>
              )}
              {isFullyDone && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F0FDF4] text-[#15803D] border border-[#15803D]/30">
                  Completed
                </span>
              )}
              {isLocked && !isFullyDone && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F5F7FA] text-[#64748B] border border-[#DCE3EC]">
                  Upcoming
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              {completedTasks.length} of {items.length} tasks completed • {completedHours.toFixed(1)}h of {totalHours.toFixed(1)}h done
            </p>
          </div>
        </div>

        {/* Stats & Expand/Collapse Toggle */}
        <div className="flex items-center space-x-3 self-end md:self-auto">
          <div className="hidden sm:flex items-center space-x-2 text-xs text-[#64748B] font-mono bg-[#F5F7FA] px-3 py-1.5 rounded-xl border border-[#DCE3EC]">
            <Clock className="w-3.5 h-3.5 text-[#315B8A]" />
            <span>{totalHours.toFixed(0)}h total</span>
          </div>

          <button
            type="button"
            className="p-2 rounded-xl bg-[#F5F7FA] hover:bg-[#EAF0F7] text-[#64748B] hover:text-[#142B4A] border border-[#DCE3EC] transition-colors"
            aria-label={isExpanded ? 'Collapse week' : 'Expand week'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Week Content Body */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-[#DCE3EC]">
          {/* Week Complete Celebration Banner */}
          {isFullyDone && (
            <div className="bg-[#F0FDF4] border border-[#15803D]/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center space-x-3 text-center sm:text-left">
                <div className="w-9 h-9 rounded-xl bg-[#15803D]/10 border border-[#15803D]/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-[#15803D]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#15803D]">
                    Week {weekNum} Complete! Outstanding work.
                  </h4>
                  <p className="text-xs text-[#15803D]/80">
                    All action items and practice modules verified. Ready for the next milestone.
                  </p>
                </div>
              </div>

              {onStartNextWeek && (
                <button
                  onClick={onStartNextWeek}
                  className="px-4 py-2 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white font-semibold text-xs transition-all shadow-sm flex items-center space-x-1.5 shrink-0"
                >
                  <span>Start Week {weekNum + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Active / Incomplete Tasks Grid */}
          {activeTasks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTasks.map((item) => (
                <TaskCard
                  key={item.id}
                  item={item}
                  isNextUp={item.id === nextUpTaskId}
                  onStatusChange={onStatusChange}
                  onRequestProof={onRequestProof}
                />
              ))}
            </div>
          )}

          {/* Completed Tasks Collapsible Row */}
          {completedTasks.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#F5F7FA] hover:bg-[#EAF0F7] border border-[#DCE3EC] text-xs font-semibold text-[#475569] hover:text-[#142B4A] transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
                  <span>
                    Completed ({completedTasks.length})
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-[#64748B] text-[11px]">
                  <span>{showCompletedTasks ? 'Hide' : 'Show details'}</span>
                  {showCompletedTasks ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </div>
              </button>

              {showCompletedTasks && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  {completedTasks.map((item) => (
                    <TaskCard
                      key={item.id}
                      item={item}
                      onStatusChange={onStatusChange}
                      onRequestProof={onRequestProof}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {items.length === 0 && (
            <div className="py-6 text-center text-xs text-[#64748B]">
              No tasks scheduled for Week {weekNum} yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
