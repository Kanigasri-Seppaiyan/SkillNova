import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  placementAPI,
  skillsAPI,
  roadmapAPI,
  progressAPI,
  projectsAPI
} from '../services/api';
import {
  PlacementReadinessBreakdown,
  SkillGapAnalysis,
  Roadmap,
  WeeklyProgress,
  Project
} from '../types';
import {
  Card,
  ProgressBar,
  Badge,
  LoadingState,
  ErrorState,
  EmptyState
} from '../components/common/UIComponents';
import {
  Award,
  Target,
  Map,
  Zap,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [readiness, setReadiness] = useState<PlacementReadinessBreakdown | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [progressTrend, setProgressTrend] = useState<WeeklyProgress[]>([]);
  const [recommendedProjects, setRecommendedProjects] = useState<Project[]>([]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [readinessData, gapsData, roadmapData, trendData, projectsData] = await Promise.all([
        placementAPI.getBreakdown().catch(() => null),
        skillsAPI.getGapAnalysis().catch(() => null),
        roadmapAPI.get().catch(() => null),
        progressAPI.getTrend().catch(() => []),
        projectsAPI.getRecommended().catch(() => []),
      ]);

      setReadiness(readinessData);
      setGapAnalysis(gapsData);
      setRoadmap(roadmapData);
      setProgressTrend(Array.isArray(trendData) ? trendData : []);
      setRecommendedProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError('Unable to fetch live profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) return <LoadingState message="Connecting to Career Engine..." />;
  if (error) return <ErrorState message={error} onRetry={loadDashboardData} />;

  const safeTrend = Array.isArray(progressTrend) ? progressTrend : [];
  const chartData = safeTrend.map((pt, i) => ({
    week: `W${i + 1}`,
    score: pt.readiness_score,
    hours: pt.hours_spent
  }));

  const currentWeekItems = roadmap?.items.filter((item) => item.week_number === 1) || [];
  const safeProjects = Array.isArray(recommendedProjects) ? recommendedProjects : [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#DCE3EC] p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-[#315B8A] text-xs font-bold mb-1">
            <Sparkles className="w-4 h-4" />
            <span>AI-Driven Career Acceleration</span>
          </div>
          <h1 className="text-2xl font-black text-[#142B4A] tracking-tight">
            Welcome back, {user?.full_name}!
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Target Goal:{' '}
            <span className="text-[#142B4A] font-bold">
              {user?.profile?.target_role || 'Software Engineer'}
            </span>{' '}
            • Readiness Tier:{' '}
            <span className="text-[#142B4A] font-extrabold bg-[#EAF0F7] px-2 py-0.5 rounded border border-[#DCE3EC]">
              {readiness?.readiness_tier || 'Needs Work'}
            </span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/assessments"
            className="px-4 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5"
          >
            <Zap className="w-4 h-4" />
            <span>Verify Skill Level</span>
          </Link>
          <Link
            to="/roadmap"
            className="px-4 py-2.5 bg-white hover:bg-[#EAF0F7] text-[#142B4A] border border-[#142B4A] rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
          >
            <Map className="w-4 h-4" />
            <span>View Roadmap</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Live Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Placement Readiness */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Live Readiness</span>
                <h3 className="text-base font-bold text-[#142B4A]">Placement Score</h3>
              </div>
              <div className="p-2 bg-[#EAF0F7] rounded-xl text-[#142B4A]">
                <Award className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-baseline space-x-2 my-2">
              <span className="text-4xl font-black text-[#142B4A]">
                {readiness?.overall_score ?? 0}
              </span>
              <span className="text-xs text-[#64748B] font-bold">/ 100</span>
            </div>

            <ProgressBar value={readiness?.overall_score ?? 0} showPercent={false} colorClass="bg-[#142B4A]" />

            <div className="mt-4 p-3 bg-[#F5F7FA] rounded-xl border border-[#DCE3EC] text-xs space-y-1">
              <span className="text-[#64748B] font-medium block">Limiting Factor:</span>
              <p className="text-[#142B4A] font-semibold text-[11px]">
                {readiness?.limiter_reason || 'Complete assessments to identify limiters'}
              </p>
            </div>
          </div>

          <Link
            to="/placement-readiness"
            className="mt-4 pt-3 border-t border-[#DCE3EC] text-xs text-[#142B4A] hover:text-[#315B8A] font-bold flex items-center justify-between"
          >
            <span>View Full Breakdown</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </Card>

        {/* Card 2: Skill Gaps Overview */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Real-time Gaps</span>
                <h3 className="text-base font-bold text-[#142B4A]">Top Priority Skill Gap</h3>
              </div>
              <div className="p-2 bg-red-50 rounded-xl text-[#DC2626]">
                <Target className="w-5 h-5" />
              </div>
            </div>

            {gapAnalysis?.top_priority_skill ? (
              <div className="space-y-3">
                <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-[#142B4A]">
                      {gapAnalysis.top_priority_skill.skill_name}
                    </span>
                    <Badge variant="danger">
                      Gap: {gapAnalysis.top_priority_skill.gap_percentage}%
                    </Badge>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#64748B] mt-1 font-medium">
                    <span>Target: {gapAnalysis.top_priority_skill.required_level}/5</span>
                    <span>Current: {gapAnalysis.top_priority_skill.current_level}/5</span>
                  </div>
                </div>

                <div className="text-xs text-[#64748B]">
                  Total Skills Tracked:{' '}
                  <span className="text-[#142B4A] font-bold">
                    {gapAnalysis.met_skills_count} / {gapAnalysis.total_skills_count} Met
                  </span>
                </div>
              </div>
            ) : (
              <EmptyState title="No Critical Gaps" description="You are currently meeting all required skill baselines!" />
            )}
          </div>

          <Link
            to="/skills"
            className="mt-4 pt-3 border-t border-[#DCE3EC] text-xs text-[#142B4A] hover:text-[#315B8A] font-bold flex items-center justify-between"
          >
            <span>Explore All Skill Gaps</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </Card>

        {/* Card 3: Current Roadmap Week */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Active Horizon</span>
                <h3 className="text-base font-bold text-[#142B4A]">Roadmap Week 1</h3>
              </div>
              <div className="p-2 bg-[#EAF0F7] rounded-xl text-[#142B4A]">
                <Map className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-2 mb-3">
              {currentWeekItems.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-[#F5F7FA] rounded-xl border border-[#DCE3EC] flex items-center justify-between text-xs"
                >
                  <span className="truncate max-w-[180px] font-semibold text-[#142B4A]">
                    {item.title}
                  </span>
                  <Badge variant={item.status === 'completed' ? 'success' : 'secondary'}>
                    {item.status || 'pending'}
                  </Badge>
                </div>
              ))}
              {currentWeekItems.length === 0 && (
                <p className="text-xs text-[#64748B] py-3 text-center">No tasks scheduled for Week 1.</p>
              )}
            </div>
          </div>

          <Link
            to="/roadmap"
            className="mt-4 pt-3 border-t border-[#DCE3EC] text-xs text-[#142B4A] hover:text-[#315B8A] font-bold flex items-center justify-between"
          >
            <span>Open Adaptive Roadmap</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </Card>
      </div>

      {/* Two Column Section: Progress Trend & Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart (2 columns) */}
        <Card className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-[#142B4A]">Readiness Trend Progression</h3>
              <p className="text-xs text-[#64748B]">Weekly placement score improvements</p>
            </div>
            <div className="flex items-center space-x-2 text-xs font-bold text-[#142B4A] bg-[#EAF0F7] px-3 py-1 rounded-full border border-[#DCE3EC]">
              <span>Live Progress</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#142B4A" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#142B4A" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#DCE3EC',
                    borderRadius: '0.75rem',
                    color: '#142B4A',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(20, 43, 74, 0.08)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#142B4A"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#scoreGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recommended Projects (1 column) */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-[#142B4A]">Recommended Projects</h3>
                <p className="text-xs text-[#64748B]">Tailored to fill gaps</p>
              </div>
            </div>

            <div className="space-y-3">
              {safeProjects.slice(0, 3).map((proj) => (
                <div key={proj.id} className="p-3 bg-[#F5F7FA] rounded-xl border border-[#DCE3EC] hover:border-[#142B4A] transition-all">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-xs font-bold text-[#142B4A] truncate max-w-[160px]">
                      {proj.title}
                    </h4>
                    <Badge variant={proj.difficulty === 'Beginner' ? 'success' : proj.difficulty === 'Intermediate' ? 'warning' : 'danger'}>
                      {proj.difficulty}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#64748B] line-clamp-2">{proj.description}</p>
                </div>
              ))}
              {safeProjects.length === 0 && (
                <p className="text-xs text-[#64748B] py-4 text-center">No projects assigned yet.</p>
              )}
            </div>
          </div>

          <Link
            to="/projects"
            className="mt-4 pt-3 border-t border-[#DCE3EC] text-xs text-[#142B4A] hover:text-[#315B8A] font-bold flex items-center justify-between"
          >
            <span>Explore All Projects</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </Card>
      </div>
    </div>
  );
};
