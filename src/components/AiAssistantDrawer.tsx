import React, { useState, useRef, useEffect } from 'react';
import { AiDiagnosisResult, AudioMetrics, ChatMessage, RackKnobSettings } from '../types/audio';
import {
  Brain,
  X,
  Wand2,
  Send,
  CheckCircle2,
  Sliders,
  Sparkles,
  Bot,
  User,
  Loader2,
} from 'lucide-react';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  metrics: AudioMetrics;
  currentKnobs: RackKnobSettings;
  onClose: () => void;
  onApplyRecommendedKnobs: (knobs: Partial<RackKnobSettings>) => void;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  metrics,
  currentKnobs,
  onClose,
  onApplyRecommendedKnobs,
}) => {
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<AiDiagnosisResult | null>(null);
  const [appliedNotice, setAppliedNotice] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        'Welcome! I analyze your live audio key, scale, harmonic profile, and gain levels in real-time. Click **Auto-Tune & EQ Diagnosis** or ask me vocal mixing recommendations for your track!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, diagnosis]);

  const handleDiagnose = async () => {
    setIsDiagnosing(true);
    setAppliedNotice(false);

    try {
      const res = await fetch('/api/ai/diagnose-vocal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: metrics.noteName,
          scale: metrics.scaleName,
          peakDb: metrics.peakDb > -80 ? metrics.peakDb.toFixed(1) : '-18.0',
          rmsDb: metrics.rmsDb > -80 ? metrics.rmsDb.toFixed(1) : '-22.0',
          lufsDb: metrics.lufsDb > -80 ? metrics.lufsDb.toFixed(1) : '-25.0',
          currentKnobs,
        }),
      });

      const data = await res.json();
      setDiagnosis(data);

      // Append assistant message in chat log
      setMessages((prev) => [
        ...prev,
        {
          id: 'user-diag-' + Date.now(),
          role: 'user',
          content: 'Diagnose current vocal & suggest optimal DSP rack settings.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        {
          id: 'diag-' + Date.now(),
          role: 'model',
          content: `**Diagnosis**: ${data.summary}\n\n**Action Items**:\n${data.recommendations
            .map((r: string, i: number) => `${i + 1}. ${r}`)
            .join('\n')}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleApplyKnobs = () => {
    if (diagnosis?.recommendedKnobs) {
      onApplyRecommendedKnobs(diagnosis.recommendedKnobs);
      setAppliedNotice(true);
      setTimeout(() => setAppliedNotice(false), 3000);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputPrompt.trim();
    if (!text || isSending) return;

    if (!textToSend) setInputPrompt('');

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsSending(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          context: {
            key: metrics.noteName,
            scale: metrics.scaleName,
            peakDb: metrics.peakDb > -80 ? metrics.peakDb.toFixed(1) : '-18.0',
            rmsDb: metrics.rmsDb > -80 ? metrics.rmsDb.toFixed(1) : '-22.0',
          },
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: 'ai-' + Date.now(),
          role: 'model',
          content: data.reply || 'Vocal settings updated. Ensure headroom before final limiting.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'model',
          content:
            'I recommend applying a 90Hz high pass filter and setting compressor ratio to 4:1 for a punchy vocal mix.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const quickQuestions = [
    'How to make vocals sit over heavy 808 bass?',
    'What attack time keeps vocal consonants punchy?',
    'Best autotune speed for Travis Scott style vocals?',
    'How to clean vocal mud without thinning out the body?',
  ];

  return (
    <aside
      className={`fixed right-0 top-0 bottom-0 w-96 max-w-full bg-[#101116] border-l border-[#262933] flex flex-col z-30 shadow-2xl transition-transform duration-300 ease-in-out select-none ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Drawer Top Header */}
      <div className="p-4 border-b border-[#262933] flex items-center justify-between bg-[#15171e]">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
              SAUC3 AI Vocal Assistant
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">Gemini 3.8 Flash Audio Intelligence</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition"
          title="Close Drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Live Input Context & Diagnosis Action Card */}
      <div className="p-3 bg-[#050608] border-b border-[#262933] space-y-2.5">
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          <span>Live Input Telemetry</span>
          <span className="text-emerald-400">GROUNDED</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="bg-[#15171e] p-2 rounded-lg border border-[#262933]">
            <span className="text-slate-400">KEY:</span>{' '}
            <span className="text-[#00f2fe] font-bold">
              {metrics.noteName} {metrics.scaleName}
            </span>
          </div>
          <div className="bg-[#15171e] p-2 rounded-lg border border-[#262933]">
            <span className="text-slate-400">PEAK:</span>{' '}
            <span className="text-emerald-400 font-bold tabular-nums">
              {metrics.peakDb > -80 ? `${metrics.peakDb.toFixed(1)} dB` : '-INF'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDiagnose}
          disabled={isDiagnosing}
          className="w-full bg-rose-600/20 hover:bg-rose-600/30 text-[#00f2fe] border border-[#00f2fe]/40 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm active:scale-[0.98] disabled:opacity-50"
        >
          {isDiagnosing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#00f2fe]" />
              <span>Analyzing Spectral Balance...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 text-[#00f2fe]" />
              <span>Auto-Tune & EQ Diagnosis</span>
            </>
          )}
        </button>

        {/* Diagnosis Result Box if available */}
        {diagnosis && (
          <div className="bg-[#15171e] border border-slate-700/60 rounded-lg p-2.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-rose-500" />
              <span>Recommended Module Tuning</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
              {diagnosis.summary}
            </p>

            {diagnosis.recommendedKnobs && (
              <button
                type="button"
                onClick={handleApplyKnobs}
                className="w-full mt-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-semibold py-1.5 rounded flex items-center justify-center gap-1.5 transition shadow"
              >
                {appliedNotice ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>Applied to Rack Modules!</span>
                  </>
                ) : (
                  <>
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Apply Settings to Rack</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Multi-turn Chat Stream */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 font-mono text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg border leading-relaxed ${
              msg.role === 'user'
                ? 'bg-rose-600/20 border-rose-600/30 text-slate-100 ml-4'
                : 'bg-[#15171e] border-[#262933] text-slate-300 mr-2 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-1 text-[10px]">
              <span className="font-bold flex items-center gap-1.5 text-[#00f2fe]">
                {msg.role === 'user' ? (
                  <>
                    <User className="w-3 h-3" />
                    <span>PRODUCER</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3" />
                    <span>SAUC3 AGENT</span>
                  </>
                )}
              </span>
              <span className="text-slate-500">{msg.timestamp}</span>
            </div>
            <div className="whitespace-pre-line text-slate-200">{msg.content}</div>
          </div>
        ))}
        {isSending && (
          <div className="bg-[#15171e] border border-[#262933] p-3 rounded-lg text-slate-400 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00f2fe]" />
            <span className="text-xs">Generating engineering advice...</span>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Quick Prompts Carousel */}
      <div className="px-3 py-1.5 bg-[#0a0b0e] border-t border-[#262933] overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-none">
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(q)}
            className="text-[10px] font-mono bg-[#15171e] hover:bg-slate-800 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-full transition shrink-0"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Input Form */}
      <div className="p-3 border-t border-[#262933] bg-[#15171e]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Ask vocal mixing or rack advice..."
            className="flex-1 bg-[#050608] border border-[#262933] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#00f2fe] font-mono transition"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isSending}
            className="bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white px-3.5 py-2 rounded-lg text-xs transition flex items-center justify-center shrink-0"
            title="Send Message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </aside>
  );
};
