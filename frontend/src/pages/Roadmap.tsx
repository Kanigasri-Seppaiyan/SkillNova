import React, { useState, useEffect, useMemo } from 'react';
import { roadmapAPI } from '../services/api';
import { Roadmap as RoadmapType, RoadmapItem, ProofData } from '../types';
import { LoadingState, ErrorState, EmptyState } from '../components/common/UIComponents';
import { WeekSection } from '../components/roadmap/WeekSection';
import { PhaseHeader, PhaseMilestone } from '../components/roadmap/PhaseHeader';
import { ProgressSummary } from '../components/roadmap/ProgressSummary';
import { ProofModal } from '../components/roadmap/ProofModal';
import { ScheduleAlert } from '../components/roadmap/ScheduleAlert';
import {
  RecalculatePreviewModal,
  RecalculatePreviewData
} from '../components/roadmap/RecalculatePreviewModal';
import { TimelineStrip } from '../components/roadmap/TimelineStrip';
import { Confetti } from '../components/roadmap/Confetti';
import {
  Map,
  RefreshCw,
  Sparkles,
  Filter,
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';

type FilterType = 'all' | 'learn' | 'practice' | 'build' | 'interview_prep';

interface PhaseGroup {
  name: string;
  number: number;
  weeksRange: string;
  description: string;
  milestone: string;
  weeks: number[];
}

const PHASES: PhaseGroup[] = [
  {
    name: 'Foundations & Architecture',
    number: 1,
    weeksRange: 'Weeks 1–3',
    description: 'Master core systems, database indexing internals, REST contracts, and scalable concurrency basics.',
    milestone: 'Week 3 Milestone: Core Architecture Foundations Mastered',
    weeks: [1, 2, 3]
  },
  {
    name: 'Backend & Distributed Systems',
    number: 2,
    weeksRange: 'Weeks 4–6',
    description: 'Build event-driven microservices, saga transactions, database sharding, and high-performance RPC.',
    milestone: 'Week 6 Milestone: Ready for Tier-1 Backend Engineering Rounds',
    weeks: [4, 5, 6]
  },
  {
    name: 'Systems & Scalability',
    number: 3,
    weeksRange: 'Weeks 7–9',
    description: 'Distributed tracing, Kubernetes orchestration, resilience patterns, and cloud fault tolerance.',
    milestone: 'Week 9 Milestone: High-Scale Systems & Cloud Architecture Ready',
    weeks: [7, 8, 9]
  },
  {
    name: 'Interview Prep & Capstone Mastery',
    number: 4,
    weeksRange: 'Weeks 10–12',
    description: 'Whiteboard system design interviews, multi-threading deep dives, and FAANG bar-raiser mocks.',
    milestone: 'Week 12 Milestone: Placement Ready (Target Top Tier Tech Offer)',
    weeks: [10, 11, 12]
  }
];

export const Roadmap: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapType | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [adaptiveLoading, setAdaptiveLoading] = useState(false);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Proof Modal state
  const [proofModalItem, setProofModalItem] = useState<RoadmapItem | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);

  // Recalculate Preview Modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<RecalculatePreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Confetti trigger
  const [showConfetti, setShowConfetti] = useState(false);

  const loadRoadmap = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await roadmapAPI.get();
      setRoadmap(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch career roadmap.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoadmap();
  }, []);

  // Compute real derived metrics directly from the items list
  const allItems = useMemo(() => roadmap?.items || [], [roadmap]);
  const totalItemsCount = allItems.length;
  const completedItemsCount = allItems.filter((i) => i.status === 'completed').length;
  const totalHoursCount = allItems.reduce((acc, curr) => acc + (curr.estimated_hours || 0), 0);
  const completedHoursCount = allItems
    .filter((i) => i.status === 'completed')
    .reduce((acc, curr) => acc + (curr.estimated_hours || 0), 0);

  // Items mapped by week (1 to 12)
  const itemsByWeek = useMemo(() => {
    const map: Record<number, RoadmapItem[]> = {};
    for (let w = 1; w <= 12; w++) {
      map[w] = [];
    }
    allItems.forEach((item) => {
      if (!map[item.week_number]) {
        map[item.week_number] = [];
      }
      map[item.week_number].push(item);
    });
    return map;
  }, [allItems]);

  // Determine the active week: the first week that still has incomplete tasks
  const activeWeekNum = useMemo(() => {
    for (let w = 1; w <= 12; w++) {
      const weekTasks = itemsByWeek[w] || [];
      if (weekTasks.length > 0 && weekTasks.some((t) => t.status !== 'completed')) {
        return w;
      }
    }
    return 1;
  }, [itemsByWeek]);

  // Find the immediate "Next Up" task across the active week
  const nextUpTaskId = useMemo(() => {
    const activeTasks = itemsByWeek[activeWeekNum] || [];
    const firstIncomplete = activeTasks.find((t) => t.status !== 'completed');
    return firstIncomplete?.id;
  }, [itemsByWeek, activeWeekNum]);

  // Stats for the active week
  const activeWeekTasks = itemsByWeek[activeWeekNum] || [];
  const activeWeekDoneTasks = activeWeekTasks.filter((t) => t.status === 'completed').length;
  const activeWeekTotalHours = activeWeekTasks.reduce((acc, curr) => acc + (curr.estimated_hours || 0), 0);
  const activeWeekDoneHours = activeWeekTasks
    .filter((t) => t.status === 'completed')
    .reduce((acc, curr) => acc + (curr.estimated_hours || 0), 0);

  // Status mapping for timeline strip
  const weeksTimelineStatus = useMemo(() => {
    const statusMap: Record<number, { isComplete: boolean; isLocked: boolean; itemCount: number }> = {};
    for (let w = 1; w <= 12; w++) {
      const tasks = itemsByWeek[w] || [];
      const isComplete = tasks.length > 0 && tasks.every((t) => t.status === 'completed');
      const isLocked = w > activeWeekNum && !isComplete;
      statusMap[w] = {
        isComplete,
        isLocked,
        itemCount: tasks.length
      };
    }
    return statusMap;
  }, [itemsByWeek, activeWeekNum]);

  // Status toggle handler
  const handleStatusChange = async (
    item: RoadmapItem,
    newStatus: 'pending' | 'in_progress' | 'completed'
  ) => {
    try {
      await roadmapAPI.updateItemStatus(item.id, newStatus);
      // Optimistically update local state
      setRoadmap((prev) => {
        if (!prev) return prev;
        const updatedItems = prev.items.map((i) =>
          i.id === item.id ? { ...i, status: newStatus } : i
        );
        return { ...prev, items: updatedItems };
      });
    } catch (err) {
      console.error(err);
      loadRoadmap();
    }
  };

  // Proof submission handler
  const handleRequestProof = (item: RoadmapItem) => {
    setProofModalItem(item);
    setIsProofModalOpen(true);
  };

  const handleConfirmProof = async (item: RoadmapItem, proof: ProofData) => {
    try {
      await roadmapAPI.updateItemStatus(item.id, 'completed', proof);

      // Check if this action completes the entire week!
      const weekTasks = itemsByWeek[item.week_number] || [];
      const remainingIncomplete = weekTasks.filter(
        (t) => t.id !== item.id && t.status !== 'completed'
      );

      if (remainingIncomplete.length === 0) {
        setShowConfetti(true);
      }

      setRoadmap((prev) => {
        if (!prev) return prev;
        const updatedItems = prev.items.map((i) =>
          i.id === item.id
            ? { ...i, status: 'completed' as const, proof, completed_at: new Date().toISOString() }
            : i
        );
        return { ...prev, items: updatedItems };
      });
    } catch (err) {
      console.error(err);
      loadRoadmap();
    }
  };

  // Recalculate preview handlers
  const handleOpenRecalculateModal = async () => {
    setLoadingPreview(true);
    setIsPreviewModalOpen(true);
    try {
      const preview = await roadmapAPI.getRecalculatePreview();
      setPreviewData(preview);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleApplyRecalculate = async () => {
    setRecalculating(true);
    try {
      const updated = await roadmapAPI.recalculate();
      setRoadmap(updated);
      setIsPreviewModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setRecalculating(false);
    }
  };

  // Adaptive Horizon Actions
  const handleAdaptiveAction = async (action: 'compress' | 'extend') => {
    setAdaptiveLoading(true);
    try {
      await roadmapAPI.applyAdaptiveAction(action);
      setRoadmap((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          days_behind: 0,
          total_weeks: action === 'extend' ? (prev.total_weeks || 12) + 1 : prev.total_weeks
        };
      });
    } catch (err) {
      console.error(err);
    } finally {
      setAdaptiveLoading(false);
    }
  };

  const handleScrollToWeek = (weekNum: number) => {
    const el = document.getElementById(`week-${weekNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) return <LoadingState message="Loading your adaptive learning path..." />;
  if (error) return <ErrorState message={error} onRetry={loadRoadmap} />;

  const daysBehind = roadmap?.days_behind ?? (completedItemsCount < 4 ? 3 : 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Confetti celebration effect */}
      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#DCE3EC] p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-[#315B8A] text-xs font-bold mb-1">
            <Map className="w-4 h-4" />
            <span>Adaptive Horizon</span>
          </div>
          <h1 className="text-2xl font-black text-[#142B4A] tracking-tight">
            Adaptive Career Roadmap
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Target Role:{' '}
            <span className="text-[#142B4A] font-bold">
              {roadmap?.target_role || 'Software Engineer'}
            </span>{' '}
            • Horizon:{' '}
            <span className="text-[#315B8A] font-extrabold">
              {roadmap?.total_weeks || 12} Weeks
            </span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleOpenRecalculateModal}
            disabled={recalculating}
            className="px-4 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
            <span>Recalculate Roadmap</span>
          </button>
        </div>
      </div>

      {/* Mini 12-Week Timeline Strip */}
      <TimelineStrip
        totalWeeks={12}
        activeWeekNum={activeWeekNum}
        weeksStatus={weeksTimelineStatus}
        onSelectWeek={handleScrollToWeek}
      />

      {/* Adaptive Behind Schedule Alert */}
      {daysBehind > 0 && (
        <ScheduleAlert
          daysBehind={daysBehind}
          loading={adaptiveLoading}
          onCompress={() => handleAdaptiveAction('compress')}
          onExtend={() => handleAdaptiveAction('extend')}
        />
      )}

      {/* Progress & Weekly Stats Strip */}
      <ProgressSummary
        totalItems={totalItemsCount}
        completedItems={completedItemsCount}
        totalHours={totalHoursCount}
        completedHours={completedHoursCount}
        activeWeekNum={activeWeekNum}
        activeWeekTotalHours={activeWeekTotalHours}
        activeWeekDoneHours={activeWeekDoneHours}
        activeWeekDoneTasks={activeWeekDoneTasks}
        activeWeekTotalTasks={activeWeekTasks.length}
        streakDays={roadmap?.streak_days || 5}
      />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#DCE3EC] p-3 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-2 text-xs text-[#64748B] font-semibold px-2">
          <Filter className="w-3.5 h-3.5 text-[#315B8A]" />
          <span>Filter Tasks:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: 'All Tasks' },
              { id: 'learn', label: 'Learn' },
              { id: 'practice', label: 'Practice' },
              { id: 'build', label: 'Build' },
              { id: 'interview_prep', label: 'Interview Prep' }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeFilter === tab.id
                  ? 'bg-[#142B4A] text-white shadow-sm'
                  : 'bg-[#F5F7FA] hover:bg-[#EAF0F7] text-[#475569] hover:text-[#142B4A] border border-[#DCE3EC]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Phases & 12 Weeks Section Grid */}
      <div className="space-y-8">
        {PHASES.map((phase) => {
          // Gather tasks for this phase
          const phaseTasks = phase.weeks.flatMap((w) => itemsByWeek[w] || []);
          const phaseCompleted = phaseTasks.filter((t) => t.status === 'completed').length;
          const isPhaseAchieved = phaseTasks.length > 0 && phaseCompleted === phaseTasks.length;

          return (
            <div key={phase.number} className="space-y-4">
              <PhaseHeader
                phaseName={phase.name}
                phaseNumber={phase.number}
                weeksRange={phase.weeksRange}
                description={phase.description}
                completedTasks={phaseCompleted}
                totalTasks={phaseTasks.length}
              />

              {/* Weeks inside this phase */}
              <div className="space-y-4">
                {phase.weeks.map((weekNum) => {
                  const rawWeekItems = itemsByWeek[weekNum] || [];
                  const filteredItems =
                    activeFilter === 'all'
                      ? rawWeekItems
                      : rawWeekItems.filter((i) => {
                          const itemType = (i.item_type || i.type || 'learn').toLowerCase();
                          return itemType === activeFilter;
                        });

                  const isWeekActive = weekNum === activeWeekNum;
                  const isWeekComplete =
                    rawWeekItems.length > 0 &&
                    rawWeekItems.every((item) => item.status === 'completed');
                  const isWeekLocked = weekNum > activeWeekNum && !isWeekComplete;

                  return (
                    <WeekSection
                      key={weekNum}
                      weekNum={weekNum}
                      items={filteredItems}
                      isActiveWeek={isWeekActive}
                      isLocked={isWeekLocked}
                      isFullyDone={isWeekComplete}
                      nextUpTaskId={nextUpTaskId}
                      onStatusChange={handleStatusChange}
                      onRequestProof={handleRequestProof}
                      onStartNextWeek={() => handleScrollToWeek(weekNum + 1)}
                    />
                  );
                })}
              </div>

              {/* Phase Milestone Marker */}
              <PhaseMilestone
                milestone={phase.milestone}
                isAchieved={isPhaseAchieved}
              />
            </div>
          );
        })}
      </div>

      {/* Verification Proof Modal */}
      <ProofModal
        item={proofModalItem}
        isOpen={isProofModalOpen}
        onClose={() => {
          setIsProofModalOpen(false);
          setProofModalItem(null);
        }}
        onSubmitProof={handleConfirmProof}
      />

      {/* Recalculate Preview Modal */}
      <RecalculatePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        onConfirm={handleApplyRecalculate}
        previewData={previewData}
        loading={recalculating || loadingPreview}
      />
    </div>
  );
};
