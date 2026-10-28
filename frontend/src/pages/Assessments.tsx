import React, { useState, useEffect } from 'react';
import { assessmentAPI } from '../services/api';
import { Assessment } from '../types';
import { Card, Badge, LoadingState, ErrorState } from '../components/common/UIComponents';
import { FileCheck2, Clock, HelpCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Assessments: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  useEffect(() => {
    assessmentAPI
      .list()
      .then(setAssessments)
      .catch((err) => {
        console.error(err);
        setError('Failed to load assessment catalog');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading verification assessments..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#142B4A] border border-[#DCE3EC] p-6 rounded-3xl">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold mb-1">
            <FileCheck2 className="w-4 h-4" />
            <span>Verification Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#FFFFFF] tracking-tight">Skill Assessments</h1>
          <p className="text-xs text-[#DCE6F2] mt-1">
            Pass assessments (≥80%) to update your verified skill level and dynamically compress your roadmap!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assessments.map((ass) => (
          <Card key={ass.id} className="flex flex-col justify-between hover:border-indigo-500/40 transition-all bg-white border border-[#DCE3EC]">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <Badge style={{backgroundColor: '#EAF0F7', color: '#142B4A'}}>{ass.category || 'Engineering'}</Badge>
                <div className="flex items-center space-x-1 text-xs text-[#475569] font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{ass.time_limit_minutes} mins</span>
                </div>
              </div>

              <h3 className="text-base font-bold text-black">{ass.title}</h3>
              <p className="text-xs text-[#475569] line-clamp-2">{ass.description}</p>

              <div className="pt-3 border-t border-[#E2E8F0] space-y-2 text-xs text-[#475569]">
                <div className="flex justify-between items-center">
                  <span className="flex items-center space-x-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Total Question Bank:</span>
                  </span>
                  <span className="font-bold text-[#142B4A]">{ass.question_bank_size || 20} questions</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center space-x-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Questions per Attempt:</span>
                  </span>
                  <span className="font-bold text-[#142B4A]">{ass.total_questions || 10}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Duration:</span>
                  </span>
                  <span className="font-bold text-[#142B4A]">{ass.time_limit_minutes} mins</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Pass Mark:</span>
                  </span>
                  <span className="font-bold text-emerald-600">{ass.pass_percentage}%</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/assessments/${ass.id}`)}
              className="mt-5 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
            >
              <span>Start Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
};
