import React, { useRef } from 'react';
import { audio } from '../audio/AudioEngine';
import { InputSourceType } from '../types/audio';
import {
  Mic,
  FileAudio,
  AudioWaveform,
  Upload,
  Play,
  Pause,
  Square,
  Repeat,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

interface HeaderProps {
  currentSource: InputSourceType;
  isPlaying: boolean;
  isLooping: boolean;
  peakDb: number;
  fileName: string | null;
  onSourceChange: (source: InputSourceType) => void;
  onFileUpload: (file: File) => void;
  onTogglePlay: () => void;
  onStop: () => void;
  onToggleLoop: () => void;
  onToggleAiDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSource,
  isPlaying,
  isLooping,
  peakDb,
  fileName,
  onSourceChange,
  onFileUpload,
  onTogglePlay,
  onStop,
  onToggleLoop,
  onToggleAiDrawer,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const peakStr = peakDb > -80 ? `${peakDb.toFixed(1)} dB` : '-INF dB';

  return (
    <header className="h-14 bg-[#101116] border-b border-[#262933] flex items-center justify-between px-4 z-20 shrink-0 select-none">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 via-rose-500 to-[#00f2fe] flex items-center justify-center font-black text-white text-base tracking-wider shadow-lg">
          S3
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wider text-slate-100 flex items-center gap-2">
            SAUC3 AGENT
            <span className="text-[10px] bg-rose-600/30 text-[#00f2fe] border border-[#00f2fe]/30 px-1.5 py-0.2 rounded font-mono font-semibold">
              v2.5 RACK
            </span>
          </h1>
          <p className="text-[10px] text-slate-400 font-mono tracking-tight">
            DIGITAL AUDIO RACK & STUDIO ASSISTANT
          </p>
        </div>
      </div>

      {/* Zone 2: Transport & Input Source Switcher */}
      <div className="flex items-center space-x-3">
        {/* Source Switcher */}
        <div className="flex bg-[#050608] rounded-lg border border-[#262933] p-1 space-x-1">
          <button
            type="button"
            onClick={() => onSourceChange('mic')}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              currentSource === 'mic'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Switch to Live Microphone"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Live Mic</span>
          </button>
          <button
            type="button"
            onClick={() => onSourceChange('file')}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              currentSource === 'file'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Switch to Audio File Playback"
          >
            <FileAudio className="w-3.5 h-3.5" />
            <span className="max-w-[100px] truncate">{fileName || 'Audio File'}</span>
          </button>
          <button
            type="button"
            onClick={() => onSourceChange('demo')}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              currentSource === 'demo'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Switch to Demo Vocal Harmony Tone"
          >
            <AudioWaveform className="w-3.5 h-3.5" />
            <span>Demo Tone</span>
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Import Track Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="bg-[#15171e] border border-[#262933] hover:border-slate-500 hover:text-white text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 transition"
          title="Import vocal track or backing stem (WAV, MP3, AAC, FLAC)"
        >
          <Upload className="w-3.5 h-3.5 text-[#00f2fe]" />
          <span>Import Track</span>
        </button>

        {/* Transport Controls */}
        <div className="flex items-center space-x-1 bg-[#050608] px-2 py-1 rounded-lg border border-[#262933]">
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-8 h-8 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-[#00f2fe]" />
            ) : (
              <Play className="w-4 h-4 text-slate-200 fill-slate-200" />
            )}
          </button>
          <button
            type="button"
            onClick={onStop}
            className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="Stop"
          >
            <Square className="w-3.5 h-3.5 fill-slate-400" />
          </button>
          <button
            type="button"
            onClick={onToggleLoop}
            className={`w-8 h-8 rounded flex items-center justify-center transition ${
              isLooping
                ? 'text-[#00f2fe] bg-[#00f2fe]/15 border border-[#00f2fe]/30'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Seamless Loop"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Zone 3: Master Meter & AI Assistant Drawer Trigger */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-[#050608] px-3 py-1 rounded-lg border border-[#262933] font-mono text-xs">
          <span className="text-slate-500 text-[10px]">PEAK</span>
          <span
            className={`font-bold tabular-nums w-16 text-right ${
              peakDb > -1.0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {peakStr}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleAiDrawer}
          className="bg-gradient-to-r from-rose-600 to-purple-600 hover:brightness-110 text-white text-xs px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-2 shadow-lg transition active:scale-[0.98]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Vocal Agent</span>
        </button>
      </div>
    </header>
  );
};
