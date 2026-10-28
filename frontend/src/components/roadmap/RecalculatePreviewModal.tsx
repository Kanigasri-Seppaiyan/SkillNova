import React from 'react';
import { Modal } from '../common/UIComponents';
import {
  RefreshCw,
  ArrowRight,
  PlusCircle,
  MinusCircle,
  MoveRight,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export interface RecalculatePreviewData {
  addedTasks: string[];
  removedTasks: string[];
  movedTasks: Array<{ task: string; fromWeek: number; toWeek: number }>;
  hoursDiff: number;
  newTotalHours: number;
  reason: string;
}

interface RecalculatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  previewData: RecalculatePreviewData | null;
  loading: boolean;
}

export const RecalculatePreviewModal: React.FC<RecalculatePreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  previewData,
  loading,
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Roadmap Recalculation Preview">
      <div className="space-y-5">
        {/* Info banner */}
        <div className="bg-[#EAF0F7] border border-[#315B8A]/20 rounded-2xl p-4 flex items-start space-x-3">
          <Sparkles className="w-5 h-5 text-[#315B8A] shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-[#142B4A]">Adaptive AI Trajectory Adjustments</h4>
            <p className="text-[#475569] mt-1">
              {previewData?.reason ||
                'Recalculation synchronizes your live skill assessments, completed tasks, and target job competencies.'}
            </p>
          </div>
        </div>

        {/* Hours & Scope Diff Strip */}
        {previewData && (
          <div className="grid grid-cols-2 gap-3 bg-[#F5F7FA] p-3 rounded-2xl border border-[#DCE3EC] text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#64748B] block">
                Hours Commitment Delta
              </span>
              <span
                className={`text-sm font-extrabold ${
                  previewData.hoursDiff <= 0 ? 'text-[#15803D]' : 'text-amber-700'
                }`}
              >
                {previewData.hoursDiff > 0 ? `+${previewData.hoursDiff}h` : `${previewData.hoursDiff}h`} ({previewData.newTotalHours}h total)
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-[#64748B] block">
                Tasks Shifted
              </span>
              <span className="text-sm font-extrabold text-[#315B8A]">
                {previewData.movedTasks.length} tasks rescheduled
              </span>
            </div>
          </div>
        )}

        {/* Detailed Changes List */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 text-xs">
          {/* Added Tasks */}
          {previewData && previewData.addedTasks.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#15803D] flex items-center space-x-1">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Added Reinforcement Tasks ({previewData.addedTasks.length})</span>
              </span>
              <div className="space-y-1 pl-4">
                {previewData.addedTasks.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px]"
                  >
                    + {t}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Moved Tasks */}
          {previewData && previewData.movedTasks.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#315B8A] flex items-center space-x-1">
                <MoveRight className="w-3.5 h-3.5" />
                <span>Paced &amp; Reordered Tasks ({previewData.movedTasks.length})</span>
              </span>
              <div className="space-y-1 pl-4">
                {previewData.movedTasks.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-[11px] flex items-center justify-between"
                  >
                    <span className="truncate max-w-[240px]">{m.task}</span>
                    <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-[#DCE3EC] text-[#142B4A]">
                      W{m.fromWeek} → W{m.toWeek}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Removed Tasks */}
          {previewData && previewData.removedTasks.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#64748B] flex items-center space-x-1">
                <MinusCircle className="w-3.5 h-3.5" />
                <span>Pruned Redundancies ({previewData.removedTasks.length})</span>
              </span>
              <div className="space-y-1 pl-4">
                {previewData.removedTasks.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-[#F5F7FA] border border-[#DCE3EC] text-[#64748B] text-[11px] line-through"
                  >
                    - {t}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#DCE3EC]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-white hover:bg-[#EAF0F7] border border-[#DCE3EC] text-[#64748B] hover:text-[#142B4A] font-semibold text-xs transition-colors disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-[#142B4A] hover:bg-[#1E3A5F] disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Confirm &amp; Apply Changes</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
