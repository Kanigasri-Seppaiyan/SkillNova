import React, { useState, useEffect } from 'react';
import { mentorsAPI } from '../services/api';
import { Mentor } from '../types';
import { Card, LoadingState, ErrorState, Modal } from '../components/common/UIComponents';
import { Users, Building2, Send, Sparkles } from 'lucide-react';

export const Mentors: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mentors, setMentors] = useState<Mentor[]>([]);

  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    mentorsAPI
      .getRecommended()
      .then((data) => {
        setMentors(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to calculate mentor match scores.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSendRequest = async () => {
    if (!selectedMentor) return;
    setSending(true);
    try {
      await mentorsAPI.requestMatch(selectedMentor.id, requestMessage || 'I would like your guidance on closing my technical skill gaps.');
      setSuccessMsg(`Match request sent to ${selectedMentor.full_name}!`);
      setTimeout(() => {
        setSelectedMentor(null);
        setSuccessMsg('');
        setRequestMessage('');
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingState message="Matching mentors based on 6-dimension alignment..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#DCE3EC] p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-[#315B8A] text-xs font-bold mb-1">
            <Users className="w-4 h-4" />
            <span>AI Mentor Alignment</span>
          </div>
          <h1 className="text-2xl font-black text-[#142B4A] tracking-tight">Mentor Match Engine</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Ranked by domain relevance, skill gap overlap, target tier experience, and availability.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mentors.map((men) => (
          <Card key={men.id} className="flex flex-col justify-between hover:border-[#142B4A] transition-all">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#142B4A] font-bold text-white flex items-center justify-center text-sm shadow-sm">
                    {men.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#142B4A]">{men.full_name}</h3>
                    <p className="text-[11px] text-[#64748B] flex items-center space-x-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-[#315B8A]" />
                      <span>{men.designation} @ {men.company}</span>
                    </p>
                  </div>
                </div>

                <div className="px-2.5 py-1 bg-[#EAF0F7] border border-[#DCE3EC] rounded-full text-[#142B4A] text-xs font-black flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-[#315B8A]" />
                  <span>{men.match_percentage}% Match</span>
                </div>
              </div>

              {men.bio && <p className="text-xs text-[#64748B] line-clamp-2">{men.bio}</p>}

              {/* Match reasons breakdown */}
              {men.match_reasons && men.match_reasons.length > 0 && (
                <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#DCE3EC] space-y-1.5">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Match Alignment Reasons</span>
                  {(men.match_reasons || []).map((reason, idx) => (
                    <div key={idx} className="text-[11px] text-[#142B4A] font-medium flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#142B4A]" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Skills Tags */}
              <div className="flex flex-wrap gap-1.5">
                {(men.expertise || men.skills_expertise || []).map((exp, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-[#EAF0F7] text-[#142B4A] border border-[#DCE3EC] rounded-md text-[10px] font-semibold"
                  >
                    {exp}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#DCE3EC] flex items-center justify-between">
              <span className="text-[11px] text-[#64748B] font-medium">
                {men.years_experience ?? 5} yrs exp • Max {men.max_students ?? 5} mentees
              </span>
              <button
                onClick={() => setSelectedMentor(men)}
                className="px-3.5 py-1.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5"
              >
                <Send className="w-3 h-3" />
                <span>Request</span>
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Request Modal */}
      <Modal
        isOpen={!!selectedMentor}
        onClose={() => {
          setSelectedMentor(null);
          setSuccessMsg('');
        }}
        title={`Request Mentorship: ${selectedMentor?.full_name}`}
      >
        <div className="space-y-4">
          {successMsg ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center text-xs font-bold">
              {successMsg}
            </div>
          ) : (
            <>
              <p className="text-xs text-[#64748B]">
                Send a personalized request message to highlight which skill gaps you wish to close under their guidance.
              </p>

              <div>
                <label className="block text-xs font-bold text-[#142B4A] mb-1.5">Request Note</label>
                <textarea
                  rows={4}
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Hello, I would value your guidance on backend system design and resolving my placement gaps..."
                  className="w-full p-3 bg-white border border-[#DCE3EC] rounded-xl text-xs text-[#142B4A] focus:outline-none focus:border-[#142B4A]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#DCE3EC]">
                <button
                  type="button"
                  onClick={() => setSelectedMentor(null)}
                  className="px-4 py-2 bg-white hover:bg-[#EAF0F7] border border-[#DCE3EC] text-[#64748B] rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendRequest}
                  disabled={sending}
                  className="px-4 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Match Request'}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
