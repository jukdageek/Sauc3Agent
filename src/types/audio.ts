export interface RackKnobSettings {
  // 01 Preamp
  preampGain: number;       // -24 to +24 dB
  preampDrive: number;      // 0 to 100 %
  preampHpf: number;        // 20 to 300 Hz
  preampOut: number;        // -24 to +12 dB

  // 02 Compressor
  compThresh: number;       // -60 to 0 dB
  compRatio: number;        // 1 to 20 (:1)
  compAttack: number;       // 1 to 100 ms
  compMakeup: number;       // 0 to 24 dB

  // 03 EQ
  eqLow: number;            // -12 to +12 dB (250 Hz)
  eqMid: number;            // -12 to +12 dB (1500 Hz)
  eqHigh: number;           // -12 to +12 dB (5000 Hz)
  eqAir: number;            // -12 to +12 dB (12000 Hz)

  // 04 Pitch Correction
  pitchSpeed: number;       // 0 to 100 %
  pitchFormant: number;     // -12 to +12 semitones
  pitchShift: number;       // -12 to +12 semitones
  pitchHuman: number;       // 0 to 100 %

  // 05 Space / Reverb / Delay
  spaceDecay: number;       // 0.5 to 10 s
  spaceVerbMix: number;     // 0 to 100 %
  spaceDelayFb: number;     // 0 to 90 %
  spaceDelayMix: number;    // 0 to 100 %

  // 06 Master Limiter
  masterCeiling: number;    // -6 to 0 dB
  masterGain: number;       // 0 to 12 dB
  masterClip: number;       // 0 to 100 %
  masterWidth: number;      // 0 to 200 %
}

export interface ModuleBypassState {
  preamp: boolean;
  comp: boolean;
  eq: boolean;
  pitch: boolean;
  space: boolean;
  master: boolean;
}

export interface AudioMetrics {
  pitchHz: number;
  noteName: string;
  scaleName: string;
  cents: number;
  confidence: number;
  peakDb: number;
  rmsDb: number;
  lufsDb: number;
  chroma: number[]; // 12 semitone distribution [0-1]
  gainReductionDb: number;
}

export type InputSourceType = 'mic' | 'file' | 'demo';
export type VisualizerMode = 'fft' | 'wave';

export type PresetCategory = 'Vocals' | 'Instrumental' | 'Experimental' | 'Mastering';

export interface PresetItem {
  id: string;
  name: string;
  description: string;
  knobs: Partial<RackKnobSettings>;
}

export interface Preset extends PresetItem {
  category: PresetCategory;
}

export type CategorizedPresetMap = Record<PresetCategory, PresetItem[]>;

export interface AiDiagnosisResult {
  summary: string;
  recommendations: string[];
  recommendedKnobs?: Partial<RackKnobSettings>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}
