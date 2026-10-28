import React, { useState, useEffect } from 'react';
import { skillsAPI } from '../services/api';
import { StudentSkill, SkillGapAnalysis } from '../types';
import { Card, ProgressBar, Badge, LoadingState, ErrorState, Modal } from '../components/common/UIComponents';
import { Target, Award, Sparkles, Sliders, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const Skills: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mySkills, setMySkills] = useState<StudentSkill[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<SkillGapAnalysis | null>(null);

  const [selectedSkill, setSelectedSkill] = useState<StudentSkill | null>(null);
  const [newRating, setNewRating] = useState<number>(3);
  const [updating, setUpdating] = useState(false);

  const loadSkillsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [skillsData, gapsData] = await Promise.all([
        skillsAPI.getMySkills(),
        skillsAPI.getGapAnalysis()
      ]);
      setMySkills(skillsData);
      setGapAnalysis(gapsData);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch skill gap analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkillsData();
  }, []);

  const handleUpdateRating = async () => {
    if (!selectedSkill) return;
    setUpdating(true);
    try {
      await skillsAPI.updateSelfRating(selectedSkill.skill_id, newRating);
      setSelectedSkill(null);
      await loadSkillsData();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <LoadingState message="Calculating blended skill scores..." />;
  if (error) return <ErrorState message={error} onRetry={loadSkillsData} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#DCE3EC] p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-[#315B8A] text-xs font-bold mb-1">
            <Target className="w-4 h-4" />
            <span>Blended Level Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#142B4A] tracking-tight">Skill Gaps &amp; Matrix</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Blended Level Formula: <span className="text-[#315B8A] font-semibold">0.4 × Self Rating + 0.6 × Verified Assessment Score</span>
          </p>
        </div>

        <div className="flex items-center space-x-4 bg-[#F5F7FA] p-3 rounded-2xl border border-[#DCE3EC]">
          <div className="text-center px-2">
            <span className="text-xs text-[#64748B] block font-medium">Overall Gap</span>
            <span className="text-lg font-extrabold text-[#B91C1C]">
              {gapAnalysis?.overall_gap_percentage ?? 0}%
            </span>
          </div>
          <div className="h-8 w-px bg-[#DCE3EC]" />
          <div className="text-center px-2">
            <span className="text-xs text-[#64748B] block font-medium">Met Skills</span>
            <span className="text-lg font-extrabold text-[#15803D]">
              {gapAnalysis?.met_skills_count} / {gapAnalysis?.total_skills_count}
            </span>
          </div>
        </div>
      </div>

      {/* Gap Analysis Priority List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <h3 className="text-base font-bold text-[#142B4A] flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-[#B91C1C]" />
            <span>Skill Gap Breakdown</span>
          </h3>

          <div className="space-y-3">
            {gapAnalysis?.gaps.map((gap) => (
              <div
                key={gap.skill_id}
                className="p-3.5 bg-[#F5F7FA] rounded-xl border border-[#DCE3EC] hover:border-[#315B8A] transition-all space-y-2"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-[#142B4A]">{gap.skill_name}</h4>
                    <span className="text-[10px] text-[#475569]">{gap.category}</span>
                  </div>
                  <Badge variant={gap.status === 'critical' ? 'danger' : gap.status === 'moderate' ? 'warning' : 'success'}>
                    {gap.status.toUpperCase()} ({gap.gap_percentage}% Gap)
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#475569]">
                  <div>Required Baseline: <span className="text-[#142B4A] font-semibold">{gap.required_level}/5</span></div>
                  <div>Current Blended: <span className="text-[#1E3A5F] font-bold">{gap.current_level}/5</span></div>
                </div>

                <ProgressBar value={(gap.current_level / gap.required_level) * 100} showPercent={false} />
              </div>
            ))}
          </div>
        </Card>

        {/* All Tracked Student Skills */}
        <Card className="space-y-4">
          <h3 className="text-base font-bold text-[#142B4A] flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#315B8A]" />
            <span>Tracked Skills &amp; Self Rating</span>
          </h3>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {mySkills.map((sk) => (
              <div
                key={sk.id}
                className="p-3.5 bg-[#F5F7FA] rounded-xl border border-[#DCE3EC] flex items-center justify-between hover:border-[#315B8A] transition-all"
              >
                <div>
                  <h4 className="text-xs font-bold text-[#142B4A]">{sk.skill?.name || `Skill #${sk.skill_id}`}</h4>
                  <div className="flex space-x-3 text-[10px] text-[#475569] mt-1">
                    <span>Self: <strong className="text-[#142B4A]">{sk.self_rating}/5</strong></span>
                    <span>Verified: <strong className="text-[#15803D]">{sk.verified_level}/5</strong></span>
                    <span>Blended: <strong className="text-[#1E3A5F]">{sk.blended_level}/5</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedSkill(sk);
                    setNewRating(sk.self_rating);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-[#EAF0F7] border border-[#DCE3EC] text-[#142B4A] rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#315B8A]" />
                  <span>Update</span>
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Edit Self Rating Modal */}
      <Modal
        isOpen={!!selectedSkill}
        onClose={() => setSelectedSkill(null)}
        title={`Update Self Rating: ${selectedSkill?.skill?.name || ''}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-[#64748B]">
            Adjusting your self-rating will update your blended score (40% self + 60% assessment).
          </p>

          <div className="flex justify-center space-x-2 my-4">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setNewRating(lvl)}
                className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                  newRating === lvl
                    ? 'bg-[#142B4A] text-white shadow-lg'
                    : 'bg-[#F5F7FA] text-[#475569] border border-[#DCE3EC] hover:bg-[#EAF0F7] hover:text-[#142B4A]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[#DCE3EC]">
            <button
              onClick={() => setSelectedSkill(null)}
              className="px-4 py-2 bg-white hover:bg-[#EAF0F7] border border-[#DCE3EC] text-[#64748B] rounded-xl text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateRating}
              disabled={updating}
              className="px-4 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-60"
            >
              {updating ? 'Saving...' : 'Save & Recalculate Gaps'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
