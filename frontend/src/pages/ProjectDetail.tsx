import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import { ProjectDetail as IProjectDetail, ProjectMilestone } from '../types';
import { Card, Badge, LoadingState, ErrorState } from '../components/common/UIComponents';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Code2,
  ExternalLink,
  FolderGit2,
  Github,
  Layers,
  ListChecks,
  PlayCircle,
  Save,
  Sparkles,
  Terminal,
  AlertCircle,
  BookOpen,
  Wrench,
  CheckCheck,
  ChevronRight,
  Loader2,
  FileText,
  Flag,
} from 'lucide-react';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<IProjectDetail | null>(null);

  // Tracking state
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [completedMilestones, setCompletedMilestones] = useState<number[]>([]);
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<string>('in_progress');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const projectId = Number(id);

  const fetchProjectDetails = async () => {
    if (isNaN(projectId)) {
      setError('Invalid Project ID');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await projectsAPI.getById(projectId);
      setProject(data);

      // Hydrate student progress
      setCompletedTasks(data.completed_tasks || []);
      setCompletedMilestones(data.completed_milestones || []);
      setGithubUrl(data.github_url || '');
      setNotes(data.notes || '');
      setStatus(data.student_status && data.student_status !== 'not_started' ? data.student_status : 'in_progress');
    } catch (err: any) {
      console.error(err);
      setError('Failed to load project details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  // Total tasks count across all milestones
  const allTasks = useMemo(() => {
    if (!project?.milestones) return [];
    return project.milestones.flatMap((m) => m.tasks);
  }, [project]);

  // Overall progress percentage calculation
  const calculatedProgress = useMemo(() => {
    if (!allTasks.length) return 0;
    const taskPct = (completedTasks.length / allTasks.length) * 100;
    return Math.min(100, Math.round(taskPct));
  }, [allTasks, completedTasks]);

  // Handle toggling an individual task checkbox
  const handleTaskToggle = (taskId: string, milestone: ProjectMilestone) => {
    const isCurrentlyDone = completedTasks.includes(taskId);
    let updatedTasks: string[];

    if (isCurrentlyDone) {
      updatedTasks = completedTasks.filter((t) => t !== taskId);
    } else {
      updatedTasks = [...completedTasks, taskId];
    }
    setCompletedTasks(updatedTasks);

    // Check if all tasks in the milestone are completed
    const allMilestoneTasksDone = milestone.tasks.every((t) =>
      t.id === taskId ? !isCurrentlyDone : updatedTasks.includes(t.id)
    );

    if (allMilestoneTasksDone && !completedMilestones.includes(milestone.id)) {
      setCompletedMilestones((prev) => [...prev, milestone.id]);
    } else if (!allMilestoneTasksDone && completedMilestones.includes(milestone.id)) {
      setCompletedMilestones((prev) => prev.filter((mId) => mId !== milestone.id));
    }
  };

  // Toggle whole milestone completed
  const handleMilestoneToggle = (milestone: ProjectMilestone) => {
    const isMilestoneDone = completedMilestones.includes(milestone.id);
    const milestoneTaskIds = milestone.tasks.map((t) => t.id);

    if (isMilestoneDone) {
      // Unmark milestone and its tasks
      setCompletedMilestones((prev) => prev.filter((mId) => mId !== milestone.id));
      setCompletedTasks((prev) => prev.filter((tId) => !milestoneTaskIds.includes(tId)));
    } else {
      // Mark milestone and all its tasks as completed
      setCompletedMilestones((prev) => [...prev, milestone.id]);
      setCompletedTasks((prev) => Array.from(new Set([...prev, ...milestoneTaskIds])));
    }
  };

  // Save Progress to backend
  const handleSaveProgress = async (newStatus?: string) => {
    setIsSaving(true);
    setSaveSuccessMessage(null);
    try {
      const targetStatus = newStatus || (calculatedProgress >= 100 ? 'completed' : status);
      await projectsAPI.saveProgress(projectId, {
        progress_pct: calculatedProgress,
        completed_milestones: completedMilestones,
        completed_tasks: completedTasks,
        notes,
        github_url: githubUrl,
        status: targetStatus,
      });

      setStatus(targetStatus);
      setSaveSuccessMessage('Progress saved successfully! Available across all sessions.');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Failed to save progress. Please check your network connection.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading your customized project workspace..." />;
  if (error || !project) {
    return (
      <ErrorState
        message={error || 'Project not found.'}
        onRetry={fetchProjectDetails}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => navigate('/projects')}
          className="inline-flex items-center space-x-2 text-xs font-bold text-[#315B8A] hover:text-[#142B4A] transition-colors py-1 px-2.5 rounded-xl hover:bg-[#EAF0F7] w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Recommended Projects</span>
        </button>

        <div className="flex items-center space-x-2">
          {saveSuccessMessage && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center space-x-1.5 animate-in fade-in">
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccessMessage}</span>
            </span>
          )}

          <button
            onClick={() => handleSaveProgress()}
            disabled={isSaving}
            className="flex items-center space-x-2 px-4 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Progress</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Project Hero Card */}
      <div className="bg-white border border-[#DCE3EC] rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  project.difficulty?.toLowerCase() === 'beginner'
                    ? 'success'
                    : project.difficulty?.toLowerCase() === 'intermediate'
                    ? 'warning'
                    : 'danger'
                }
              >
                {project.difficulty}
              </Badge>

              <span className="flex items-center space-x-1 text-xs text-[#64748B] font-mono bg-[#F5F7FA] border border-[#DCE3EC] px-2.5 py-0.5 rounded-full">
                <Clock className="w-3.5 h-3.5 text-[#315B8A]" />
                <span>{project.estimated_hours} Hours Est.</span>
              </span>

              {status === 'completed' ? (
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Project Completed</span>
                </span>
              ) : (
                <span className="bg-blue-50 text-[#142B4A] text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[#DCE3EC]">
                  Status: In Progress
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-[#142B4A] tracking-tight">
              {project.title}
            </h1>

            <p className="text-xs md:text-sm text-[#475569] leading-relaxed max-w-3xl">
              {project.description}
            </p>
          </div>

          {/* Quick Progress Dial */}
          <div className="bg-[#F5F7FA] border border-[#DCE3EC] rounded-2xl p-4 flex flex-col items-center justify-center min-w-[170px] shrink-0">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
              Overall Progress
            </span>
            <span className="text-3xl font-black text-[#142B4A]">
              {calculatedProgress}%
            </span>
            <span className="text-[11px] text-[#315B8A] font-semibold mt-0.5">
              {completedMilestones.length} of {project.milestones?.length || 0} Milestones
            </span>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-[#142B4A]">
            <span>Milestone Completion Tracking</span>
            <span>{completedTasks.length} / {allTasks.length} Tasks Done</span>
          </div>
          <div className="w-full bg-[#EAF0F7] h-3 rounded-full overflow-hidden border border-[#DCE3EC]">
            <div
              className="bg-[#142B4A] h-full transition-all duration-300 rounded-full"
              style={{ width: `${calculatedProgress}%` }}
            />
          </div>
        </div>

        {/* Tech Stack Pills */}
        <div className="pt-2 border-t border-[#DCE3EC]">
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-2">
            Technology Stack &amp; Libraries
          </span>
          <div className="flex flex-wrap gap-1.5">
            {project.tech_stack?.map((tech, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-[#EAF0F7] text-[#142B4A] border border-[#DCE3EC] rounded-xl text-xs font-semibold font-mono"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Problem Statement, Objectives, Prerequisites & Outcome */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Problem Statement & Expected Outcome */}
        <Card className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#142B4A] flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-[#315B8A]" />
              <span>Problem Statement</span>
            </h3>
            <p className="text-xs text-[#475569] leading-relaxed mt-2 bg-[#F5F7FA] p-3.5 rounded-2xl border border-[#DCE3EC]">
              {project.problem_statement || project.description}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#142B4A] flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Expected Outcome</span>
            </h3>
            <p className="text-xs text-[#475569] leading-relaxed mt-2 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200 text-[#142B4A]">
              {project.expected_outcome || 'A fully functioning, tested, and verifiable portfolio project ready for technical interviews.'}
            </p>
          </div>
        </Card>

        {/* Objectives & Prerequisites */}
        <Card className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#142B4A] flex items-center space-x-2">
              <ListChecks className="w-4 h-4 text-[#315B8A]" />
              <span>Key Project Objectives</span>
            </h3>
            <ul className="mt-2 space-y-2">
              {project.objectives?.map((obj, i) => (
                <li key={i} className="flex items-start space-x-2 text-xs text-[#142B4A]">
                  <CheckCircle2 className="w-4 h-4 text-[#315B8A] shrink-0 mt-0.5" />
                  <span className="leading-snug">{obj}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-2 border-t border-[#DCE3EC]">
            <h3 className="text-sm font-bold text-[#142B4A] flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-[#315B8A]" />
              <span>Recommended Prerequisites</span>
            </h3>
            <ul className="mt-2 space-y-1.5">
              {project.prerequisites?.map((pre, i) => (
                <li key={i} className="flex items-start space-x-2 text-xs text-[#64748B]">
                  <ChevronRight className="w-3.5 h-3.5 text-[#315B8A] shrink-0 mt-0.5" />
                  <span>{pre}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {/* Implementation Roadmap Stepper */}
      {project.roadmap_steps && project.roadmap_steps.length > 0 && (
        <Card className="space-y-4">
          <div className="flex items-center space-x-2 text-[#142B4A]">
            <Layers className="w-4 h-4 text-[#315B8A]" />
            <h3 className="text-base font-bold">Step-by-Step Implementation Roadmap</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            {project.roadmap_steps.map((step, idx) => {
              const stepCompleted = idx < completedMilestones.length;
              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    stepCompleted
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                      : 'bg-[#F5F7FA] border-[#DCE3EC] text-[#142B4A]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#64748B]">
                      Phase {idx + 1}
                    </span>
                    {stepCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-[#94A3B8]" />
                    )}
                  </div>
                  <p className="text-xs font-bold leading-snug">{step}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Milestones & Tasks Interactive Tracker */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-lg font-black text-[#142B4A] flex items-center space-x-2">
            <Flag className="w-5 h-5 text-[#315B8A]" />
            <span>Milestones &amp; Task Checklist</span>
          </h2>
          <span className="text-xs text-[#64748B]">
            Check off completed tasks or mark entire milestones completed
          </span>
        </div>

        <div className="space-y-4">
          {project.milestones?.map((milestone) => {
            const isMilestoneDone = completedMilestones.includes(milestone.id);
            const milestoneDoneTasks = milestone.tasks.filter((t) =>
              completedTasks.includes(t.id)
            ).length;

            return (
              <Card
                key={milestone.id}
                className={`transition-all duration-200 border-2 ${
                  isMilestoneDone
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-[#DCE3EC]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DCE3EC]">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-[#EAF0F7] text-[#142B4A] border border-[#DCE3EC]">
                        Milestone {milestone.id}
                      </span>
                      <h4 className="text-sm font-bold text-[#142B4A]">
                        {milestone.title}
                      </h4>
                    </div>
                    <p className="text-xs text-[#64748B]">
                      {milestone.description}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2.5 shrink-0">
                    <span className="text-xs font-mono text-[#64748B]">
                      {milestoneDoneTasks}/{milestone.tasks.length} Done
                    </span>

                    <button
                      onClick={() => handleMilestoneToggle(milestone)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm ${
                        isMilestoneDone
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-[#EAF0F7] hover:bg-[#DCE3EC] text-[#142B4A] border border-[#DCE3EC]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isMilestoneDone ? 'Completed' : 'Mark Completed'}</span>
                    </button>
                  </div>
                </div>

                {/* Task Checklist */}
                <div className="pt-3 space-y-2.5">
                  {milestone.tasks.map((task) => {
                    const isTaskDone = completedTasks.includes(task.id);
                    return (
                      <label
                        key={task.id}
                        className={`flex items-start space-x-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                          isTaskDone
                            ? 'bg-emerald-50/60 border-emerald-200 text-[#142B4A]'
                            : 'bg-white hover:bg-[#F5F7FA] border-[#DCE3EC] text-[#334155]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isTaskDone}
                          onChange={() => handleTaskToggle(task.id, milestone)}
                          className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#142B4A] focus:ring-[#142B4A] cursor-pointer"
                        />
                        <span
                          className={`text-xs font-medium leading-relaxed select-none ${
                            isTaskDone ? 'line-through text-slate-500' : ''
                          }`}
                        >
                          {task.text}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Setup Instructions, Required Tools & Learning Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Setup Instructions */}
        <Card className="lg:col-span-2 space-y-3">
          <div className="flex items-center space-x-2 text-[#142B4A]">
            <Terminal className="w-4 h-4 text-[#315B8A]" />
            <h3 className="text-sm font-bold">Local Setup &amp; Execution Guide</h3>
          </div>
          <div className="bg-[#0F172A] text-slate-200 p-4 rounded-2xl font-mono text-xs space-y-2 overflow-x-auto shadow-inner">
            {project.setup_instructions?.map((cmd, i) => (
              <div key={i} className="flex items-start space-x-2">
                <span className="text-[#38BDF8] select-none">$</span>
                <span className="leading-relaxed">{cmd}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Required Tools */}
        <Card className="space-y-3">
          <div className="flex items-center space-x-2 text-[#142B4A]">
            <Wrench className="w-4 h-4 text-[#315B8A]" />
            <h3 className="text-sm font-bold">Required Tools &amp; Environment</h3>
          </div>
          <ul className="space-y-1.5 text-xs text-[#142B4A]">
            {project.required_tools?.map((tool, i) => (
              <li
                key={i}
                className="flex items-center space-x-2 p-2 bg-[#F5F7FA] rounded-xl border border-[#DCE3EC]"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#315B8A]" />
                <span className="font-medium">{tool}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Learning Resources & Testing Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Learning Resources */}
        <Card className="space-y-3">
          <div className="flex items-center space-x-2 text-[#142B4A]">
            <BookOpen className="w-4 h-4 text-[#315B8A]" />
            <h3 className="text-sm font-bold">Recommended Learning Resources</h3>
          </div>
          <div className="space-y-2">
            {project.learning_resources?.map((res, i) => (
              <a
                key={i}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-[#F5F7FA] hover:bg-[#EAF0F7] border border-[#DCE3EC] rounded-2xl text-xs transition-colors group"
              >
                <div className="space-y-0.5">
                  <p className="font-bold text-[#142B4A] group-hover:text-[#315B8A]">
                    {res.title}
                  </p>
                  <span className="text-[10px] uppercase font-bold text-[#64748B]">
                    {res.type}
                  </span>
                </div>
                <ExternalLink className="w-4 h-4 text-[#64748B] group-hover:text-[#142B4A]" />
              </a>
            ))}
          </div>
        </Card>

        {/* Testing Steps */}
        <Card className="space-y-3">
          <div className="flex items-center space-x-2 text-[#142B4A]">
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold">Testing &amp; Verification Procedures</h3>
          </div>
          <ul className="space-y-2 text-xs">
            {project.testing_steps?.map((step, i) => (
              <li
                key={i}
                className="p-3 bg-[#F5F7FA] rounded-2xl border border-[#DCE3EC] text-[#142B4A] leading-relaxed"
              >
                {step}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Student Repository & Implementation Notes (Persistent) */}
      <Card className="space-y-4">
        <div className="flex items-center space-x-2 text-[#142B4A]">
          <Github className="w-5 h-5 text-[#142B4A]" />
          <h3 className="text-base font-bold">Submission &amp; Implementation Artifacts</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#142B4A]">
              GitHub Repository URL
            </label>
            <input
              type="url"
              placeholder="https://github.com/your-username/my-project"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F5F7FA] border border-[#DCE3EC] focus:border-[#142B4A] rounded-xl text-xs font-mono focus:outline-none transition-all"
            />
            <p className="text-[11px] text-[#64748B]">
              Add your source code repository link for mentor and recruiter verification.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#142B4A]">
              Personal Implementation Notes
            </label>
            <textarea
              rows={3}
              placeholder="Record architectural decisions, blockers resolved, or notes for technical interviews..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#F5F7FA] border border-[#DCE3EC] focus:border-[#142B4A] rounded-xl text-xs focus:outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* Bottom Save & Complete Actions */}
        <div className="pt-4 border-t border-[#DCE3EC] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-[#64748B]">
            <Save className="w-4 h-4 text-[#315B8A]" />
            <span>Progress and task checkboxes are stored against your student profile.</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={() => handleSaveProgress()}
              disabled={isSaving}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Progress</span>
                </>
              )}
            </button>

            {calculatedProgress >= 100 && status !== 'completed' && (
              <button
                onClick={() => handleSaveProgress('completed')}
                disabled={isSaving}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Project 100% Completed</span>
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
