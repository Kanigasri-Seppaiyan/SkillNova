import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import { Project } from '../types';
import { Card, Badge, LoadingState, ErrorState, EmptyState } from '../components/common/UIComponents';
import {
  FolderGit2,
  Clock,
  CheckCircle2,
  PlayCircle,
  ArrowRight,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [startingId, setStartingId] = useState<number | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectsAPI.getRecommended();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch project recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleStartProject = async (projectId: number) => {
    setStartingId(projectId);
    try {
      await projectsAPI.startProject(projectId);
    } catch (err) {
      console.error(err);
    } finally {
      setStartingId(null);
      navigate(`/projects/${projectId}`);
    }
  };

  if (loading) return <LoadingState message="Matching projects to your skill gaps..." />;
  if (error) return <ErrorState message={error} onRetry={loadProjects} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#DCE3EC] p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-[#315B8A] text-xs font-bold mb-1">
            <FolderGit2 className="w-4 h-4" />
            <span>Gap-Driven Portfolio Engine</span>
          </div>
          <h1 className="text-2xl font-black text-[#142B4A] tracking-tight">Recommended Projects</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Select a project to open its dedicated implementation workspace, milestone checklists, and setup roadmap.
          </p>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((proj) => {
          const status = proj.student_status || 'not_started';
          const progressPct = proj.progress_pct || 0;
          const isStarting = startingId === proj.id;

          return (
            <Card
              key={proj.id}
              className="flex flex-col justify-between hover:border-[#315B8A]/50 transition-all duration-200 group"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <Badge
                    variant={
                      proj.difficulty?.toLowerCase() === 'beginner'
                        ? 'success'
                        : proj.difficulty?.toLowerCase() === 'intermediate'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {proj.difficulty}
                  </Badge>

                  <div className="flex items-center space-x-1 text-xs text-[#64748B] font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{proj.estimated_hours} hrs</span>
                  </div>
                </div>

                <Link
                  to={`/projects/${proj.id}`}
                  className="block text-base font-bold text-[#142B4A] group-hover:text-[#315B8A] transition-colors"
                >
                  {proj.title}
                </Link>

                <p className="text-xs text-[#475569] line-clamp-3 leading-relaxed">
                  {proj.description}
                </p>

                {/* Progress bar if in progress or completed */}
                {status !== 'not_started' && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] font-bold text-[#142B4A]">
                      <span>Progress</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="w-full bg-[#EAF0F7] h-2 rounded-full overflow-hidden border border-[#DCE3EC]">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          status === 'completed' ? 'bg-emerald-600' : 'bg-[#142B4A]'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Tech Stack Pills */}
                <div className="space-y-1.5 pt-2 border-t border-[#DCE3EC]">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                    Tech Stack
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {proj.tech_stack?.map((tech, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-[#EAF0F7] text-[#142B4A] border border-[#DCE3EC] rounded text-[10px] font-mono font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-[#DCE3EC]">
                {status === 'not_started' && (
                  <button
                    onClick={() => handleStartProject(proj.id)}
                    disabled={isStarting}
                    className="w-full py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>{isStarting ? 'Starting...' : 'Start Project'}</span>
                  </button>
                )}

                {status === 'in_progress' && (
                  <button
                    onClick={() => navigate(`/projects/${proj.id}`)}
                    className="w-full py-2.5 bg-[#1E3A5F] hover:bg-[#142B4A] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center space-x-2"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Continue Project ({progressPct}%)</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                )}

                {status === 'completed' && (
                  <button
                    onClick={() => navigate(`/projects/${proj.id}`)}
                    className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Completed · View Details</span>
                  </button>
                )}
              </div>
            </Card>
          );
        })}

        {projects.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              title="No Projects Found"
              description="All available projects match your current skill setup."
            />
          </div>
        )}
      </div>
    </div>
  );
};
