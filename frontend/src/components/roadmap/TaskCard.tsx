import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RoadmapItem } from '../../types';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  PlayCircle,
  Video,
  FileText,
  Code2,
  Bot,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Circle
} from 'lucide-react';

interface TaskCardProps {
  item: RoadmapItem;
  isNextUp?: boolean;
  onStatusChange: (item: RoadmapItem, newStatus: 'pending' | 'in_progress' | 'completed') => void;
  onRequestProof: (item: RoadmapItem) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  item,
  isNextUp = false,
  onStatusChange,
  onRequestProof,
}) => {
  const navigate = useNavigate();
  const isDone = item.status === 'completed';
  const isInProgress = item.status === 'in_progress';
  const isPending = item.status === 'pending' || !item.status;

  // Type styling – light theme variants
  const rawType = (item.item_type || item.type || 'learn').toLowerCase();
  const getTypeBadge = () => {
    switch (rawType) {
      case 'practice':
        return { label: 'Practice', classes: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'build':
        return { label: 'Build', classes: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'interview_prep':
      case 'interview':
        return { label: 'Interview Prep', classes: 'bg-red-50 text-red-700 border-red-200' };
      case 'assess':
        return { label: 'Assessment', classes: 'bg-teal-50 text-teal-800 border-teal-200' };
      case 'revision':
        return { label: 'Revision', classes: 'bg-orange-50 text-orange-800 border-orange-200' };
      case 'learn':
      default:
        return { label: 'Learn', classes: 'bg-sky-50 text-sky-800 border-sky-200' };
    }
  };

  // Difficulty badge styling – light theme variants
  const difficulty = (item.difficulty || 'medium').toLowerCase();
  const getDifficultyBadge = () => {
    switch (difficulty) {
      case 'hard':
        return { label: 'Hard', classes: 'bg-red-50 text-red-700 border-red-200' };
      case 'easy':
        return { label: 'Easy', classes: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'medium':
      default:
        return { label: 'Medium', classes: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
  };

  const typeBadge = getTypeBadge();
  const diffBadge = getDifficultyBadge();

  // Resources list fallback
  const resources = item.resources && item.resources.length > 0
    ? item.resources
    : item.resource_url
    ? [{ title: 'Curated Resource', url: item.resource_url, type: 'article' as const }]
    : [];

  const handleStartOrToggle = () => {
    if (isPending) onStatusChange(item, 'in_progress');
    else if (isInProgress) onRequestProof(item);
    else if (isDone) onStatusChange(item, 'pending');
  };

  const handleAskAICoach = () => {
    const prompt = `Help me prepare for this roadmap task:\n\nTask: ${item.title}\nDescription: ${item.description || 'No description provided'}\nDifficulty: ${item.difficulty || 'Medium'}\nEstimated Time: ${item.estimated_hours}h.\n\nCould you break this down into clear actionable steps, key technical concepts to master, and common interview questions related to it?`;
    navigate('/ai-chat', { state: { initialPrompt: prompt } });
  };

  const handleSkillGapClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/skills');
  };

  return (
    <div
      className={`relative group rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between ${
        isDone
          ? 'bg-[#F5F7FA] border-[#DCE3EC] opacity-85'
          : isInProgress
          ? 'bg-white border-[#315B8A] shadow-md ring-1 ring-[#315B8A]/20'
          : isNextUp
          ? 'bg-white border-[#1E3A5F]/40 shadow-sm hover:border-[#315B8A]'
          : 'bg-white border-[#DCE3EC] hover:border-[#315B8A]'
      }`}
    >
      {/* Top Tag Bar */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Type badge */}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wide ${typeBadge.classes}`}
            >
              {typeBadge.label}
            </span>

            {/* Difficulty badge */}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${diffBadge.classes}`}
            >
              {diffBadge.label}
            </span>

            {/* Next up badge */}
            {isNextUp && !isDone && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF0F7] text-[#315B8A] border border-[#315B8A]/30 animate-pulse">
                Next up
              </span>
            )}

            {/* Verified proof badge */}
            {isDone && item.proof && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-[#15803D]" />
                <span>Verified</span>
              </span>
            )}
          </div>

          {/* Time estimate */}
          <div className="flex items-center space-x-1 text-[11px] text-[#64748B] font-mono bg-[#F5F7FA] px-2 py-0.5 rounded-md border border-[#DCE3EC]">
            <Clock className="w-3 h-3 text-[#64748B]" />
            <span>{item.estimated_hours}h</span>
          </div>
        </div>

        {/* Title & Checkbox */}
        <div className="flex items-start space-x-3">
          <button
            onClick={handleStartOrToggle}
            title={
              isDone
                ? 'Mark as incomplete'
                : isInProgress
                ? 'Submit proof to complete'
                : 'Click to start task'
            }
            className="mt-0.5 text-[#64748B] hover:text-[#142B4A] transition-transform active:scale-95 shrink-0"
            aria-label={isDone ? 'Task completed' : 'Mark task complete'}
          >
            {isDone ? (
              <CheckCircle2 className="w-5 h-5 text-[#15803D]" />
            ) : isInProgress ? (
              <div className="w-5 h-5 rounded-full border-2 border-[#315B8A] flex items-center justify-center bg-[#EAF0F7]">
                <div className="w-2 h-2 rounded-full bg-[#315B8A] animate-ping" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-[#DCE3EC] hover:border-[#315B8A] transition-colors" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h4
              className={`text-sm font-semibold tracking-tight leading-snug ${
                isDone ? 'line-through text-[#64748B]' : 'text-[#142B4A]'
              }`}
            >
              {item.title}
            </h4>

            {item.description && (
              <p className="text-xs text-[#475569] mt-1.5 leading-relaxed line-clamp-3">
                {item.description}
              </p>
            )}
          </div>
        </div>

        {/* Skill Gap Tag */}
        {item.target_improvement && (
          <div className="mt-3">
            <button
              onClick={handleSkillGapClick}
              className="group/gap inline-flex items-center space-x-1.5 text-[11px] bg-[#EAF0F7] hover:bg-[#DCE3EC] border border-[#DCE3EC] hover:border-[#315B8A] px-2.5 py-1 rounded-lg text-[#315B8A] font-medium transition-all"
            >
              <TrendingUp className="w-3 h-3 text-[#315B8A] group-hover/gap:translate-x-0.5 transition-transform" />
              <span className="truncate">{item.target_improvement}</span>
              <ChevronRight className="w-3 h-3 text-[#64748B] group-hover/gap:text-[#315B8A]" />
            </button>
          </div>
        )}

        {/* Learning Resources */}
        {resources.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-[#DCE3EC] space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Learning Resources
            </span>
            <div className="flex flex-wrap gap-2">
              {resources.map((res, idx) => {
                const resType = res.type?.toLowerCase();
                const Icon =
                  resType === 'video'
                    ? Video
                    : resType === 'practice'
                    ? Code2
                    : FileText;

                return (
                  <a
                    key={idx}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 text-[11px] bg-[#F5F7FA] hover:bg-[#EAF0F7] text-[#475569] hover:text-[#142B4A] px-2.5 py-1 rounded-md border border-[#DCE3EC] hover:border-[#315B8A] transition-colors"
                  >
                    <Icon className="w-3 h-3 text-[#315B8A] shrink-0" />
                    <span className="truncate max-w-[140px]">{res.title}</span>
                    <ExternalLink className="w-2.5 h-2.5 text-[#64748B] shrink-0" />
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-[#DCE3EC] flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          {/* Status button */}
          {isPending && (
            <button
              onClick={() => onStatusChange(item, 'in_progress')}
              className="px-3 py-1.5 rounded-xl bg-[#EAF0F7] hover:bg-[#142B4A] text-[#315B8A] hover:text-white border border-[#315B8A]/30 hover:border-[#142B4A] text-xs font-semibold transition-all flex items-center space-x-1"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Start</span>
            </button>
          )}

          {isInProgress && (
            <button
              onClick={() => onRequestProof(item)}
              className="px-3 py-1.5 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white shadow-sm text-xs font-semibold transition-all flex items-center space-x-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark Done</span>
            </button>
          )}

          {isDone && (
            <span className="text-[11px] font-semibold text-[#15803D] flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed</span>
            </span>
          )}
        </div>

        {/* Ask AI Coach button */}
        <button
          onClick={handleAskAICoach}
          className="px-2.5 py-1.5 rounded-xl bg-[#F5F7FA] hover:bg-[#EAF0F7] text-[#475569] hover:text-[#142B4A] border border-[#DCE3EC] hover:border-[#315B8A] text-[11px] font-medium transition-all flex items-center space-x-1.5"
          title="Open AI Coach with this task context"
        >
          <Bot className="w-3.5 h-3.5 text-[#315B8A]" />
          <span>Ask AI Coach</span>
        </button>
      </div>
    </div>
  );
};
