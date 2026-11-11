import React, { useEffect, useState } from 'react';
import { audio } from '../audio/AudioEngine';
import { AudioMetrics, VisualizerMode } from '../types/audio';
import { Visualizer } from './Visualizer';
import { Activity, Gauge, Music, Info, AlertTriangle, CheckCircle } from 'lucide-react';

const CHROMA_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface AnalyzerPanelProps {
  visualizerMode: VisualizerMode;
  onVisualizerModeChange: (mode: VisualizerMode) => void;
}

export const AnalyzerPanel: React.FC<AnalyzerPanelProps> = ({
  visualizerMode,
  onVisualizerModeChange,
}) => {
  const [metrics, setMetrics] = useState<AudioMetrics>(audio.metrics);

  useEffect(() => {
    let animId: number;
    const updateLoop = () => {
      setMetrics({ ...audio.metrics });
      animId = requestAnimationFrame(updateLoop);
    };
    animId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const peakStr = metrics.peakDb > -80 ? `${metrics.peakDb.toFixed(1)} dB` : '-INF';
  const rmsStr = metrics.rmsDb > -80 ? `${metrics.rmsDb.toFixed(1)} dB` : '-INF';
  const lufsStr = metrics.lufsDb > -80 ? `${metrics.lufsDb.toFixed(1)} LUFS` : '-INF';

  // Bar percentages
  const peakPct = Math.min(100, Math.max(0, (metrics.peakDb + 60) * 1.66));
  const rmsPct = Math.min(100, Math.max(0, (metrics.rmsDb + 60) * 1.66));
  const centsLeft = Math.min(95, Math.max(5, 50 + metrics.cents / 2));

  // Headroom status evaluation
  let statusBadge = {
    text: 'OPTIMAL',
    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: CheckCircle,
    tip: 'Vocal recording headroom is ideal (-18 to -12 dBFS). Preamp tube saturation is clean.',
  };

  if (metrics.peakDb > -1.0) {
    statusBadge = {
      text: 'CLIPPING RISK',
      color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      icon: AlertTriangle,
      tip: 'Signal is peaking near 0 dBFS! Back off Preamp Gain or Trim Out to prevent harsh digital clipping.',
    };
  } else if (metrics.peakDb < -35 && audio.isPlaying) {
    statusBadge = {
      text: 'TOO LOW',
      color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      icon: Info,
      tip: 'Input signal is quiet. Increase Preamp Gain +6dB for healthy signal-to-noise ratio.',
    };
  }

  const StatusIcon = statusBadge.icon;

  return (
    <aside className="w-80 bg-[#101116] border-r border-[#262933] flex flex-col p-3 space-y-3 overflow-y-auto shrink-0 select-none">
      {/* Panel Top Header */}
      <div className="flex items-center justify-between border-b border-[#262933] pb-2">
        <span className="text-xs font-bold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#00f2fe]" />
          Real-time Analyzer
        </span>
        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 font-mono font-semibold">
          LIVE 60FPS
        </span>
      </div>

      {/* Musical Key & Scale Detector */}
      <div className="bg-[#15171e] border border-[#262933] rounded-xl p-3 relative overflow-hidden shadow-lg">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#00f2fe]/5 rounded-full blur-xl pointer-events-none" />

        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Music className="w-3 h-3 text-[#00f2fe]" />
            Musical Key & Scale
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            CONF: {metrics.confidence > 0 ? `${metrics.confidence}%` : '--%'}
          </span>
        </div>

        {/* Note & Frequency Readout */}
        <div className="flex items-baseline justify-between py-1.5">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono tracking-tight text-[#00f2fe]">
              {metrics.noteName}
            </span>
            <span className="text-base text-slate-300 font-medium">
              {metrics.scaleName}
            </span>
          </div>
          <div className="text-right font-mono">
            <div className="text-xs text-slate-300 font-bold tabular-nums">
              {metrics.pitchHz > 0 ? `${metrics.pitchHz.toFixed(1)} Hz` : '-- Hz'}
            </div>
            <div className={`text-[10px] tabular-nums font-semibold ${Math.abs(metrics.cents) < 8 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {metrics.cents >= 0 ? `+${metrics.cents}` : metrics.cents} Cents
            </div>
          </div>
        </div>

        {/* Pitch Tuning Center Bar */}
        <div className="w-full bg-[#050608] h-2 rounded-full overflow-hidden relative border border-[#262933] mt-1">
          <div className="absolute top-0 bottom-0 w-0.5 bg-slate-600 left-1/2 -translate-x-1/2 z-10" />
          <div
            className="h-full bg-[#00f2fe] w-2.5 rounded-full relative transition-all duration-75 shadow-[0_0_8px_#00f2fe]"
            style={{ left: `${centsLeft}%` }}
          />
        </div>

        {/* 12-Tone Chroma Distribution Profile */}
        <div className="mt-3">
          <div className="grid grid-cols-12 gap-1 h-9 items-end bg-[#050608] p-1 rounded-lg border border-[#262933]">
            {CHROMA_NOTES.map((note, idx) => {
              const val = metrics.chroma[idx] || 0.1;
              const isDetected = note === metrics.noteName;
              return (
                <div
                  key={note}
                  className={`rounded-t transition-all duration-100 ${
                    isDetected ? 'bg-[#00f2fe] shadow-[0_0_6px_#00f2fe]' : 'bg-rose-600/60'
                  }`}
                  style={{ height: `${Math.max(15, val * 100)}%` }}
                  title={`${note}: ${(val * 100).toFixed(0)}% energy`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[8px] font-mono text-slate-400 mt-1 px-1">
            {CHROMA_NOTES.map((note) => (
              <span
                key={note}
                className={note === metrics.noteName ? 'text-[#00f2fe] font-bold' : ''}
              >
                {note.length === 1 ? note : ''}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Gain Staging & Loudness Engine */}
      <div className="bg-[#15171e] border border-[#262933] rounded-xl p-3 space-y-3 shadow-lg">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Gauge className="w-3 h-3 text-[#00f2fe]" />
            Gain Staging Engine
          </span>
          <span className={`text-[10px] border px-1.5 py-0.5 rounded font-mono font-semibold ${statusBadge.color}`}>
            {statusBadge.text}
          </span>
        </div>

        {/* 3 Metric Readout Cards */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-[#050608] p-2 rounded-lg border border-[#262933]">
            <div className="text-[9px] text-slate-400 font-mono tracking-wider">PEAK</div>
            <div className="text-sm font-bold font-mono text-slate-100 tabular-nums">
              {peakStr}
            </div>
          </div>
          <div className="bg-[#050608] p-2 rounded-lg border border-[#262933]">
            <div className="text-[9px] text-slate-400 font-mono tracking-wider">RMS</div>
            <div className="text-sm font-bold font-mono text-slate-100 tabular-nums">
              {rmsStr}
            </div>
          </div>
          <div className="bg-[#050608] p-2 rounded-lg border border-[#262933]">
            <div className="text-[9px] text-slate-400 font-mono tracking-wider">LUFS</div>
            <div className="text-sm font-bold font-mono text-slate-100 tabular-nums">
              {lufsStr}
            </div>
          </div>
        </div>

        {/* Level VU Meter Bars */}
        <div className="space-y-2 pt-1 font-mono">
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>PEAK LEVEL</span>
              <span className="text-slate-500">-18 dB Target</span>
            </div>
            <div className="h-2 bg-[#050608] rounded-full overflow-hidden border border-[#262933] p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 rounded-full transition-all duration-75"
                style={{ width: `${peakPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>RMS POWER</span>
              <span className="text-slate-500">DYNAMIC DENSITY</span>
            </div>
            <div className="h-2 bg-[#050608] rounded-full overflow-hidden border border-[#262933] p-0.5">
              <div
                className="h-full bg-[#00f2fe] rounded-full transition-all duration-75 shadow-[0_0_6px_#00f2fe]"
                style={{ width: `${rmsPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Headroom Recommendation Box */}
        <div className="bg-[#050608]/70 border border-[#262933] rounded-lg p-2.5 text-[11px] text-slate-300 flex items-start gap-2">
          <StatusIcon className="w-4 h-4 text-[#00f2fe] shrink-0 mt-0.5" />
          <span className="leading-snug">{statusBadge.tip}</span>
        </div>
      </div>

      {/* Embedded 60FPS Scope & FFT Visualizer */}
      <div className="flex-1 flex flex-col min-h-[140px]">
        <Visualizer mode={visualizerMode} onModeChange={onVisualizerModeChange} />
      </div>
    </aside>
  );
};
