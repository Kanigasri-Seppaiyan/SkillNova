import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentAPI } from '../services/api';
import { Assessment, AssessmentQuestion, AssessmentResult, QuestionAnswerSubmit } from '../types';
import { Card, LoadingState, ErrorState, Modal, Badge } from '../components/common/UIComponents';
import { Clock, CheckCircle2, XCircle, Award, AlertCircle, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';

export const AssessmentTake: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [attemptId, setAttemptId] = useState<number | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(900);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const [resultModal, setResultModal] = useState<AssessmentResult | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    assessmentAPI
      .start(parseInt(id, 10))
      .then((data: any) => {
        setAssessment(data.assessment as any);
        setQuestions(data.questions || []);
        setAttemptId(data.attempt_id);
        setTimeLeftSeconds((data.assessment?.time_limit_minutes || 15) * 60);

        // Restore any previously saved answers from backend or local session
        const localCacheKey = `skillnova_attempt_${id}_${data.attempt_id}`;
        let localAnswers: Record<number, string> = {};
        try {
          const raw = localStorage.getItem(localCacheKey);
          if (raw) localAnswers = JSON.parse(raw);
        } catch (e) {
          console.warn('Could not parse local answer cache');
        }

        const mergedAnswers = { ...(data.saved_answers || {}), ...localAnswers };
        if (Object.keys(mergedAnswers).length > 0) {
          setAnswers(mergedAnswers);
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to initialize assessment session.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (!attemptId || resultModal || timeLeftSeconds <= 0) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attemptId, resultModal, timeLeftSeconds]);

  const handleSelectOption = (qId: number, optionKey: string) => {
    if (submitting || resultModal) return;
    setAnswers((prev) => {
      const updated = { ...prev, [qId]: optionKey };
      if (attemptId && id) {
        localStorage.setItem(`skillnova_attempt_${id}_${attemptId}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!id || !attemptId || submitting) return;
    setSubmitting(true);

    const formattedAnswers: QuestionAnswerSubmit[] = questions.map((q) => ({
      question_id: q.id,
      selected_option: answers[q.id] || '',
      time_taken_seconds: 30,
    }));

    try {
      const res = await assessmentAPI.submit(parseInt(id, 10), attemptId, formattedAnswers);
      setResultModal(res);
      // Clean up local draft cache upon successful completion
      localStorage.removeItem(`skillnova_attempt_${id}_${attemptId}`);
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Failed to submit assessment answers.';
      setError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Loading assessment questions..." />;
  if (error) return <ErrorState message={error} onRetry={() => navigate('/assessments')} />;

  const currentQ = questions[currentIndex];
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const answeredCount = Object.keys(answers).filter((k) => !!answers[parseInt(k, 10)]).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);
  const progressPercent = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="bg-[#142B4A] border border-[#1E3A5F] p-5 rounded-3xl space-y-3 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Skill Verification Assessment</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">{assessment?.title}</h2>
            <p className="text-xs text-white/70 mt-0.5">
              Question {currentIndex + 1} of {questions.length} &bull; Pass Mark: 80% (8/10 required)
            </p>
          </div>

          <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-white/10 border border-white/20 rounded-xl text-white text-xs font-mono font-bold self-start sm:self-auto">
            <Clock className="w-4 h-4 text-indigo-300" />
            <span>{formatTime(timeLeftSeconds)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-400 to-indigo-200 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Quick Question Bubble Selector */}
      <div className="flex flex-wrap gap-2 justify-center py-1">
        {questions.map((q, idx) => {
          const isAnswered = !!answers[q.id];
          const isCurrent = idx === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={`w-8 h-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                isCurrent
                  ? 'bg-[#142B4A] text-white ring-2 ring-indigo-500 shadow-md'
                  : isAnswered
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-white text-slate-600 border border-[#DCE3EC] hover:bg-slate-50'
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Question Card */}
      {currentQ && (
        <Card gradientBorder className="space-y-6 bg-white border border-[#DCE3EC] p-6 rounded-3xl shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge style={{ backgroundColor: '#EAF0F7', color: '#142B4A' }}>
                Difficulty: {typeof currentQ.difficulty === 'string' ? currentQ.difficulty.toUpperCase() : `Level ${currentQ.difficulty}`}
              </Badge>
              <span className="text-xs text-[#64748B] font-medium">
                {answers[currentQ.id] ? (
                  <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Answered ({answers[currentQ.id].toUpperCase()})</span>
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Not answered yet</span>
                )}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#142B4A] leading-snug">
              {currentQ.question_text}
            </h3>
          </div>

          {/* Answer Options A, B, C, D */}
          <div className="space-y-3">
            {[
              { key: 'a', text: currentQ.option_a },
              { key: 'b', text: currentQ.option_b },
              { key: 'c', text: currentQ.option_c },
              { key: 'd', text: currentQ.option_d },
            ]
              .filter((opt) => opt.text)
              .map((opt) => {
                const isSelected = answers[currentQ.id] === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleSelectOption(currentQ.id, opt.key)}
                    className={`w-full text-left p-4 rounded-2xl border text-xs font-semibold transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#EAF0F7] border-[#142B4A] text-[#142B4A] shadow-md shadow-[#142B4A]/10 ring-1 ring-[#142B4A]'
                        : 'bg-[#F8FAFC] border-[#DCE3EC] text-[#142B4A] hover:bg-[#EAF0F7] hover:border-[#315B8A]'
                    }`}
                  >
                    <span className="flex items-center space-x-3.5">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#142B4A] text-white shadow-sm'
                            : 'bg-white border border-[#CBD5E1] text-[#142B4A]'
                        }`}
                      >
                        {opt.key}
                      </span>
                      <span className="leading-relaxed">{opt.text}</span>
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[#142B4A] shrink-0 ml-3" />}
                  </button>
                );
              })}
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-4 border-t border-[#DCE3EC]">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#EAF0F7] text-[#142B4A] border border-[#DCE3EC] rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-[#DCE3EC] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs text-[#64748B] font-medium hidden sm:inline-block">
              {answeredCount} of {questions.length} answered
            </span>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="flex items-center space-x-1.5 px-5 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#142B4A]/20"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setConfirmSubmitOpen(true)}
                disabled={submitting}
                className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-lg shadow-emerald-600/30"
              >
                <Award className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : 'Submit Assessment'}</span>
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Confirmation Dialog Before Submitting */}
      <Modal
        isOpen={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        title="Submit Assessment Confirmation"
      >
        <div className="space-y-4">
          <div className="p-4 bg-[#EAF0F7] rounded-2xl border border-[#DCE3EC]">
            <p className="text-sm font-bold text-[#142B4A]">
              Ready to submit your assessment?
            </p>
            <p className="text-xs text-[#475569] mt-1.5">
              You have answered <strong className="text-[#142B4A] font-bold">{answeredCount}</strong> of{' '}
              <strong className="text-[#142B4A] font-bold">{questions.length}</strong> questions.
            </p>
            {unansweredCount > 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  You have <strong>{unansweredCount} unanswered question(s)</strong>. Any unanswered questions will receive 0 marks.
                </span>
              </div>
            )}
            <p className="text-[11px] text-[#64748B] mt-2 italic">
              Once submitted, your responses will be evaluated and verified skill levels updated.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={() => setConfirmSubmitOpen(false)}
              className="px-4 py-2 border border-[#DCE3EC] text-[#142B4A] rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all"
            >
              Review Questions
            </button>
            <button
              onClick={() => {
                setConfirmSubmitOpen(false);
                handleSubmit();
              }}
              disabled={submitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30"
            >
              {submitting ? 'Submitting...' : 'Confirm & Submit'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detailed Result Breakdown Modal */}
      <Modal
        isOpen={!!resultModal}
        onClose={() => navigate('/assessments')}
        title="Assessment Result & Verification"
      >
        {resultModal && (
          <div className="space-y-5">
            {/* Header Score Card */}
            <div className="text-center py-4 bg-[#EAF0F7] rounded-2xl border border-[#DCE3EC]">
              <span className="text-xs text-[#64748B] font-semibold uppercase tracking-wider">Overall Score</span>
              <div className="text-4xl font-extrabold my-1 text-transparent bg-clip-text bg-gradient-to-r from-[#142B4A] to-[#315B8A]">
                {resultModal.score}%
              </div>
              <div className="inline-block mt-1">
                <Badge variant={resultModal.passed ? 'success' : 'danger'}>
                  {resultModal.passed ? 'PASSED (≥80%)' : 'NEEDS REVISION (<80%)'}
                </Badge>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-[#DCE3EC] px-3 text-center">
                <div className="p-2 bg-white rounded-xl border border-[#DCE3EC]">
                  <span className="block text-[10px] text-[#64748B] uppercase">Total</span>
                  <span className="text-sm font-bold text-[#142B4A]">{resultModal.total_questions}</span>
                </div>
                <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="block text-[10px] text-emerald-700 uppercase">Correct</span>
                  <span className="text-sm font-bold text-emerald-700">{resultModal.correct_count}</span>
                </div>
                <div className="p-2 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="block text-[10px] text-rose-700 uppercase">Incorrect</span>
                  <span className="text-sm font-bold text-rose-700">{resultModal.incorrect_count}</span>
                </div>
                <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-200">
                  <span className="block text-[10px] text-indigo-700 uppercase">Pass Mark</span>
                  <span className="text-sm font-bold text-indigo-700">80%</span>
                </div>
              </div>
            </div>

            {/* Question Breakdown with Explanations */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              <h4 className="text-xs font-bold text-[#142B4A] flex items-center justify-between">
                <span>Detailed Question Explanations</span>
                <span className="text-[11px] text-[#64748B] font-normal">
                  {resultModal.correct_count} of {resultModal.total_questions} correct
                </span>
              </h4>
              {resultModal.breakdown.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    item.is_correct
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/70 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex justify-between items-start font-semibold">
                    <span>
                      Q{idx + 1}: {item.question_text}
                    </span>
                    {item.is_correct ? (
                      <span className="flex items-center space-x-1 text-emerald-600 shrink-0 ml-2 text-[11px]">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Correct</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-rose-600 shrink-0 ml-2 text-[11px]">
                        <XCircle className="w-4 h-4" />
                        <span>Incorrect</span>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-white/80 border border-current font-medium">
                      Your answer: <strong>{item.selected_option ? item.selected_option.toUpperCase() : 'None'}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/80 border border-current font-medium">
                      Correct answer: <strong>{item.correct_option.toUpperCase()}</strong>
                    </span>
                  </div>
                  {item.explanation && (
                    <div className="pt-1 mt-1 border-t border-black/5 text-[11px] text-[#334155] leading-relaxed">
                      <strong className="text-[#142B4A]">Explanation: </strong>
                      {item.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/assessments')}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#142B4A] rounded-xl text-xs font-bold transition-all"
              >
                Back to Assessments
              </button>
              <button
                onClick={() => navigate('/roadmap')}
                className="w-1/2 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-bold shadow-lg transition-all"
              >
                View Updated Roadmap
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
