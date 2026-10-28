import React, { useState, useEffect } from 'react';
import { RoadmapItem, ProofData } from '../../types';
import { Modal } from '../common/UIComponents';
import { roadmapAPI } from '../../services/api';
import {
  FileCheck2,
  Github,
  PenTool,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Loader2
} from 'lucide-react';

interface ProofModalProps {
  item: RoadmapItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitProof: (item: RoadmapItem, proof: ProofData) => Promise<void>;
}

export const ProofModal: React.FC<ProofModalProps> = ({
  item,
  isOpen,
  onClose,
  onSubmitProof,
}) => {
  const [activeTab, setActiveTab] = useState<'quiz' | 'github' | 'note'>('quiz');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab 1: Quiz state
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<
    Array<{
      id: number;
      question: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
    }>
  >([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Tab 2: GitHub state
  const [githubUrl, setGithubUrl] = useState('');

  // Tab 3: Note state
  const [noteText, setNoteText] = useState('');
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [validatingNote, setValidatingNote] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setError(null);
      setQuizSubmitted(false);
      setSelectedAnswers({});
      setGithubUrl('');
      setNoteText('');
      setAiFeedback(null);
      loadQuiz(item);
    }
  }, [isOpen, item]);

  const loadQuiz = async (task: RoadmapItem) => {
    setQuizLoading(true);
    try {
      const data = await roadmapAPI.getTaskQuiz(task.id, task.title);
      setQuizQuestions(data.questions || []);
    } catch (err) {
      console.error(err);
      setQuizQuestions([
        {
          id: 1,
          question: `What is the primary core objective when implementing '${task.title}'?`,
          options: [
            'Ensure architectural resilience and maintainable code patterns',
            'Avoid writing tests to release rapidly',
            'Bypass modular design conventions',
            'Direct database modifications in production',
          ],
          correctAnswer: 0,
          explanation: 'Best practices focus on resilience, modularity, and clean architectural boundaries.',
        },
        {
          id: 2,
          question: 'Which metric best proves successful completion and efficiency?',
          options: [
            'Lines of code written',
            'Passing integration tests with documented benchmarks',
            'Highest memory consumption',
            'Time spent in editor without profiling',
          ],
          correctAnswer: 1,
          explanation: 'Verified benchmark data and integration tests confirm real functional correctness.',
        },
        {
          id: 3,
          question: 'How does mastering this task improve placement readiness?',
          options: [
            'It closes key technical competency gaps required by top engineering teams',
            'It guarantees memorization without deep comprehension',
            'It replaces foundational CS fundamentals',
            'It avoids code review standards',
          ],
          correctAnswer: 0,
          explanation: 'Demonstrating hands-on mastery directly elevates your technical interview readiness.',
        },
      ]);
    } finally {
      setQuizLoading(false);
    }
  };

  if (!item) return null;

  const handleQuizSubmit = async () => {
    if (Object.keys(selectedAnswers).length < quizQuestions.length) {
      setError('Please answer all 3 questions to verify comprehension.');
      return;
    }

    setQuizSubmitted(true);
    const score = quizQuestions.reduce((acc, q) => {
      return acc + (selectedAnswers[q.id] === q.correctAnswer ? 1 : 0);
    }, 0);

    if (score < 2) {
      setError('You need at least 2 correct answers to pass the verification quiz. Review the explanations and retry!');
      return;
    }

    setSubmitting(true);
    try {
      const proof: ProofData = {
        type: 'quiz',
        verified: true,
        completed_at: new Date().toISOString(),
        data: { score, total: quizQuestions.length, answers: selectedAnswers },
      };
      await onSubmitProof(item, proof);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit quiz verification.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGithubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim()) {
      setError('Please provide a repository or project link.');
      return;
    }
    if (!githubUrl.includes('github.com') && !githubUrl.includes('gitlab.com') && !githubUrl.startsWith('http')) {
      setError('Please provide a valid URL (e.g. https://github.com/username/repo).');
      return;
    }

    setSubmitting(true);
    try {
      const proof: ProofData = {
        type: 'github',
        verified: true,
        completed_at: new Date().toISOString(),
        data: { url: githubUrl.trim() },
      };
      await onSubmitProof(item, proof);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit project proof.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNoteValidationAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sentenceCount = noteText.trim().split(/[.!?]+/).filter(Boolean).length;
    if (noteText.trim().length < 40 || sentenceCount < 2) {
      setError('Please write at least 2 to 3 substantive sentences detailing what you learned.');
      return;
    }

    setValidatingNote(true);
    setError(null);
    try {
      const res = await roadmapAPI.validateReflectionNote(item.id, noteText);
      setAiFeedback(res.feedback || 'Great technical reflection! Key takeaways successfully articulated.');

      setSubmitting(true);
      const proof: ProofData = {
        type: 'note',
        verified: true,
        completed_at: new Date().toISOString(),
        feedback: res.feedback,
        data: { text: noteText.trim() },
      };
      await onSubmitProof(item, proof);
      setTimeout(() => { onClose(); }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to validate reflection note.');
    } finally {
      setValidatingNote(false);
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Verify Proof of Completion">
      <div className="space-y-4">
        {/* Task context banner */}
        <div className="bg-[#F5F7FA] p-3 rounded-xl border border-[#DCE3EC] text-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] block">
            Verifying Task
          </span>
          <p className="font-bold text-[#142B4A] mt-0.5">{item.title}</p>
        </div>

        {/* Tab selection */}
        <div className="grid grid-cols-3 gap-1 bg-[#F5F7FA] p-1 rounded-xl border border-[#DCE3EC]">
          <button
            type="button"
            onClick={() => { setActiveTab('quiz'); setError(null); }}
            className={`py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'quiz'
                ? 'bg-[#142B4A] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#142B4A] hover:bg-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Mini-Quiz</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('github'); setError(null); }}
            className={`py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'github'
                ? 'bg-[#142B4A] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#142B4A] hover:bg-white'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Link</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('note'); setError(null); }}
            className={`py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'note'
                ? 'bg-[#142B4A] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#142B4A] hover:bg-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Learned Note</span>
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: MINI-QUIZ */}
        {activeTab === 'quiz' && (
          <div className="space-y-4">
            {quizLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2 text-[#64748B]">
                <Loader2 className="w-6 h-6 animate-spin text-[#315B8A]" />
                <span className="text-xs">Generating 3 AI verification questions...</span>
              </div>
            ) : (
              <>
                <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                  {quizQuestions.map((q, qIdx) => (
                    <div
                      key={q.id}
                      className="p-3.5 rounded-xl bg-[#F5F7FA] border border-[#DCE3EC] space-y-2.5 text-xs"
                    >
                      <p className="font-bold text-[#142B4A]">
                        {qIdx + 1}. {q.question}
                      </p>
                      <div className="space-y-1.5">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = selectedAnswers[q.id] === optIdx;
                          const showCorrection = quizSubmitted;
                          const isCorrect = optIdx === q.correctAnswer;

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => {
                                setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                                setError(null);
                              }}
                              className={`w-full text-left p-2.5 rounded-lg border text-[11px] transition-all flex items-start space-x-2 ${
                                isSelected
                                  ? showCorrection
                                    ? isCorrect
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                      : 'bg-red-50 border-red-300 text-red-700'
                                    : 'bg-[#EAF0F7] border-[#315B8A] text-[#142B4A] font-semibold'
                                  : 'bg-white border-[#DCE3EC] text-[#475569] hover:border-[#315B8A] hover:bg-[#F5F7FA]'
                              }`}
                            >
                              <span className="font-mono text-[#64748B] shrink-0">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && (
                        <p className="text-[11px] text-[#64748B] italic pt-1 border-t border-[#DCE3EC]">
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleQuizSubmit}
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-[#142B4A] hover:bg-[#1E3A5F] disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Submit Quiz &amp; Complete Task</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* TAB 2: GITHUB LINK */}
        {activeTab === 'github' && (
          <form onSubmit={handleGithubSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#142B4A]">
                Project / Repository URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://github.com/username/project-repo"
                  value={githubUrl}
                  onChange={(e) => { setGithubUrl(e.target.value); setError(null); }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#DCE3EC] text-xs text-[#142B4A] placeholder-[#94A3B8] focus:outline-none focus:border-[#142B4A] focus:ring-2 focus:ring-[#142B4A]/10 transition-colors"
                />
              </div>
              <p className="text-[11px] text-[#64748B]">
                Provide a GitHub repo, commit, or deployed live demo link verifying your work on this topic.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-[#142B4A] hover:bg-[#1E3A5F] disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Verify Link &amp; Complete Task</span>
            </button>
          </form>
        )}

        {/* TAB 3: WHAT I LEARNED NOTE */}
        {activeTab === 'note' && (
          <form onSubmit={handleNoteValidationAndSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#142B4A]">
                What I Learned (2–3 sentences)
              </label>
              <textarea
                rows={4}
                placeholder="Explain the key architectural tradeoffs, lessons learned, and how you applied them..."
                value={noteText}
                onChange={(e) => { setNoteText(e.target.value); setError(null); }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#DCE3EC] text-xs text-[#142B4A] placeholder-[#94A3B8] focus:outline-none focus:border-[#142B4A] focus:ring-2 focus:ring-[#142B4A]/10 transition-colors"
              />
              <p className="text-[11px] text-[#64748B]">
                Our AI coach will review your reflection to ensure deep conceptual grasp.
              </p>
            </div>

            {aiFeedback && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                <span>{aiFeedback}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={validatingNote || submitting}
              className="w-full py-2.5 rounded-xl bg-[#142B4A] hover:bg-[#1E3A5F] disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center space-x-2"
            >
              {validatingNote || submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>AI Validate &amp; Complete Task</span>
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
};
