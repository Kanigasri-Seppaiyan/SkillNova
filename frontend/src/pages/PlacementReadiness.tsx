import React, { useState, useEffect } from 'react';
import { placementAPI } from '../services/api';
import { PlacementReadinessBreakdown } from '../types';
import { Card, ProgressBar, Badge, LoadingState, ErrorState } from '../components/common/UIComponents';
import { Award, AlertTriangle, CheckCircle2, Zap, FileText, Code2, Users, Flame } from 'lucide-react';

export const PlacementReadiness: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<PlacementReadinessBreakdown | null>(null);

  useEffect(() => {
    placementAPI
      .getBreakdown()
      .then(setBreakdown)
      .catch((err) => {
        console.error(err);
        setError('Failed to calculate placement readiness score.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Evaluating 7-component placement readiness model..." />;
  if (error) return <ErrorState message={error} />;

  const components = [
    { label: 'Skills Mastery (30%)', value: breakdown?.skills_score ?? 0, icon: Code2, colorClass: 'bg-[#315B8A]' },
    { label: 'Assessments Passed (20%)', value: breakdown?.assessments_score ?? 0, icon: CheckCircle2, colorClass: 'bg-[#15803D]' },
    { label: 'Projects Completed (15%)', value: breakdown?.projects_score ?? 0, icon: Zap, colorClass: 'bg-amber-600' },
    { label: 'Consistency Streak (10%)', value: breakdown?.consistency_score ?? 0, icon: Flame, colorClass: 'bg-[#B91C1C]' },
    { label: 'Mentor Endorsement (10%)', value: breakdown?.mentor_score ?? 0, icon: Users, colorClass: 'bg-[#1E3A5F]' },
    { label: 'Resume Parser Score (10%)', value: breakdown?.resume_score ?? 0, icon: FileText, colorClass: 'bg-sky-600' },
    { label: 'Mock Interview Score (5%)', value: breakdown?.mock_interview_score ?? 0, icon: Award, colorClass: 'bg-[#142B4A]' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#DCE3EC] p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-[#315B8A] text-xs font-bold mb-1">
            <Award className="w-4 h-4" />
            <span>Weighted Scoring Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#142B4A] tracking-tight">Placement Readiness Breakdown</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Never a bare number — always transparently computed from 7 critical career dimensions.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-[#F5F7FA] p-4 rounded-2xl border border-[#DCE3EC]">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-[#64748B] block">Overall Score</span>
            <span className="text-3xl font-extrabold text-[#142B4A]">
              {breakdown?.overall_score ?? 0}
            </span>
          </div>
          <Badge variant={breakdown?.readiness_tier === 'Ready' ? 'success' : breakdown?.readiness_tier === 'Almost Ready' ? 'info' : 'warning'}>
            {breakdown?.readiness_tier || 'Needs Work'}
          </Badge>
        </div>
      </div>

      {/* Limiter Warning Card */}
      {breakdown?.limiter_reason && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-[#92400E]">Primary Placement Bottleneck</h4>
            <p className="text-[#475569] mt-0.5">{breakdown.limiter_reason}</p>
          </div>
        </div>
      )}

      {/* 7 Component Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {components.map((comp, idx) => {
          const Icon = comp.icon;
          return (
            <Card key={idx} className="space-y-3 hover:border-[#315B8A]/50 transition-all">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-[#EAF0F7] rounded-xl text-[#315B8A]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-[#142B4A]">{comp.label}</h4>
                </div>
                <span className="text-sm font-extrabold text-[#142B4A]">{comp.value}%</span>
              </div>

              <ProgressBar value={comp.value} showPercent={false} colorClass={comp.colorClass} />
            </Card>
          );
        })}
      </div>

      {/* Recommendations List */}
      {breakdown?.recommendations && (
        <Card className="space-y-3">
          <h3 className="text-base font-bold text-[#142B4A] flex items-center space-x-2">
            <Zap className="w-4 h-4 text-[#315B8A]" />
            <span>AI Placement Acceleration Recommendations</span>
          </h3>

          <ul className="space-y-2">
            {breakdown.recommendations.map((rec, i) => (
              <li key={i} className="p-3 bg-[#F5F7FA] rounded-xl border border-[#DCE3EC] text-xs text-[#475569] flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};
