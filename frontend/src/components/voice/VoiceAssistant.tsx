import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, Loader2 } from 'lucide-react';
import { aiAPI } from '../../services/api';

export const VoiceAssistant: React.FC<{ language?: string }> = ({ language = 'en' }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Check speech recognition browser support
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (language === 'hi') utterance.lang = 'hi-IN';
    else if (language === 'es') utterance.lang = 'es-ES';
    else if (language === 'fr') utterance.lang = 'fr-FR';
    else utterance.lang = 'en-US';

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const startListening = () => {
    setError(null);
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : language === 'es' ? 'es-ES' : language === 'fr' ? 'fr-FR' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError('Microphone permission was denied. Please allow mic access in browser settings.');
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = async () => {
        setIsListening(false);
        if (transcript.trim()) {
          await handleSendVoiceMessage(transcript);
        }
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setError('Failed to start microphone. Please check permissions.');
      setIsListening(false);
    }
  };

  const handleSendVoiceMessage = async (text: string) => {
    setIsLoading(true);
    try {
      const res = await aiAPI.sendMessage(text, language);
      const reply = res.reply || res.message || 'I am sorry, I could not process that.';
      setAiResponse(reply);
      speakText(reply);
    } catch (err) {
      console.error(err);
      setError('AI assistant server error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#DCE3EC] rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold text-[#142B4A]">Voice Assistant</span>
        </div>
        {isSpeaking ? (
          <button
            onClick={stopSpeaking}
            className="flex items-center space-x-1 px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-full text-xs hover:bg-rose-100 transition-colors"
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span>Stop Speaking</span>
          </button>
        ) : (
          <div className="flex items-center space-x-1 text-xs text-[#5A6A80]">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Audio On</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={isListening ? () => {} : startListening}
          disabled={isLoading || isListening}
          className={`relative p-3.5 rounded-full transition-all duration-300 ${
            isListening
              ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/30'
              : isLoading
              ? 'bg-slate-200 text-slate-500'
              : 'bg-[#142B4A] hover:bg-[#1E3E6B] text-white shadow-md hover:scale-105'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isListening ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {isListening ? (
            <p className="text-xs text-indigo-700 animate-pulse font-medium">Listening... "{transcript}"</p>
          ) : isLoading ? (
            <p className="text-xs text-amber-600 animate-pulse font-medium">AI Coach pondering...</p>
          ) : aiResponse ? (
            <p className="text-xs text-[#1E293B] truncate font-medium">{aiResponse}</p>
          ) : (
            <p className="text-xs text-[#5A6A80]">Tap mic to speak with your AI Career Coach</p>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
};
