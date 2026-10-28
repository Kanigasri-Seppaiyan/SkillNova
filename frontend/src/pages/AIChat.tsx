import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, LoadingState } from '../components/common/UIComponents';
import { VoiceAssistant } from '../components/voice/VoiceAssistant';
import { Bot, Send, User as UserIcon, Sparkles, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Message {
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AIChat: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>((location.state as any)?.initialPrompt || '');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Load chat history
    aiAPI
      .getHistory()
      .then((history) => {
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          setMessages([
            {
              sender: 'assistant',
              content: `Hello ${user?.full_name || 'there'}! I am your SkillNova AI Career Coach. I have full context of your profile, active skill gaps, and roadmap. How can I help your career today?`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      sender: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentQuery = input;
    setInput('');
    setLoading(true);

    try {
      const lang = i18n.language || 'en';
      const res = await aiAPI.sendMessage(currentQuery, lang);
      const botMsg: Message = {
        sender: 'assistant',
        content: res.reply || res.message || 'I am processing your query against your live profile context.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          content: 'Sorry, I encountered an issue connecting to the AI Coach service. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-[#DCE3EC] p-4 rounded-2xl shrink-0 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#142B4A] flex items-center justify-center text-white shadow-md">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#142B4A] flex items-center space-x-2">
              <span>Grounded AI Career Coach</span>
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </h2>
            <p className="text-xs text-[#5A6A80]">Contextualized with your live Skill Gaps & Placement Score • Powered by Google Gemini</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-[#142B4A] bg-[#F4F6F8] px-3 py-1.5 rounded-xl border border-[#DCE3EC]">
          <Globe className="w-3.5 h-3.5 text-indigo-600" />
          <span className="uppercase font-mono font-bold text-[#142B4A]">{i18n.language}</span>
        </div>
      </div>

      {/* Embedded Voice Assistant Widget */}
      <VoiceAssistant language={i18n.language} />

      {/* Messages Stream */}
      <Card className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col justify-between bg-white border border-[#DCE3EC] shadow-sm">
        <div className="space-y-4">
          {messages.map((msg, idx) => {
            const isBot = msg.sender === 'assistant';
            return (
              <div
                key={idx}
                className={`flex items-start space-x-3 ${isBot ? 'justify-start' : 'justify-end'}`}
              >
                {isBot && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0 mt-1 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed ${
                    isBot
                      ? 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#1E293B] shadow-sm'
                      : 'bg-[#142B4A] text-white shadow-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <span className={`block text-[10px] mt-2 font-mono ${isBot ? 'text-[#64748B]' : 'text-slate-300'}`}>
                    {msg.timestamp}
                  </span>
                </div>

                {!isBot && (
                  <div className="w-8 h-8 rounded-lg bg-[#142B4A]/10 border border-[#142B4A]/20 flex items-center justify-center text-[#142B4A] shrink-0 mt-1">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
          {loading && (
            <div className="flex items-center space-x-2 text-xs text-indigo-600 font-medium animate-pulse p-2">
              <Bot className="w-4 h-4" />
              <span>AI Coach is pondering your career trajectory...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </Card>

      {/* Input Box */}
      <form onSubmit={handleSend} className="flex items-center space-x-3 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI about how to close your top skill gap or prepare for interviews..."
          className="flex-1 p-3.5 bg-white border border-[#DCE3EC] rounded-2xl text-xs text-[#142B4A] placeholder-[#94A3B8] focus:outline-none focus:border-[#142B4A] focus:ring-1 focus:ring-[#142B4A] transition-all shadow-sm"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-3.5 bg-[#142B4A] hover:bg-[#1E3E6B] text-white rounded-2xl shadow-md transition-all disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
