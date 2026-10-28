import React, { useState, useEffect, useRef } from 'react';
import { resumeAPI } from '../services/api';
import { Card, Badge, Modal } from '../components/common/UIComponents';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Check,
  Plus,
  Trash2,
  Clock,
  Briefcase,
  GraduationCap,
  Award,
  Layers,
  ArrowRight,
  Download,
  History,
  TrendingUp,
  HelpCircle,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Info,
  Loader2,
  FileCheck,
} from 'lucide-react';

export const ResumeUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Career Goal Selection
  const [careerGoals, setCareerGoals] = useState<string[]>([
    'Full Stack Developer',
    'Backend Engineer',
    'Frontend Engineer',
    'Data Scientist',
    'DevOps Engineer',
  ]);
  const [selectedGoal, setSelectedGoal] = useState<string>('Full Stack Developer');

  // Analysis Result
  const [parseResult, setParseResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'projects' | 'roadmap' | 'suggestions'>('overview');
  const [skillFilter, setSkillFilter] = useState<'all' | 'demonstrated' | 'partial' | 'missing'>('all');

  // Syncing states
  const [syncingSkills, setSyncingSkills] = useState(false);
  const [skillsSyncedMsg, setSkillsSyncedMsg] = useState<string | null>(null);

  const [syncingRoadmap, setSyncingRoadmap] = useState(false);
  const [roadmapSyncedMsg, setRoadmapSyncedMsg] = useState<string | null>(null);

  const [syncingPlacement, setSyncingPlacement] = useState(false);
  const [placementSyncedMsg, setPlacementSyncedMsg] = useState<string | null>(null);

  // History state
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Load initial career goals and latest resume if available
    const init = async () => {
      try {
        const goalsData = await resumeAPI.getCareerGoals();
        if (goalsData?.available_goals && goalsData.available_goals.length > 0) {
          setCareerGoals(goalsData.available_goals);
        }
        if (goalsData?.current_goal) {
          setSelectedGoal(goalsData.current_goal);
        }
      } catch (err) {
        // Silent fallback
      }

      try {
        const latest = await resumeAPI.getLatest();
        if (latest && latest.id && latest.parsed_data) {
          setParseResult({
            resume_id: latest.id,
            filename: latest.filename,
            analysis_score: latest.analysis_score,
            analysis_feedback: latest.analysis_feedback,
            uploaded_at: latest.uploaded_at,
            parsed_data: latest.parsed_data,
          });
        }
      } catch (err) {
        // No previous resume, fine
      }
    };
    init();
  }, []);

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.docx', '.doc'].includes(ext)) {
      setError(`Unsupported file format '${ext}'. Please upload a text-based PDF or DOCX file.`);
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB maximum limit.');
      return;
    }
    if (selectedFile.size === 0) {
      setError('The selected file is empty (0 bytes).');
      return;
    }
    setFile(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || uploading) return;

    setUploading(true);
    setError(null);
    setSkillsSyncedMsg(null);
    setRoadmapSyncedMsg(null);
    setPlacementSyncedMsg(null);

    try {
      const res = await resumeAPI.upload(file, selectedGoal);
      setParseResult(res);
      setActiveTab('overview');
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || 'Failed to analyze resume file.';
      setError(detail);
    } finally {
      setUploading(false);
    }
  };

  // Sync actions
  const handleSyncSkills = async () => {
    if (!parseResult?.resume_id || syncingSkills) return;
    setSyncingSkills(true);
    setSkillsSyncedMsg(null);
    try {
      const res = await resumeAPI.syncSkills(parseResult.resume_id);
      setSkillsSyncedMsg(res.message || 'Skills merged into Skills & Gaps successfully!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to sync skills.');
    } finally {
      setSyncingSkills(false);
    }
  };

  const handleSyncRoadmap = async () => {
    if (!parseResult?.resume_id || syncingRoadmap) return;
    setSyncingRoadmap(true);
    setRoadmapSyncedMsg(null);
    try {
      const res = await resumeAPI.syncRoadmap(parseResult.resume_id);
      setRoadmapSyncedMsg(res.message || 'Roadmap milestones aligned with your skill gaps.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update roadmap.');
    } finally {
      setSyncingRoadmap(false);
    }
  };

  const handleSyncPlacement = async () => {
    if (!parseResult?.resume_id || syncingPlacement) return;
    setSyncingPlacement(true);
    setPlacementSyncedMsg(null);
    try {
      const res = await resumeAPI.syncPlacement(parseResult.resume_id);
      setPlacementSyncedMsg(
        res.overall_score
          ? `Placement Readiness score updated to ${res.overall_score}%!`
          : res.message || 'Placement readiness updated.'
      );
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update placement readiness.');
    } finally {
      setSyncingPlacement(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    setShowHistoryModal(true);
    try {
      const res = await resumeAPI.getHistory();
      setHistoryList(res.history || []);
    } catch (err) {
      setHistoryList([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelectHistoryItem = async (resumeId: number) => {
    try {
      const res = await resumeAPI.getResume(resumeId);
      setParseResult(res);
      setShowHistoryModal(false);
      setActiveTab('overview');
    } catch (err: any) {
      setError('Failed to load past resume report.');
    }
  };

  const handleDownloadReport = () => {
    if (!parseResult) return;
    const reportData = {
      filename: parseResult.filename,
      analyzed_at: parseResult.uploaded_at || new Date().toISOString(),
      score: parseResult.analysis_score,
      parsed_data: parseResult.parsed_data,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SkillNova_Resume_Report_${parseResult.filename.replace(/\.[^/.]+$/, '')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper references
  const parsedData = parseResult?.parsed_data || {};
  const isAiConfigured = parsedData.ai_configured !== false;
  const isUnreadable = parsedData.error === 'UNREADABLE_FILE';
  const alignment = parsedData.career_alignment || {};
  const candidate = parsedData.candidate || {};
  const qualityScore = parseResult?.analysis_score ?? parsedData.resume_quality_score ?? 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#142B4A] border border-[#1E3A5F] p-6 rounded-3xl shadow-sm text-white">
        <div>
          <div className="flex items-center space-x-2 text-[#DCE6F2] text-xs font-bold mb-1">
            <FileText className="w-4 h-4 text-[#DCE6F2]" />
            <span>AI Parser & Career Gap Analyzer</span>
          </div>
          <h1 className="text-2xl font-black text-[#FFFFFF] tracking-tight">AI Resume Analyzer</h1>
          <p className="text-xs text-[#DCE6F2] mt-1 font-normal max-w-2xl">
            Upload your PDF or DOCX resume to extract verified skills, benchmark against target career standards, and
            generate tailored project and roadmap recommendations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadHistory}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition-all shadow-sm cursor-pointer"
          >
            <History className="w-4 h-4" />
            <span>Analysis History</span>
          </button>
        </div>
      </div>

      {/* Upload & Configuration Card */}
      <Card className="bg-[#FFFFFF] border border-[#DCE3EC] p-6 shadow-sm">
        <form onSubmit={handleUpload} className="space-y-5">
          {/* Career Goal Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#F5F7FA] border border-[#DCE3EC] rounded-2xl">
            <div className="flex items-center space-x-2.5">
              <Briefcase className="w-5 h-5 text-[#142B4A]" />
              <div>
                <p className="text-xs font-bold text-[#142B4A]">Target Career Benchmark</p>
                <p className="text-[11px] text-[#64748B]">Skills will be verified against standard requirements for this role</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={selectedGoal}
                onChange={(e) => setSelectedGoal(e.target.value)}
                disabled={uploading}
                className="bg-white border border-[#DCE3EC] text-[#142B4A] text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-[#142B4A] cursor-pointer shadow-xs"
              >
                {careerGoals.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all relative ${
              dragActive
                ? 'border-[#142B4A] bg-[#EAF0F7]'
                : file
                ? 'border-emerald-300 bg-emerald-50/50'
                : 'border-[#94A3B8] hover:border-[#142B4A] bg-[#F8FAFC]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileChange}
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#DCE3EC] text-[#142B4A] flex items-center justify-center mx-auto mb-3 shadow-xs">
              {file ? <FileCheck className="w-6 h-6 text-emerald-600" /> : <Upload className="w-6 h-6 text-[#142B4A]" />}
            </div>

            {file ? (
              <div className="space-y-2">
                <p className="text-xs font-extrabold text-[#142B4A]">{file.name}</p>
                <p className="text-[11px] text-[#64748B] font-medium">
                  Size: {(file.size / 1024).toFixed(1)} KB · Ready to analyze
                </p>
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile();
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove / Replace file</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#142B4A]">
                  Drag & drop your resume PDF or DOCX here, or click to browse
                </p>
                <p className="text-[11px] text-[#64748B] font-medium">
                  Supported formats: PDF, DOCX (Max 10MB) · Must contain extractable text
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Analyze Button */}
          <button
            type="submit"
            disabled={!file || uploading}
            className={`w-full py-3.5 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 ${
              !file || uploading
                ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed border border-[#CBD5E1]'
                : 'bg-[#142B4A] hover:bg-[#1E3A5F] text-[#FFFFFF] shadow-md shadow-[#142B4A]/10 active:scale-[0.99] cursor-pointer'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Extracting Text & Analyzing with AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Analyze Resume with AI</span>
              </>
            )}
          </button>
        </form>
      </Card>

      {/* AI Not Configured Alert */}
      {parseResult && !isAiConfigured && (
        <Card className="bg-amber-50 border border-amber-200 p-6 rounded-2xl shadow-sm">
          <div className="flex items-start space-x-3 text-amber-900">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider">AI Service Configuration Required</h3>
              <p className="text-xs text-amber-800">
                {parsedData.message || 'No AI service key is configured in the backend environment.'}
              </p>
              <p className="text-[11px] text-amber-700 pt-1">
                To enable automated AI resume analysis, add either <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">GEMINI_API_KEY</code> or <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">OPENAI_API_KEY</code> to your backend <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env</code> file.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Unreadable Document Alert */}
      {parseResult && isUnreadable && (
        <Card className="bg-red-50 border border-red-200 p-6 rounded-2xl shadow-sm">
          <div className="flex items-start space-x-3 text-red-900">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider">Unreadable Document Detected</h3>
              <p className="text-xs text-red-800">{parsedData.message}</p>
              <div className="text-[11px] text-red-700 bg-red-100/60 p-3 rounded-xl space-y-1">
                <p className="font-semibold">Tips for searchable resumes:</p>
                <ul className="list-disc list-inside space-y-0.5 text-red-800">
                  <li>Avoid scanned paper photos or image-flattened PDFs.</li>
                  <li>In Google Docs / MS Word, choose "File → Save / Download As → PDF".</li>
                  <li>Ensure you can select and highlight text with your cursor in your PDF reader.</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Results Dashboard */}
      {parseResult && !isUnreadable && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Overview Scoreboard */}
          <Card className="bg-[#FFFFFF] border border-[#DCE3EC] p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Candidate Info */}
              <div className="space-y-1.5 md:border-r border-[#DCE3EC] md:pr-6">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-[#142B4A] text-white flex items-center justify-center font-bold text-xs">
                    {(candidate.name || 'Student')[0]}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[#142B4A]">
                      {candidate.name || 'Candidate Profile'}
                    </h2>
                    <p className="text-[11px] text-[#64748B]">
                      {candidate.email || parseResult.filename}
                    </p>
                  </div>
                </div>
                {candidate.summary && (
                  <p className="text-xs text-[#334155] italic pt-1 line-clamp-3">
                    "{candidate.summary}"
                  </p>
                )}
                <div className="pt-2 flex flex-wrap gap-1 text-[11px] text-[#64748B]">
                  <span className="font-semibold text-[#142B4A]">Target Role:</span>
                  <span className="bg-[#F1F5F9] px-2 py-0.5 rounded text-[#142B4A] font-medium border border-[#DCE3EC]">
                    {alignment.career_goal || selectedGoal}
                  </span>
                </div>
              </div>

              {/* Resume Quality Score */}
              <div className="space-y-2 text-center md:border-r border-[#DCE3EC] md:px-6">
                <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                  Resume Quality Score
                </p>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 border-[#142B4A] bg-[#F5F7FA]">
                  <span className="text-2xl font-black text-[#142B4A]">{qualityScore}</span>
                  <span className="text-xs font-bold text-[#64748B]">%</span>
                </div>
                <p className="text-[11px] text-[#64748B]">
                  Evaluates formatting, technical depth, and quantifiable achievements
                </p>
              </div>

              {/* Career Skill Coverage */}
              <div className="space-y-3 md:pl-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#142B4A]">Career Skill Coverage</span>
                  <span className="font-extrabold text-[#142B4A]">{alignment.coverage_percentage || 0}%</span>
                </div>
                <div className="w-full bg-[#E2E8F0] h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, alignment.coverage_percentage || 0)}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#64748B] leading-relaxed">
                  {alignment.coverage_explanation ||
                    '(Demonstrated + 0.5 × Partially Demonstrated) / Total Required × 100'}
                </p>
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#64748B] pt-1 border-t border-[#F1F5F9]">
                  <span className="text-emerald-700">✓ {alignment.demonstrated_count || 0} Demonstrated</span>
                  <span className="text-amber-700">~ {alignment.partially_demonstrated_count || 0} Partial</span>
                  <span className="text-red-700">✕ {alignment.missing_count || 0} Missing</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Action & Sync Controls Bar */}
          <Card className="bg-[#F8FAFC] border border-[#DCE3EC] p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#142B4A]">
                <ShieldCheck className="w-4 h-4 text-[#142B4A]" />
                <span>SkillNova Integration Actions:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncSkills}
                  disabled={syncingSkills}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-[#142B4A] hover:bg-[#1E3A5F] rounded-xl flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {syncingSkills ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>Apply Skills to Profile</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncRoadmap}
                  disabled={syncingRoadmap}
                  className="px-3.5 py-2 text-xs font-bold text-[#142B4A] bg-white hover:bg-[#F1F5F9] border border-[#DCE3EC] rounded-xl flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {syncingRoadmap ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />}
                  <span>Send Gaps to Roadmap</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncPlacement}
                  disabled={syncingPlacement}
                  className="px-3.5 py-2 text-xs font-bold text-[#142B4A] bg-white hover:bg-[#F1F5F9] border border-[#DCE3EC] rounded-xl flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {syncingPlacement ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Award className="w-3.5 h-3.5 text-amber-600" />}
                  <span>Update Placement Score</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="px-3.5 py-2 text-xs font-bold text-[#475569] bg-white hover:bg-[#F1F5F9] border border-[#DCE3EC] rounded-xl flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#142B4A]" />
                  <span>Download Report</span>
                </button>
              </div>
            </div>

            {/* Sync Feedback Toasts */}
            {skillsSyncedMsg && (
              <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{skillsSyncedMsg}</span>
              </div>
            )}
            {roadmapSyncedMsg && (
              <div className="mt-3 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-800 text-xs font-medium flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{roadmapSyncedMsg}</span>
              </div>
            )}
            {placementSyncedMsg && (
              <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{placementSyncedMsg}</span>
              </div>
            )}
          </Card>

          {/* Tab Navigation */}
          <div className="flex border-b border-[#DCE3EC] space-x-4">
            {[
              { id: 'overview', label: 'Overview & Education', icon: GraduationCap },
              { id: 'skills', label: 'Career Skill Gaps', icon: Layers },
              { id: 'projects', label: 'Projects & Experience', icon: Briefcase },
              { id: 'roadmap', label: 'Learning Roadmap', icon: TrendingUp },
              { id: 'suggestions', label: 'Resume Tips & Projects', icon: Lightbulb },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-3 text-xs font-bold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#142B4A] text-[#142B4A]'
                      : 'border-transparent text-[#64748B] hover:text-[#142B4A]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW & EDUCATION */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Education */}
              <Card className="bg-[#FFFFFF] border border-[#DCE3EC] p-6 space-y-4 shadow-sm">
                <div className="flex items-center space-x-2 border-b border-[#DCE3EC] pb-3">
                  <GraduationCap className="w-5 h-5 text-[#142B4A]" />
                  <h3 className="text-sm font-bold text-[#142B4A]">Extracted Education</h3>
                </div>
                {parsedData.education && parsedData.education.length > 0 ? (
                  <div className="space-y-3">
                    {parsedData.education.map((edu: any, i: number) => (
                      <div key={i} className="p-3 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl space-y-1">
                        <p className="text-xs font-bold text-[#142B4A]">{edu.degree || 'Degree'}</p>
                        <p className="text-[11px] text-[#475569]">{edu.institution || 'Institution'}</p>
                        <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1">
                          <span>Year: {edu.year || 'N/A'}</span>
                          {edu.gpa_or_grade && <span>Grade: {edu.gpa_or_grade}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#64748B] italic">No specific educational degrees detected.</p>
                )}
              </Card>

              {/* Strengths & Improvements */}
              <Card className="bg-[#FFFFFF] border border-[#DCE3EC] p-6 space-y-4 shadow-sm">
                <div className="flex items-center space-x-2 border-b border-[#DCE3EC] pb-3">
                  <Award className="w-5 h-5 text-[#142B4A]" />
                  <h3 className="text-sm font-bold text-[#142B4A]">Profile Strengths</h3>
                </div>
                <div className="space-y-2">
                  {(parsedData.strengths || [
                    'Clear technical emphasis supported by projects',
                    'Demonstrated proficiency across core technologies',
                  ]).map((st: string, i: number) => (
                    <div key={i} className="flex items-start space-x-2 text-xs text-[#142B4A]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{st}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#DCE3EC]">
                  <p className="text-xs font-bold text-[#142B4A] mb-2 flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Key Growth Opportunities</span>
                  </p>
                  <div className="space-y-1.5">
                    {(parsedData.areas_for_improvement || [
                      'Incorporate measurable impact and metrics in project bullets',
                      'Strengthen test-driven development and deployment evidence',
                    ]).map((imp: string, i: number) => (
                      <p key={i} className="text-xs text-[#475569] pl-3 border-l-2 border-amber-400">
                        {imp}
                      </p>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: CAREER SKILL GAPS */}
          {activeTab === 'skills' && (
            <Card className="bg-[#FFFFFF] border border-[#DCE3EC] p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[#DCE3EC] pb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#142B4A] flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-[#142B4A]" />
                    <span>Career Gap Breakdown for {alignment.career_goal || selectedGoal}</span>
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Verified against required industry capabilities for this role
                  </p>
                </div>
                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 bg-[#F1F5F9] p-1 rounded-xl">
                  {(['all', 'demonstrated', 'partial', 'missing'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setSkillFilter(f)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg capitalize transition-all cursor-pointer ${
                        skillFilter === f ? 'bg-[#142B4A] text-white shadow-xs' : 'text-[#64748B] hover:text-[#142B4A]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skills Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Demonstrated */}
                {(skillFilter === 'all' || skillFilter === 'demonstrated') &&
                  alignment.demonstrated?.map((item: any, i: number) => (
                    <div
                      key={`dem-${i}`}
                      className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-emerald-950 flex items-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{item.skill}</span>
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full">
                          Demonstrated
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-relaxed italic">
                        "{item.evidence}"
                      </p>
                    </div>
                  ))}

                {/* Partially Demonstrated */}
                {(skillFilter === 'all' || skillFilter === 'partial') &&
                  alignment.partially_demonstrated?.map((item: any, i: number) => (
                    <div
                      key={`part-${i}`}
                      className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-amber-950 flex items-center space-x-1.5">
                          <HelpCircle className="w-4 h-4 text-amber-600" />
                          <span>{item.skill}</span>
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full">
                          Partially Verified
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        {item.evidence}
                      </p>
                    </div>
                  ))}

                {/* Missing */}
                {(skillFilter === 'all' || skillFilter === 'missing') &&
                  alignment.missing?.map((item: any, i: number) => (
                    <div
                      key={`miss-${i}`}
                      className="p-3.5 bg-red-50/60 border border-red-200 rounded-2xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-red-950 flex items-center space-x-1.5">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span>{item.skill}</span>
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-red-200 text-red-900 rounded-full">
                          Gap / Missing
                        </span>
                      </div>
                      <p className="text-[11px] text-red-800 leading-relaxed">
                        {item.recommended_action}
                      </p>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* TAB 3: PROJECTS & EXPERIENCE */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              {/* Extracted Projects */}
              <Card className="bg-[#FFFFFF] border border-[#DCE3EC] p-6 space-y-4 shadow-sm">
                <div className="flex items-center space-x-2 border-b border-[#DCE3EC] pb-3">
                  <Briefcase className="w-5 h-5 text-[#142B4A]" />
                  <h3 className="text-sm font-bold text-[#142B4A]">Extracted Projects</h3>
                </div>
                {parsedData.projects && parsedData.projects.length > 0 ? (
                  <div className="space-y-4">
                    {parsedData.projects.map((proj: any, i: number) => (
                      <div key={i} className="p-4 bg-[#F8FAFC] border border-[#DCE3EC] rounded-2xl space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-extrabold text-[#142B4A]">{proj.title || 'Project'}</h4>
                          {proj.impact && (
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {proj.impact}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#475569]">{proj.description}</p>
                        {proj.tech_stack && proj.tech_stack.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {proj.tech_stack.map((t: string, ti: number) => (
                              <span
                                key={ti}
                                className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-[#DCE3EC] rounded text-[#142B4A]"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#64748B] italic">No projects explicitly extracted from resume text.</p>
                )}
              </Card>

              {/* Work & Internship Experience */}
              {parsedData.experience && parsedData.experience.length > 0 && (
                <Card className="bg-[#FFFFFF] border border-[#DCE3EC] p-6 space-y-4 shadow-sm">
                  <div className="flex items-center space-x-2 border-b border-[#DCE3EC] pb-3">
                    <Clock className="w-5 h-5 text-[#142B4A]" />
                    <h3 className="text-sm font-bold text-[#142B4A]">Work & Internship Experience</h3>
                  </div>
                  <div className="space-y-3">
                    {parsedData.experience.map((exp: any, i: number) => (
                      <div key={i} className="p-4 bg-[#F8FAFC] border border-[#DCE3EC] rounded-2xl space-y-1.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold text-[#142B4A]">{exp.title}</p>
                            <p className="text-[11px] text-[#475569]">{exp.company}</p>
                          </div>
                          <span className="text-[10px] text-[#64748B] bg-white border border-[#DCE3EC] px-2 py-0.5 rounded">
                            {exp.duration || exp.type || 'Internship'}
                          </span>
                        </div>
                        {exp.highlights && exp.highlights.length > 0 && (
                          <ul className="list-disc list-inside text-xs text-[#475569] space-y-0.5 pt-1">
                            {exp.highlights.map((h: string, hi: number) => (
                              <li key={hi}>{h}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* TAB 4: LEARNING ROADMAP */}
          {activeTab === 'roadmap' && (
            <Card className="bg-[#FFFFFF] border border-[#DCE3EC] p-6 space-y-5 shadow-sm">
              <div className="flex justify-between items-center border-b border-[#DCE3EC] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#142B4A] flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-[#142B4A]" />
                    <span>Personalized Skill Gap Learning Roadmap</span>
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Step-by-step topics curated to eliminate missing prerequisites
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncRoadmap}
                  disabled={syncingRoadmap}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#142B4A] hover:bg-[#1E3A5F] rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{syncingRoadmap ? 'Updating Roadmap...' : 'Add to Roadmap Module'}</span>
                </button>
              </div>

              {parsedData.learning_roadmap && parsedData.learning_roadmap.length > 0 ? (
                <div className="space-y-4">
                  {parsedData.learning_roadmap.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 bg-[#F8FAFC] border border-[#DCE3EC] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-full bg-[#142B4A] text-white flex items-center justify-center font-bold text-xs">
                            {idx + 1}
                          </span>
                          <h4 className="text-xs font-bold text-[#142B4A]">{item.topic}</h4>
                        </div>
                        {item.target_skill && (
                          <p className="text-[11px] text-[#64748B] pl-8">
                            Closes Gap: <span className="font-semibold text-[#142B4A]">{item.target_skill}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 self-end sm:self-center">
                        <span className="text-[11px] font-semibold text-[#475569] bg-white border border-[#DCE3EC] px-2.5 py-1 rounded-lg">
                          ⏱ {item.duration || '2 weeks'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-[#F8FAFC] border border-[#DCE3EC] rounded-2xl text-center text-xs text-[#64748B]">
                  Upload an updated resume to generate a personalized learning roadmap.
                </div>
              )}
            </Card>
          )}

          {/* TAB 5: RESUME TIPS & SUGGESTED PROJECTS */}
          {activeTab === 'suggestions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quality Suggestions */}
              <Card className="bg-[#FFFFFF] border border-[#DCE3EC] p-6 space-y-4 shadow-sm">
                <div className="flex items-center space-x-2 border-b border-[#DCE3EC] pb-3">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-bold text-[#142B4A]">Resume Quality Suggestions</h3>
                </div>
                <div className="space-y-2.5">
                  {(parsedData.resume_feedback || [
                    'Quantify achievements (e.g. "Reduced API latency by 35%")',
                    'Ensure technical keywords match applicant tracking system (ATS) filters',
                    'Include live demo and GitHub repository links for core projects',
                  ]).map((tip: string, i: number) => (
                    <div key={i} className="flex items-start space-x-2 text-xs text-[#334155]">
                      <ArrowRight className="w-4 h-4 text-[#142B4A] shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Recommended Projects */}
              <Card className="bg-[#FFFFFF] border border-[#DCE3EC] p-6 space-y-4 shadow-sm">
                <div className="flex items-center space-x-2 border-b border-[#DCE3EC] pb-3">
                  <Briefcase className="w-5 h-5 text-[#142B4A]" />
                  <h3 className="text-sm font-bold text-[#142B4A]">Recommended Gap-Closing Projects</h3>
                </div>
                <div className="space-y-3">
                  {(parsedData.suggested_projects || [
                    {
                      title: 'Microservices Backend with Distributed Tracing',
                      description: 'Build a scalable API gateway utilizing Docker, PostgreSQL, and OpenTelemetry.',
                      difficulty: 'Intermediate',
                      skills_learned: ['FastAPI', 'Docker', 'PostgreSQL'],
                    },
                    {
                      title: 'Real-Time Collaborative Dashboard',
                      description: 'Implement WebSocket connections, state synchronization, and component caching.',
                      difficulty: 'Advanced',
                      skills_learned: ['React', 'TypeScript', 'System Design'],
                    },
                  ]).map((p: any, i: number) => (
                    <div key={i} className="p-3 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-[#142B4A]">{p.title}</p>
                        <span className="text-[10px] font-semibold text-[#142B4A] bg-white border border-[#DCE3EC] px-1.5 py-0.5 rounded">
                          {p.difficulty || 'Intermediate'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#475569]">{p.description}</p>
                      {p.skills_learned && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {p.skills_learned.map((sk: string, ski: number) => (
                            <span key={ski} className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded font-medium">
                              +{sk}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Ethical Disclaimer */}
          <div className="p-4 bg-[#F8FAFC] border border-[#DCE3EC] rounded-2xl flex items-start space-x-3 text-[#64748B] text-[11px]">
            <Info className="w-4 h-4 text-[#142B4A] shrink-0 mt-0.5" />
            <p>
              <strong>Disclaimer:</strong> The SkillNova AI Resume Analyzer provides advisory diagnostic feedback based on text extraction and role benchmarking. Results do not constitute an employer guarantee or hiring commitment.
            </p>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <Modal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          title="Past Resume Analyses"
        >
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#142B4A] mb-2" />
                <span>Loading your past resumes...</span>
              </div>
            ) : historyList.length > 0 ? (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {historyList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectHistoryItem(item.id)}
                    className="p-3.5 bg-[#F8FAFC] hover:bg-[#EAF0F7] border border-[#DCE3EC] hover:border-[#142B4A] rounded-xl flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-[#142B4A]">{item.filename}</p>
                      <p className="text-[11px] text-[#64748B]">
                        Target: {item.career_goal} · {item.uploaded_at ? new Date(item.uploaded_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-extrabold text-[#142B4A] bg-white border border-[#DCE3EC] px-2 py-0.5 rounded-lg">
                        Score: {item.analysis_score ?? 0}%
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#64748B]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-center py-6 text-[#64748B]">
                No previous resume uploads found.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
