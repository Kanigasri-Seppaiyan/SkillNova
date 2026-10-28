import React, { useState, useEffect } from 'react';
import { careerAPI } from '../services/api';
import { Card, Badge, LoadingState, ErrorState } from '../components/common/UIComponents';
import { Compass, Users, CheckCircle2, Circle, ArrowRight, Sparkles, TrendingUp } from 'lucide-react';

export const CareerGPS: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gpsData, setGpsData] = useState<any>(null);
  const [twinData, setTwinData] = useState<any>(null);

  useEffect(() => {
    Promise.all([careerAPI.getGPS(), careerAPI.getTwin()])
      .then(([gps, twin]) => {
        setGpsData(gps);
        setTwinData(twin);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load Career GPS & Career Twin metrics.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Mapping Career GPS trajectory & simulating peer twin..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#DCE3EC] p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-[#315B8A] text-xs font-bold mb-1">
            <Compass className="w-4 h-4" />
            <span>Navigation & Benchmarking</span>
          </div>
          <h1 className="text-2xl font-black text-[#142B4A] tracking-tight">Career GPS & Twin Simulator</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Track your milestones visually and compare your trajectory against successful cohort peers.
          </p>
        </div>
      </div>

      {/* Section 1: Career GPS Visual Journey */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#142B4A] flex items-center space-x-2">
          <Compass className="w-5 h-5 text-[#315B8A]" />
          <span>Milestone Horizon (Career GPS)</span>
        </h2>

        <div className="relative pl-6 border-l-2 border-[#DCE3EC] space-y-6">
          {gpsData?.milestones?.map((m: any, idx: number) => {
            const isDone = m.status === 'completed';
            const isCurrent = m.status === 'current';
            return (
              <div key={idx} className="relative group">
                <div
                  className={`absolute -left-[31px] top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isDone
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-[#142B4A] border-[#315B8A] text-white ring-4 ring-[#142B4A]/10'
                      : 'bg-white border-[#DCE3EC] text-[#64748B]'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-3 h-3 fill-current text-[#DCE3EC]" />}
                </div>

                <Card className={`p-4 transition-all bg-white border border-[#DCE3EC] ${isCurrent ? 'border-[#315B8A] ring-1 ring-[#315B8A]/30 shadow-md' : 'shadow-sm'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                        Phase {idx + 1} • {m.timeline || `Week ${idx + 1}`}
                      </span>
                      <h4 className="text-sm font-bold text-[#142B4A] mt-0.5">{m.title}</h4>
                      <p className="text-xs text-[#475569] mt-1">{m.description}</p>
                    </div>

                    <Badge variant={isDone ? 'success' : isCurrent ? 'info' : 'secondary'}>
                      {m.status.toUpperCase()}
                    </Badge>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Career Twin Peer Benchmark */}
      <div className="space-y-4 pt-4 border-t border-[#DCE3EC]">
        <h2 className="text-lg font-bold text-[#142B4A] flex items-center space-x-2">
          <Users className="w-5 h-5 text-[#142B4A]" />
          <span>Career Twin Benchmark (Peer Cohort Comparison)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Card: Matched Peer Model */}
          <Card className="bg-white border border-[#DCE3EC] space-y-4 shadow-sm hover:border-[#315B8A]/60">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs text-[#64748B] font-semibold">Matched Peer Model</span>
                <h3 className="text-base font-bold text-[#142B4A]">{twinData?.twin_name || 'Placed Peer Prototype'}</h3>
              </div>
              <Badge variant="success">{twinData?.placement_result || 'Placed Tier 1'}</Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-2.5 bg-[#F1F5F9] rounded-xl border border-[#DCE3EC]">
                <span className="text-[#475569] font-medium">Target Role:</span>
                <span className="font-bold text-[#142B4A]">{twinData?.target_role || 'Software Engineer'}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-[#F1F5F9] rounded-xl border border-[#DCE3EC]">
                <span className="text-[#475569] font-medium">Twin Readiness Score:</span>
                <span className="font-bold text-[#142B4A] text-sm">{twinData?.twin_readiness_score || 88}%</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-[#F1F5F9] rounded-xl border border-[#DCE3EC]">
                <span className="text-[#475569] font-medium">Projects Completed:</span>
                <span className="font-bold text-[#142B4A] text-sm">{twinData?.twin_projects_completed || 4}</span>
              </div>
            </div>
          </Card>

          {/* Right Card: Key Twin Takeaway Insights */}
          <Card className="bg-white border border-[#DCE3EC] space-y-4 shadow-sm hover:border-[#315B8A]/60">
            <h3 className="text-base font-bold text-[#142B4A] flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#142B4A]" />
              <span>Key Twin Takeaway Insights</span>
            </h3>

            <p className="text-xs text-[#475569] leading-relaxed font-normal">
              {twinData?.insight_summary ||
                'Students who successfully placed in Tier 1 roles completed at least 3 verified assessments and maintained an active weekly coding streak of >4 hours.'}
            </p>

            <div className="p-3 bg-[#EAF0F7] border border-[#C7D7EA] rounded-xl text-xs text-[#142B4A]">
              <strong className="text-[#142B4A]">Actionable Step:</strong> Complete 1 more project in your priority gap area to match your twin's portfolio strength.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
