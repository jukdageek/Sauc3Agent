import React, { useState, useMemo } from 'react';
import { ModuleBypassState, Preset, PresetCategory, RackKnobSettings } from '../types/audio';
import { Knob } from './Knob';
import { RotateCcw, ChevronLeft, ChevronRight, Layers, SlidersHorizontal } from 'lucide-react';
import {
  CATEGORIZED_PRESETS,
  PRESETS,
  PRESET_CATEGORIES,
  getPresetById,
} from '../data/presets';

// Re-export for compatibility
export { CATEGORIZED_PRESETS, PRESETS, PRESET_CATEGORIES, getPresetById };

interface RackChassisProps {
  knobs: RackKnobSettings;
  bypass: ModuleBypassState;
  selectedPreset: string;
  gainReductionDb: number;
  onKnobChange: <K extends keyof RackKnobSettings>(key: K, value: RackKnobSettings[K]) => void;
  onBypassToggle: (module: keyof ModuleBypassState) => void;
  onPresetSelect: (presetId: string) => void;
  onReset: () => void;
}

export const RackChassis: React.FC<RackChassisProps> = ({
  knobs,
  bypass,
  selectedPreset,
  gainReductionDb,
  onKnobChange,
  onBypassToggle,
  onPresetSelect,
  onReset,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory | 'All'>('All');

  // Find active preset object from categorized dataset
  const activePreset = useMemo(() => {
    return getPresetById(selectedPreset) || PRESETS[0];
  }, [selectedPreset]);

  // Filtered preset list based on active category
  const filteredPresets = useMemo(() => {
    if (selectedCategory === 'All') return PRESETS;
    return CATEGORIZED_PRESETS[selectedCategory] || [];
  }, [selectedCategory]);

  // Stepper handlers
  const handlePrevPreset = () => {
    const list = filteredPresets;
    const currentIndex = list.findIndex((p) => p.id === selectedPreset);
    if (currentIndex <= 0) {
      onPresetSelect(list[list.length - 1].id);
    } else {
      onPresetSelect(list[currentIndex - 1].id);
    }
  };

  const handleNextPreset = () => {
    const list = filteredPresets;
    const currentIndex = list.findIndex((p) => p.id === selectedPreset);
    if (currentIndex === -1 || currentIndex >= list.length - 1) {
      onPresetSelect(list[0].id);
    } else {
      onPresetSelect(list[currentIndex + 1].id);
    }
  };

  const handleCategoryTabClick = (cat: PresetCategory | 'All') => {
    setSelectedCategory(cat);
    if (cat !== 'All') {
      // If current preset isn't in this category, switch to the first preset of that category
      if (activePreset.category !== cat) {
        const firstInCat = CATEGORIZED_PRESETS[cat]?.[0];
        if (firstInCat) onPresetSelect(firstInCat.id);
      }
    }
  };

  const getCategoryBadgeColor = (cat: PresetCategory) => {
    switch (cat) {
      case 'Vocals':
        return 'text-[#00f2fe] bg-[#00f2fe]/10 border-[#00f2fe]/30';
      case 'Instrumental':
        return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
      case 'Experimental':
        return 'text-purple-400 bg-purple-400/10 border-purple-400/30';
      case 'Mastering':
        return 'text-rose-400 bg-rose-400/10 border-rose-400/30';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <main className="flex-1 bg-[#0c0d10] overflow-y-auto p-4 space-y-4 select-none">
      {/* RACK TOP TOOLBAR & CATEGORIZED PRESET BROWSER */}
      <div className="bg-[#15171e] p-3 rounded-xl border border-[#262933] shadow-md space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="rack-screw" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-200 font-mono flex items-center gap-2">
              TVB-STYLE STUDIO RACK CHASSIS
            </span>
            <span className="text-[10px] bg-rose-600/20 text-rose-400 border border-rose-600/30 px-2 py-0.5 rounded font-mono font-semibold">
              6 ANALOG MODULES
            </span>
          </div>

          {/* Stepper & Reset Buttons */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrevPreset}
              className="w-7 h-7 bg-[#050608] hover:bg-slate-800 border border-[#262933] text-slate-300 hover:text-white rounded flex items-center justify-center transition"
              title="Previous Preset"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNextPreset}
              className="w-7 h-7 bg-[#050608] hover:bg-slate-800 border border-[#262933] text-slate-300 hover:text-white rounded flex items-center justify-center transition"
              title="Next Preset"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onReset}
              className="bg-[#15171e] border border-[#262933] hover:bg-slate-800 text-slate-300 hover:text-white text-xs px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5"
              title="Reset All Modules to Flat Bypass"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Categorized Selector & Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#262933]/80">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-[#050608] p-1 rounded-lg border border-[#262933] text-xs font-mono">
            {(['All', ...PRESET_CATEGORIES] as (PresetCategory | 'All')[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryTabClick(cat)}
                className={`px-3 py-1 rounded text-[11px] font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grouped Dropdown Menu displaying categorized structure via <optgroup> */}
          <div className="flex items-center gap-2 flex-1 max-w-sm justify-end">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#00f2fe]" />
              PRESET:
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => onPresetSelect(e.target.value)}
              className="flex-1 bg-[#050608] border border-[#262933] text-slate-200 text-xs rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:border-[#00f2fe] transition"
            >
              {selectedCategory === 'All' ? (
                // Group each category using optgroup directly from the categorized data structure
                PRESET_CATEGORIES.map((cat) => {
                  const items = CATEGORIZED_PRESETS[cat] || [];
                  if (items.length === 0) return null;
                  return (
                    <optgroup key={cat} label={`── ${cat.toUpperCase()} ──`}>
                      {items.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })
              ) : (
                // Focused optgroup for the active category
                <optgroup label={`── ${selectedCategory.toUpperCase()} ──`}>
                  {(CATEGORIZED_PRESETS[selectedCategory] || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* Active Preset Description Card */}
        {activePreset && (
          <div className="flex items-center justify-between gap-3 px-3 py-2 bg-[#050608]/70 border border-[#262933] rounded-lg text-xs font-mono">
            <div className="flex items-center gap-2 truncate">
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${getCategoryBadgeColor(
                  activePreset.category
                )}`}
              >
                {activePreset.category}
              </span>
              <span className="font-bold text-slate-100 truncate">{activePreset.name}</span>
              <span className="text-slate-600 hidden md:inline">·</span>
              <span className="text-slate-400 text-[11px] truncate hidden md:inline">
                {activePreset.description}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 shrink-0 tabular-nums">
              {PRESETS.findIndex((p) => p.id === activePreset.id) + 1} / {PRESETS.length}
            </span>
          </div>
        )}
      </div>

      {/* MODULE 01: PREAMP / TUBE SATURATOR */}
      <section className="bg-[#15171e] border border-[#262933] rounded-xl p-4 shadow-xl relative overflow-hidden">
        <div className="absolute left-2.5 top-2.5 rack-screw" />
        <div className="absolute right-2.5 top-2.5 rack-screw" />
        <div className="absolute left-2.5 bottom-2.5 rack-screw" />
        <div className="absolute right-2.5 bottom-2.5 rack-screw" />

        <div className="flex items-center justify-between pb-3 border-b border-[#262933] mb-4 px-4">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => onBypassToggle('preamp')}
              className={`w-4 h-4 rounded-full transition cursor-pointer ${
                bypass.preamp ? 'bg-slate-700' : 'bg-emerald-500 glow-led-green'
              }`}
              title={bypass.preamp ? 'Module Bypassed (Click to Enable)' : 'Module Active (Click to Bypass)'}
            />
            <h2 className="text-sm font-extrabold tracking-wider text-slate-200 uppercase font-mono">
              01. CONSOLE PREAMP & TUBE SATURATION
            </h2>
          </div>
          <span className="text-[10px] text-amber-400 font-mono bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded font-semibold">
            ANALOG WARMTH
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
          <Knob
            label="PREAMP GAIN"
            value={knobs.preampGain}
            min={-24}
            max={24}
            step={0.5}
            defaultValue={6}
            unit="dB"
            onChange={(val) => onKnobChange('preampGain', val)}
          />
          <Knob
            label="TUBE DRIVE"
            value={knobs.preampDrive}
            min={0}
            max={100}
            step={1}
            defaultValue={25}
            unit="%"
            accentColor="#f59e0b"
            onChange={(val) => onKnobChange('preampDrive', val)}
          />
          <Knob
            label="LOW CUT (HPF)"
            value={knobs.preampHpf}
            min={20}
            max={300}
            step={5}
            defaultValue={80}
            unit="Hz"
            onChange={(val) => onKnobChange('preampHpf', val)}
          />
          <Knob
            label="TRIM OUT"
            value={knobs.preampOut}
            min={-24}
            max={12}
            step={0.5}
            defaultValue={0}
            unit="dB"
            onChange={(val) => onKnobChange('preampOut', val)}
          />
        </div>
      </section>

      {/* MODULE 02: TUBE OPTICAL COMPRESSOR */}
      <section className="bg-[#15171e] border border-[#262933] rounded-xl p-4 shadow-xl relative">
        <div className="absolute left-2.5 top-2.5 rack-screw" />
        <div className="absolute right-2.5 top-2.5 rack-screw" />
        <div className="absolute left-2.5 bottom-2.5 rack-screw" />
        <div className="absolute right-2.5 bottom-2.5 rack-screw" />

        <div className="flex items-center justify-between pb-3 border-b border-[#262933] mb-4 px-4">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => onBypassToggle('comp')}
              className={`w-4 h-4 rounded-full transition cursor-pointer ${
                bypass.comp ? 'bg-slate-700' : 'bg-emerald-500 glow-led-green'
              }`}
              title={bypass.comp ? 'Module Bypassed' : 'Module Active'}
            />
            <h2 className="text-sm font-extrabold tracking-wider text-slate-200 uppercase font-mono">
              02. OPTICAL TUBE COMPRESSOR (OPTO 2A)
            </h2>
          </div>
          {/* Live Gain Reduction Readout */}
          <div className="flex items-center space-x-2 bg-[#050608] border border-[#262933] px-3 py-1 rounded font-mono text-xs">
            <span className="text-slate-400 text-[10px]">GR:</span>
            <span className="text-rose-400 font-bold tabular-nums">
              -{gainReductionDb.toFixed(1)} dB
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
          <Knob
            label="THRESHOLD"
            value={knobs.compThresh}
            min={-60}
            max={0}
            step={1}
            defaultValue={-18}
            unit="dB"
            onChange={(val) => onKnobChange('compThresh', val)}
          />
          <Knob
            label="RATIO"
            value={knobs.compRatio}
            min={1}
            max={20}
            step={0.5}
            defaultValue={4}
            unit=":1"
            onChange={(val) => onKnobChange('compRatio', val)}
          />
          <Knob
            label="ATTACK"
            value={knobs.compAttack}
            min={1}
            max={100}
            step={1}
            defaultValue={20}
            unit="ms"
            onChange={(val) => onKnobChange('compAttack', val)}
          />
          <Knob
            label="MAKEUP GAIN"
            value={knobs.compMakeup}
            min={0}
            max={24}
            step={0.5}
            defaultValue={3}
            unit="dB"
            onChange={(val) => onKnobChange('compMakeup', val)}
          />
        </div>
      </section>

      {/* MODULE 03: 4-BAND PARAMETRIC VOCAL EQ */}
      <section className="bg-[#15171e] border border-[#262933] rounded-xl p-4 shadow-xl relative">
        <div className="absolute left-2.5 top-2.5 rack-screw" />
        <div className="absolute right-2.5 top-2.5 rack-screw" />
        <div className="absolute left-2.5 bottom-2.5 rack-screw" />
        <div className="absolute right-2.5 bottom-2.5 rack-screw" />

        <div className="flex items-center justify-between pb-3 border-b border-[#262933] mb-4 px-4">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => onBypassToggle('eq')}
              className={`w-4 h-4 rounded-full transition cursor-pointer ${
                bypass.eq ? 'bg-slate-700' : 'bg-emerald-500 glow-led-green'
              }`}
              title={bypass.eq ? 'Module Bypassed' : 'Module Active'}
            />
            <h2 className="text-sm font-extrabold tracking-wider text-slate-200 uppercase font-mono">
              03. 4-BAND STUDIO PARAMETRIC EQ
            </h2>
          </div>
          <span className="text-[10px] text-cyan-400 font-mono bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded font-semibold">
            AIR & MUD CONTROL
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
          <Knob
            label="LOW CUT (250Hz)"
            value={knobs.eqLow}
            min={-12}
            max={12}
            step={0.5}
            defaultValue={-3}
            unit="dB"
            onChange={(val) => onKnobChange('eqLow', val)}
          />
          <Knob
            label="MID PRESENCE (1.5k)"
            value={knobs.eqMid}
            min={-12}
            max={12}
            step={0.5}
            defaultValue={2}
            unit="dB"
            onChange={(val) => onKnobChange('eqMid', val)}
          />
          <Knob
            label="HIGH SHINE (5kHz)"
            value={knobs.eqHigh}
            min={-12}
            max={12}
            step={0.5}
            defaultValue={4}
            unit="dB"
            onChange={(val) => onKnobChange('eqHigh', val)}
          />
          <Knob
            label="AIR SHELF (12kHz)"
            value={knobs.eqAir}
            min={-12}
            max={12}
            step={0.5}
            defaultValue={3}
            unit="dB"
            accentColor="#00f2fe"
            onChange={(val) => onKnobChange('eqAir', val)}
          />
        </div>
      </section>

      {/* MODULE 04: PITCH SHIFT & HARD AUTOTUNE AGENT */}
      <section className="bg-[#15171e] border border-[#262933] rounded-xl p-4 shadow-xl relative">
        <div className="absolute left-2.5 top-2.5 rack-screw" />
        <div className="absolute right-2.5 top-2.5 rack-screw" />
        <div className="absolute left-2.5 bottom-2.5 rack-screw" />
        <div className="absolute right-2.5 bottom-2.5 rack-screw" />

        <div className="flex items-center justify-between pb-3 border-b border-[#262933] mb-4 px-4">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => onBypassToggle('pitch')}
              className={`w-4 h-4 rounded-full transition cursor-pointer ${
                bypass.pitch ? 'bg-slate-700' : 'bg-emerald-500 glow-led-green'
              }`}
              title={bypass.pitch ? 'Module Bypassed' : 'Module Active'}
            />
            <h2 className="text-sm font-extrabold tracking-wider text-slate-200 uppercase font-mono">
              04. AUTOTUNE & PITCH CORRECTION ENGINE
            </h2>
          </div>
          <span className="text-[10px] text-purple-400 font-mono bg-purple-400/10 border border-purple-400/20 px-2 py-0.5 rounded font-semibold">
            SCALE LOCK
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
          <Knob
            label="RETUNE SPEED"
            value={knobs.pitchSpeed}
            min={0}
            max={100}
            step={1}
            defaultValue={80}
            unit="%"
            accentColor="#c084fc"
            onChange={(val) => onKnobChange('pitchSpeed', val)}
          />
          <Knob
            label="FORMANT SHIFT"
            value={knobs.pitchFormant}
            min={-12}
            max={12}
            step={1}
            defaultValue={0}
            unit="st"
            accentColor="#c084fc"
            onChange={(val) => onKnobChange('pitchFormant', val)}
          />
          <Knob
            label="PITCH SHIFT"
            value={knobs.pitchShift}
            min={-12}
            max={12}
            step={1}
            defaultValue={0}
            unit="st"
            accentColor="#c084fc"
            onChange={(val) => onKnobChange('pitchShift', val)}
          />
          <Knob
            label="HUMANIZE"
            value={knobs.pitchHuman}
            min={0}
            max={100}
            step={1}
            defaultValue={20}
            unit="%"
            accentColor="#c084fc"
            onChange={(val) => onKnobChange('pitchHuman', val)}
          />
        </div>
      </section>

      {/* MODULE 05: TIME & SPACE (REVERB / STEREO DELAY) */}
      <section className="bg-[#15171e] border border-[#262933] rounded-xl p-4 shadow-xl relative">
        <div className="absolute left-2.5 top-2.5 rack-screw" />
        <div className="absolute right-2.5 top-2.5 rack-screw" />
        <div className="absolute left-2.5 bottom-2.5 rack-screw" />
        <div className="absolute right-2.5 bottom-2.5 rack-screw" />

        <div className="flex items-center justify-between pb-3 border-b border-[#262933] mb-4 px-4">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => onBypassToggle('space')}
              className={`w-4 h-4 rounded-full transition cursor-pointer ${
                bypass.space ? 'bg-slate-700' : 'bg-emerald-500 glow-led-green'
              }`}
              title={bypass.space ? 'Module Bypassed' : 'Module Active'}
            />
            <h2 className="text-sm font-extrabold tracking-wider text-slate-200 uppercase font-mono">
              05. ATMOSPHERIC REVERB & DELAY SPACE
            </h2>
          </div>
          <span className="text-[10px] text-blue-400 font-mono bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded font-semibold">
            3D SPATIAL
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
          <Knob
            label="REVERB TIME"
            value={knobs.spaceDecay}
            min={0.5}
            max={10}
            step={0.1}
            defaultValue={2.5}
            unit="s"
            accentColor="#38bdf8"
            onChange={(val) => onKnobChange('spaceDecay', val)}
          />
          <Knob
            label="REVERB MIX"
            value={knobs.spaceVerbMix}
            min={0}
            max={100}
            step={1}
            defaultValue={20}
            unit="%"
            accentColor="#38bdf8"
            onChange={(val) => onKnobChange('spaceVerbMix', val)}
          />
          <Knob
            label="DELAY FEEDBACK"
            value={knobs.spaceDelayFb}
            min={0}
            max={90}
            step={1}
            defaultValue={30}
            unit="%"
            accentColor="#38bdf8"
            onChange={(val) => onKnobChange('spaceDelayFb', val)}
          />
          <Knob
            label="DELAY MIX"
            value={knobs.spaceDelayMix}
            min={0}
            max={100}
            step={1}
            defaultValue={15}
            unit="%"
            accentColor="#38bdf8"
            onChange={(val) => onKnobChange('spaceDelayMix', val)}
          />
        </div>
      </section>

      {/* MODULE 06: MASTER LIMITER & BRICKWALL CLIPPER */}
      <section className="bg-[#15171e] border border-[#262933] rounded-xl p-4 shadow-xl relative">
        <div className="absolute left-2.5 top-2.5 rack-screw" />
        <div className="absolute right-2.5 top-2.5 rack-screw" />
        <div className="absolute left-2.5 bottom-2.5 rack-screw" />
        <div className="absolute right-2.5 bottom-2.5 rack-screw" />

        <div className="flex items-center justify-between pb-3 border-b border-[#262933] mb-4 px-4">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => onBypassToggle('master')}
              className={`w-4 h-4 rounded-full transition cursor-pointer ${
                bypass.master ? 'bg-slate-700' : 'bg-emerald-500 glow-led-green'
              }`}
              title={bypass.master ? 'Module Bypassed' : 'Module Active'}
            />
            <h2 className="text-sm font-extrabold tracking-wider text-slate-200 uppercase font-mono">
              06. MASTER PEAK LIMITER & BRICKWALL CLIPPER
            </h2>
          </div>
          <span className="text-[10px] text-rose-400 font-mono bg-rose-400/10 border border-rose-400/20 px-2 py-0.5 rounded font-semibold">
            CEILING LOCK
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
          <Knob
            label="OUTPUT CEILING"
            value={knobs.masterCeiling}
            min={-6}
            max={0}
            step={0.1}
            defaultValue={-0.1}
            unit="dB"
            accentColor="#f43f5e"
            onChange={(val) => onKnobChange('masterCeiling', val)}
          />
          <Knob
            label="LIMITER BOOST"
            value={knobs.masterGain}
            min={0}
            max={12}
            step={0.5}
            defaultValue={2}
            unit="dB"
            accentColor="#f43f5e"
            onChange={(val) => onKnobChange('masterGain', val)}
          />
          <Knob
            label="SOFT CLIPPER"
            value={knobs.masterClip}
            min={0}
            max={100}
            step={1}
            defaultValue={40}
            unit="%"
            accentColor="#f43f5e"
            onChange={(val) => onKnobChange('masterClip', val)}
          />
          <Knob
            label="STEREO WIDTH"
            value={knobs.masterWidth}
            min={0}
            max={200}
            step={5}
            defaultValue={110}
            unit="%"
            accentColor="#f43f5e"
            onChange={(val) => onKnobChange('masterWidth', val)}
          />
        </div>
      </section>
    </main>
  );
};
