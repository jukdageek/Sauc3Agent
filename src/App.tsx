import React, { useState, useEffect, useCallback } from 'react';
import { audio } from './audio/AudioEngine';
import {
  InputSourceType,
  ModuleBypassState,
  RackKnobSettings,
  VisualizerMode,
} from './types/audio';
import { Header } from './components/Header';
import { AnalyzerPanel } from './components/AnalyzerPanel';
import { RackChassis } from './components/RackChassis';
import { PRESETS, getPresetById } from './data/presets';
import { AiAssistantDrawer } from './components/AiAssistantDrawer';

const DEFAULT_KNOBS: RackKnobSettings = {
  // 01 Preamp
  preampGain: 6,
  preampDrive: 28,
  preampHpf: 80,
  preampOut: 0,

  // 02 Opto Compressor
  compThresh: -18,
  compRatio: 4,
  compAttack: 20,
  compMakeup: 3,

  // 03 4-Band EQ
  eqLow: -3,
  eqMid: 2,
  eqHigh: 4,
  eqAir: 3,

  // 04 Pitch Correction
  pitchSpeed: 80,
  pitchFormant: 0,
  pitchShift: 0,
  pitchHuman: 20,

  // 05 Space
  spaceDecay: 2.5,
  spaceVerbMix: 20,
  spaceDelayFb: 30,
  spaceDelayMix: 15,

  // 06 Master Limiter
  masterCeiling: -0.1,
  masterGain: 2.0,
  masterClip: 40,
  masterWidth: 110,
};

const DEFAULT_BYPASS: ModuleBypassState = {
  preamp: false,
  comp: false,
  eq: false,
  pitch: false,
  space: false,
  master: false,
};

export default function App() {
  const [knobs, setKnobs] = useState<RackKnobSettings>(DEFAULT_KNOBS);
  const [bypass, setBypass] = useState<ModuleBypassState>(DEFAULT_BYPASS);
  const [selectedPreset, setSelectedPreset] = useState<string>('modern-vocal');
  const [currentSource, setCurrentSource] = useState<InputSourceType>('demo');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('fft');
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [peakDb, setPeakDb] = useState<number>(-18.0);
  const [grDb, setGrDb] = useState<number>(0);

  // Sync DSP whenever knobs or bypass change
  useEffect(() => {
    audio.updateParameters(knobs, bypass);
  }, [knobs, bypass]);

  // Set initial looping in audio engine
  useEffect(() => {
    audio.setLoop(true);
  }, []);

  // Periodic polling for header peak meter & compressor GR
  useEffect(() => {
    const timer = setInterval(() => {
      setPeakDb(audio.metrics.peakDb);
      setGrDb(audio.metrics.gainReductionDb);
      setIsPlaying(audio.isPlaying);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const handleKnobChange = useCallback(
    <K extends keyof RackKnobSettings>(key: K, value: RackKnobSettings[K]) => {
      setKnobs((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleBypassToggle = useCallback((module: keyof ModuleBypassState) => {
    setBypass((prev) => ({ ...prev, [module]: !prev[module] }));
  }, []);

  const handlePresetSelect = useCallback((presetId: string) => {
    setSelectedPreset(presetId);
    const found = getPresetById(presetId);
    if (found?.knobs) {
      setKnobs((prev) => ({ ...prev, ...found.knobs }));
    }
  }, []);

  const handleReset = useCallback(() => {
    handlePresetSelect('bypass');
  }, [handlePresetSelect]);

  const handleSourceChange = useCallback(async (source: InputSourceType) => {
    try {
      setCurrentSource(source);
      await audio.setInputSource(source, () => setIsPlaying(false));
      setIsPlaying(audio.isPlaying);
    } catch (err: any) {
      alert(err.message || 'Error changing audio source');
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const name = await audio.loadAudioFile(file, () => setIsPlaying(false));
      setFileName(name);
      setCurrentSource('file');
      setIsPlaying(audio.isPlaying);
    } catch (err: any) {
      alert('Error loading audio file: ' + err.message);
    }
  }, []);

  const handleTogglePlay = useCallback(() => {
    audio.togglePlayback(() => setIsPlaying(false));
    setIsPlaying(audio.isPlaying);
  }, []);

  const handleStop = useCallback(() => {
    audio.stopPlayback();
    setIsPlaying(false);
  }, []);

  const handleToggleLoop = useCallback(() => {
    const next = !isLooping;
    setIsLooping(next);
    audio.setLoop(next);
  }, [isLooping]);

  const handleApplyRecommendedKnobs = useCallback((recommended: Partial<RackKnobSettings>) => {
    setKnobs((prev) => ({ ...prev, ...recommended }));
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#08090b] text-slate-200">
      {/* Top Header */}
      <Header
        currentSource={currentSource}
        isPlaying={isPlaying}
        isLooping={isLooping}
        peakDb={peakDb}
        fileName={fileName}
        onSourceChange={handleSourceChange}
        onFileUpload={handleFileUpload}
        onTogglePlay={handleTogglePlay}
        onStop={handleStop}
        onToggleLoop={handleToggleLoop}
        onToggleAiDrawer={() => setIsAiDrawerOpen((prev) => !prev)}
      />

      {/* Main Studio Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Real-time Analyzer & Gain Staging Panel */}
        <AnalyzerPanel
          visualizerMode={visualizerMode}
          onVisualizerModeChange={setVisualizerMode}
        />

        {/* Center: TVB-Style Vocal Rack Chassis */}
        <RackChassis
          knobs={knobs}
          bypass={bypass}
          selectedPreset={selectedPreset}
          gainReductionDb={grDb}
          onKnobChange={handleKnobChange}
          onBypassToggle={handleBypassToggle}
          onPresetSelect={handlePresetSelect}
          onReset={handleReset}
        />

        {/* Right Side: Gemini AI Vocal Studio Assistant Drawer */}
        <AiAssistantDrawer
          isOpen={isAiDrawerOpen}
          metrics={audio.metrics}
          currentKnobs={knobs}
          onClose={() => setIsAiDrawerOpen(false)}
          onApplyRecommendedKnobs={handleApplyRecommendedKnobs}
        />
      </div>
    </div>
  );
}
