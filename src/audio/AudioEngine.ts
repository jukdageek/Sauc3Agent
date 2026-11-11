import { AudioMetrics, ModuleBypassState, RackKnobSettings } from '../types/audio';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private inputGain: GainNode | null = null;

  // Source nodes
  private sourceNode: AudioBufferSourceNode | MediaStreamAudioSourceNode | null = null;
  private micStream: MediaStream | null = null;
  private audioBuffer: AudioBuffer | null = null;

  // Module 1: Preamp & Saturation
  private preampGainNode: GainNode | null = null;
  private preampHpfNode: BiquadFilterNode | null = null;
  private preampWaveshaper: WaveShaperNode | null = null;
  private preampOutNode: GainNode | null = null;
  private preampBypassGain: GainNode | null = null;

  // Module 2: Opto Compressor
  private compNode: DynamicsCompressorNode | null = null;
  private compMakeupNode: GainNode | null = null;

  // Module 3: 4-Band Parametric EQ
  private eqLowNode: BiquadFilterNode | null = null;
  private eqMidNode: BiquadFilterNode | null = null;
  private eqHighNode: BiquadFilterNode | null = null;
  private eqAirNode: BiquadFilterNode | null = null;

  // Module 4: Pitch / Formant Simulator
  private pitchGainNode: GainNode | null = null;

  // Module 5: Space (Reverb & Delay)
  private spaceDelayNode: DelayNode | null = null;
  private spaceDelayFbNode: GainNode | null = null;
  private spaceDelayMixNode: GainNode | null = null;
  private spaceVerbConvolver: ConvolverNode | null = null;
  private spaceVerbMixNode: GainNode | null = null;
  private spaceDryNode: GainNode | null = null;

  // Module 6: Master Limiter & Clipper
  private masterBoostNode: GainNode | null = null;
  private masterLimiterNode: DynamicsCompressorNode | null = null;
  private masterClipperNode: WaveShaperNode | null = null;
  private masterOutGain: GainNode | null = null;

  // Playback state
  public isPlaying = false;
  public isLooping = false;
  public currentSource: 'mic' | 'file' | 'demo' = 'demo';
  public fileName: string | null = null;

  // Metrics cache
  public metrics: AudioMetrics = {
    pitchHz: 261.6,
    noteName: 'C',
    scaleName: 'Major',
    cents: 0,
    confidence: 0,
    peakDb: -100,
    rmsDb: -100,
    lufsDb: -100,
    chroma: [0.3, 0.1, 0.4, 0.1, 0.5, 0.2, 0.1, 0.6, 0.1, 0.3, 0.1, 0.2],
    gainReductionDb: 0,
  };

  private currentKnobs: RackKnobSettings | null = null;
  private currentBypass: ModuleBypassState | null = null;

  public init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.analyzer = this.ctx.createAnalyser();
    this.analyzer.fftSize = 2048;
    this.analyzer.smoothingTimeConstant = 0.8;

    this.inputGain = this.ctx.createGain();
    this.inputGain.gain.value = 1.0;

    this.buildGraph();
    this.generateDemoToneBuffer();
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }
    return curve;
  }

  private createImpulseResponse(duration: number, decay: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = length - i;
      const factor = Math.pow(n / length, decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }
    return impulse;
  }

  private buildGraph() {
    if (!this.ctx || !this.analyzer || !this.inputGain) return;

    // 01. Preamp
    this.preampGainNode = this.ctx.createGain();
    this.preampHpfNode = this.ctx.createBiquadFilter();
    this.preampHpfNode.type = 'highpass';
    this.preampHpfNode.frequency.value = 80;

    this.preampWaveshaper = this.ctx.createWaveShaper();
    this.preampWaveshaper.curve = this.makeDistortionCurve(15) as Float32Array<ArrayBuffer>;
    this.preampWaveshaper.oversample = '4x';

    this.preampOutNode = this.ctx.createGain();
    this.preampBypassGain = this.ctx.createGain();

    // 02. Opto Compressor
    this.compNode = this.ctx.createDynamicsCompressor();
    this.compNode.threshold.value = -18;
    this.compNode.knee.value = 12;
    this.compNode.ratio.value = 4;
    this.compNode.attack.value = 0.02;
    this.compNode.release.value = 0.25;
    this.compMakeupNode = this.ctx.createGain();
    this.compMakeupNode.gain.value = 1.41; // +3dB

    // 03. 4-Band Parametric EQ
    this.eqLowNode = this.ctx.createBiquadFilter();
    this.eqLowNode.type = 'peaking';
    this.eqLowNode.frequency.value = 250;
    this.eqLowNode.gain.value = -3;
    this.eqLowNode.Q.value = 1.0;

    this.eqMidNode = this.ctx.createBiquadFilter();
    this.eqMidNode.type = 'peaking';
    this.eqMidNode.frequency.value = 1500;
    this.eqMidNode.gain.value = 2;
    this.eqMidNode.Q.value = 1.2;

    this.eqHighNode = this.ctx.createBiquadFilter();
    this.eqHighNode.type = 'peaking';
    this.eqHighNode.frequency.value = 5000;
    this.eqHighNode.gain.value = 4;
    this.eqHighNode.Q.value = 1.0;

    this.eqAirNode = this.ctx.createBiquadFilter();
    this.eqAirNode.type = 'highshelf';
    this.eqAirNode.frequency.value = 12000;
    this.eqAirNode.gain.value = 3;

    // 04. Pitch simulator
    this.pitchGainNode = this.ctx.createGain();

    // 05. Space (Reverb & Delay)
    this.spaceDryNode = this.ctx.createGain();
    this.spaceDelayNode = this.ctx.createDelay(2.0);
    this.spaceDelayNode.delayTime.value = 0.28; // 280ms
    this.spaceDelayFbNode = this.ctx.createGain();
    this.spaceDelayFbNode.gain.value = 0.3;
    this.spaceDelayMixNode = this.ctx.createGain();
    this.spaceDelayMixNode.gain.value = 0.15;

    // Delay loop
    this.spaceDelayNode.connect(this.spaceDelayFbNode);
    this.spaceDelayFbNode.connect(this.spaceDelayNode);

    this.spaceVerbConvolver = this.ctx.createConvolver();
    const impulse = this.createImpulseResponse(2.5, 2.0);
    if (impulse) this.spaceVerbConvolver.buffer = impulse;
    this.spaceVerbMixNode = this.ctx.createGain();
    this.spaceVerbMixNode.gain.value = 0.2;

    const spaceSumNode = this.ctx.createGain();

    // 06. Master Limiter & Clipper
    this.masterBoostNode = this.ctx.createGain();
    this.masterBoostNode.gain.value = 1.25;

    this.masterLimiterNode = this.ctx.createDynamicsCompressor();
    this.masterLimiterNode.threshold.value = -0.1;
    this.masterLimiterNode.knee.value = 0;
    this.masterLimiterNode.ratio.value = 20; // Brickwall
    this.masterLimiterNode.attack.value = 0.001;
    this.masterLimiterNode.release.value = 0.08;

    this.masterClipperNode = this.ctx.createWaveShaper();
    this.masterClipperNode.curve = this.makeDistortionCurve(5) as Float32Array<ArrayBuffer>;

    this.masterOutGain = this.ctx.createGain();
    this.masterOutGain.gain.value = 1.0;

    // Wire DSP chain:
    // inputGain -> Preamp HPF -> Preamp Waveshaper -> Preamp Out -> Comp -> EQ (Low -> Mid -> High -> Air) -> Pitch -> Space -> Master -> Analyzer -> destination
    this.inputGain.connect(this.preampGainNode);
    this.preampGainNode.connect(this.preampHpfNode);
    this.preampHpfNode.connect(this.preampWaveshaper);
    this.preampWaveshaper.connect(this.preampOutNode);

    this.preampOutNode.connect(this.compNode);
    this.compNode.connect(this.compMakeupNode);

    this.compMakeupNode.connect(this.eqLowNode);
    this.eqLowNode.connect(this.eqMidNode);
    this.eqMidNode.connect(this.eqHighNode);
    this.eqHighNode.connect(this.eqAirNode);

    this.eqAirNode.connect(this.pitchGainNode);

    // Split to Space (Dry + Delay + Verb)
    this.pitchGainNode.connect(this.spaceDryNode);
    this.pitchGainNode.connect(this.spaceDelayNode);
    this.pitchGainNode.connect(this.spaceVerbConvolver);

    this.spaceDryNode.connect(spaceSumNode);
    this.spaceDelayNode.connect(this.spaceDelayMixNode);
    this.spaceDelayMixNode.connect(spaceSumNode);
    this.spaceVerbConvolver.connect(this.spaceVerbMixNode);
    this.spaceVerbMixNode.connect(spaceSumNode);

    // Master Stage
    spaceSumNode.connect(this.masterBoostNode);
    this.masterBoostNode.connect(this.masterLimiterNode);
    this.masterLimiterNode.connect(this.masterClipperNode);
    this.masterClipperNode.connect(this.masterOutGain);

    this.masterOutGain.connect(this.analyzer);
    this.analyzer.connect(this.ctx.destination);
  }

  public updateParameters(knobs: RackKnobSettings, bypass: ModuleBypassState) {
    this.currentKnobs = knobs;
    this.currentBypass = bypass;
    if (!this.ctx) return;

    // 01 Preamp
    if (this.preampGainNode) {
      const g = bypass.preamp ? 1.0 : Math.pow(10, knobs.preampGain / 20);
      this.preampGainNode.gain.setTargetAtTime(g, this.ctx.currentTime, 0.02);
    }
    if (this.preampHpfNode) {
      const freq = bypass.preamp ? 10 : Math.max(20, knobs.preampHpf);
      this.preampHpfNode.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.02);
    }
    if (this.preampWaveshaper && this.preampOutNode) {
      if (bypass.preamp) {
        this.preampWaveshaper.curve = null;
        this.preampOutNode.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.02);
      } else {
        this.preampWaveshaper.curve = this.makeDistortionCurve(knobs.preampDrive * 0.8) as Float32Array<ArrayBuffer>;
        const outG = Math.pow(10, knobs.preampOut / 20);
        this.preampOutNode.gain.setTargetAtTime(outG, this.ctx.currentTime, 0.02);
      }
    }

    // 02 Compressor
    if (this.compNode && this.compMakeupNode) {
      if (bypass.comp) {
        this.compNode.threshold.setTargetAtTime(0, this.ctx.currentTime, 0.02);
        this.compNode.ratio.setTargetAtTime(1, this.ctx.currentTime, 0.02);
        this.compMakeupNode.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.02);
      } else {
        this.compNode.threshold.setTargetAtTime(knobs.compThresh, this.ctx.currentTime, 0.02);
        this.compNode.ratio.setTargetAtTime(knobs.compRatio, this.ctx.currentTime, 0.02);
        this.compNode.attack.setTargetAtTime(knobs.compAttack / 1000, this.ctx.currentTime, 0.02);
        const makeup = Math.pow(10, knobs.compMakeup / 20);
        this.compMakeupNode.gain.setTargetAtTime(makeup, this.ctx.currentTime, 0.02);
      }
    }

    // 03 EQ
    if (this.eqLowNode && this.eqMidNode && this.eqHighNode && this.eqAirNode) {
      this.eqLowNode.gain.setTargetAtTime(bypass.eq ? 0 : knobs.eqLow, this.ctx.currentTime, 0.02);
      this.eqMidNode.gain.setTargetAtTime(bypass.eq ? 0 : knobs.eqMid, this.ctx.currentTime, 0.02);
      this.eqHighNode.gain.setTargetAtTime(bypass.eq ? 0 : knobs.eqHigh, this.ctx.currentTime, 0.02);
      this.eqAirNode.gain.setTargetAtTime(bypass.eq ? 0 : knobs.eqAir, this.ctx.currentTime, 0.02);
    }

    // 05 Space
    if (this.spaceDelayFbNode && this.spaceDelayMixNode && this.spaceVerbMixNode) {
      if (bypass.space) {
        this.spaceDelayFbNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
        this.spaceDelayMixNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
        this.spaceVerbMixNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      } else {
        this.spaceDelayFbNode.gain.setTargetAtTime(knobs.spaceDelayFb / 100, this.ctx.currentTime, 0.02);
        this.spaceDelayMixNode.gain.setTargetAtTime(knobs.spaceDelayMix / 100, this.ctx.currentTime, 0.02);
        this.spaceVerbMixNode.gain.setTargetAtTime(knobs.spaceVerbMix / 100, this.ctx.currentTime, 0.02);
      }
    }

    // 06 Master
    if (this.masterBoostNode && this.masterLimiterNode && this.masterOutGain) {
      if (bypass.master) {
        this.masterBoostNode.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.02);
        this.masterLimiterNode.threshold.setTargetAtTime(0, this.ctx.currentTime, 0.02);
        this.masterOutGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.02);
      } else {
        const boost = Math.pow(10, knobs.masterGain / 20);
        this.masterBoostNode.gain.setTargetAtTime(boost, this.ctx.currentTime, 0.02);
        this.masterLimiterNode.threshold.setTargetAtTime(knobs.masterCeiling, this.ctx.currentTime, 0.02);
        const ceilingGain = Math.pow(10, knobs.masterCeiling / 20);
        this.masterOutGain.gain.setTargetAtTime(ceilingGain, this.ctx.currentTime, 0.02);
      }
    }
  }

  public async setInputSource(source: 'mic' | 'file' | 'demo', onEndedCallback?: () => void) {
    this.init();
    if (!this.ctx || !this.inputGain) return;

    this.stopPlayback();
    this.currentSource = source;

    if (source === 'mic') {
      try {
        if (!this.micStream) {
          this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        }
        this.sourceNode = this.ctx.createMediaStreamSource(this.micStream);
        this.sourceNode.connect(this.inputGain);
        this.isPlaying = true;
      } catch (err: any) {
        console.error('Microphone error:', err);
        throw new Error('Microphone access denied or unavailable: ' + err.message);
      }
    } else if (source === 'demo') {
      if (!this.audioBuffer) {
        this.generateDemoToneBuffer();
      }
      this.playBuffer(onEndedCallback);
    } else if (source === 'file') {
      if (this.audioBuffer) {
        this.playBuffer(onEndedCallback);
      }
    }
  }

  public async loadAudioFile(file: File, onEndedCallback?: () => void): Promise<string> {
    this.init();
    if (!this.ctx) throw new Error('AudioContext failed to initialize');

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.fileName = file.name;
    this.currentSource = 'file';
    this.playBuffer(onEndedCallback);
    return file.name;
  }

  private generateDemoToneBuffer() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const duration = 6.0; // 6 second lush vocal phrase loop
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(2, numSamples, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    // Warm vocal chord sequence: C major, G, Am, F progression
    const chordRoots = [261.63, 196.0, 220.0, 174.61]; // C4, G3, A3, F3
    const sectionLen = numSamples / 4;

    for (let i = 0; i < numSamples; i++) {
      const section = Math.floor(i / sectionLen);
      const root = chordRoots[section % 4];
      const t = i / sampleRate;

      // Vocal formant synthesis emulation
      const v1 = Math.sin(2 * Math.PI * root * t);
      const v2 = 0.45 * Math.sin(2 * Math.PI * (root * 1.25) * t); // Major 3rd
      const v3 = 0.35 * Math.sin(2 * Math.PI * (root * 1.5) * t);  // 5th
      const v4 = 0.25 * Math.sin(2 * Math.PI * (root * 2.0) * t);  // Octave sparkle

      // Subtle vibrato
      const vibrato = 1.0 + 0.008 * Math.sin(2 * Math.PI * 5.2 * t);
      const baseSignal = (v1 + v2 + v3 + v4) * vibrato;

      // Smooth section envelope
      const sectionPos = (i % sectionLen) / sectionLen;
      const env = Math.sin(Math.PI * sectionPos);

      // Stereo spread
      left[i] = baseSignal * 0.22 * env;
      right[i] = (v1 * 0.9 + v2 * 1.1 + v3 * 0.8 + v4 * 1.2) * 0.22 * env;
    }

    this.audioBuffer = buffer;
  }

  public playBuffer(onEndedCallback?: () => void) {
    if (!this.ctx || !this.audioBuffer || !this.inputGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.sourceNode) {
      try {
        (this.sourceNode as AudioBufferSourceNode).stop();
      } catch {
        // ignore
      }
      this.sourceNode.disconnect();
    }

    const bSource = this.ctx.createBufferSource();
    bSource.buffer = this.audioBuffer;
    bSource.loop = this.isLooping;
    bSource.connect(this.inputGain);
    bSource.start(0);

    bSource.onended = () => {
      if (!this.isLooping && this.currentSource !== 'mic') {
        this.isPlaying = false;
        if (onEndedCallback) onEndedCallback();
      }
    };

    this.sourceNode = bSource;
    this.isPlaying = true;
  }

  public togglePlayback(onEndedCallback?: () => void) {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.isPlaying) {
      this.stopPlayback();
    } else {
      if (this.currentSource === 'mic') {
        this.setInputSource('mic', onEndedCallback);
      } else {
        this.playBuffer(onEndedCallback);
      }
    }
  }

  public stopPlayback() {
    if (this.sourceNode && this.currentSource !== 'mic') {
      try {
        (this.sourceNode as AudioBufferSourceNode).stop();
      } catch {
        // ignore
      }
    }
    this.isPlaying = false;
  }

  public setLoop(loop: boolean) {
    this.isLooping = loop;
    if (this.sourceNode && this.currentSource !== 'mic' && 'loop' in this.sourceNode) {
      (this.sourceNode as AudioBufferSourceNode).loop = loop;
    }
  }

  public getAnalyzer(): AnalyserNode | null {
    return this.analyzer;
  }

  // Update real-time audio metrics: Peak, RMS, LUFS, Pitch, Cents, Chroma
  public updateMetrics(timeData: Uint8Array, freqData: Uint8Array): AudioMetrics {
    if (!this.ctx) return this.metrics;

    let sumSq = 0;
    let peak = 0;
    const len = timeData.length;

    for (let i = 0; i < len; i++) {
      const sample = (timeData[i] - 128) / 128;
      const abs = Math.abs(sample);
      if (abs > peak) peak = abs;
      sumSq += sample * sample;
    }

    const rms = Math.sqrt(sumSq / len);
    const peakDb = peak > 0.0001 ? Math.max(-100, 20 * Math.log10(peak)) : -100;
    const rmsDb = rms > 0.0001 ? Math.max(-100, 20 * Math.log10(rms)) : -100;
    const lufsDb = Math.max(-100, rmsDb - 3.0);

    // Gain reduction from compressor
    let grDb = 0;
    if (this.compNode && typeof this.compNode.reduction === 'number') {
      grDb = Math.abs(this.compNode.reduction);
    }

    // Pitch detection via autocorrelation
    if (this.isPlaying && peak > 0.02) {
      const pitchResult = this.detectPitchAutocorrelation(timeData, this.ctx.sampleRate);
      if (pitchResult) {
        this.metrics.pitchHz = pitchResult.freq;
        this.metrics.noteName = pitchResult.note;
        this.metrics.cents = pitchResult.cents;
        this.metrics.confidence = pitchResult.confidence;
      }
    }

    // Calculate Chroma distribution from FFT frequency data
    const chroma = this.calculateChroma(freqData, this.ctx.sampleRate);

    this.metrics.peakDb = peakDb;
    this.metrics.rmsDb = rmsDb;
    this.metrics.lufsDb = lufsDb;
    this.metrics.gainReductionDb = grDb;
    this.metrics.chroma = chroma;

    return this.metrics;
  }

  private detectPitchAutocorrelation(timeData: Uint8Array, sampleRate: number) {
    const SIZE = timeData.length;
    let sumSquares = 0;
    for (let i = 0; i < SIZE; i++) {
      const val = (timeData[i] - 128) / 128;
      sumSquares += val * val;
    }
    const rms = Math.sqrt(sumSquares / SIZE);
    if (rms < 0.015) return null;

    let r1 = 0, r2 = SIZE - 1;
    const thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs((timeData[i] - 128) / 128) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs((timeData[SIZE - i] - 128) / 128) < thres) { r2 = SIZE - i; break; }
    }

    const buf = timeData.slice(r1, r2);
    const bufLen = buf.length;
    const c = new Float32Array(bufLen);

    for (let i = 0; i < bufLen; i++) {
      for (let j = 0; j < bufLen - i; j++) {
        c[i] = c[i] + ((buf[j] - 128) / 128) * ((buf[j + i] - 128) / 128);
      }
    }

    let d = 0;
    while (d < bufLen - 1 && c[d] > c[d + 1]) d++;
    let maxval = -1;
    let maxpos = -1;
    for (let i = d; i < bufLen; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }

    if (maxpos === -1 || maxpos === 0) return null;

    const freq = sampleRate / maxpos;
    if (freq < 55 || freq > 1200) return null; // Human vocal fundamental range

    const noteNum = 12 * (Math.log(freq / 440) / Math.log(2)) + 69;
    const roundNote = Math.round(noteNum);
    const cents = Math.round((noteNum - roundNote) * 100);
    const noteName = NOTE_NAMES[((roundNote % 12) + 12) % 12];
    const confidence = Math.min(100, Math.max(10, Math.round((maxval / (c[0] || 1)) * 100)));

    return { freq, note: noteName, cents, confidence };
  }

  private calculateChroma(freqData: Uint8Array, sampleRate: number): number[] {
    const chroma = new Array(12).fill(0);
    const nyquist = sampleRate / 2;
    const binCount = freqData.length;

    // Accumulate frequency energy into musical pitch classes (C, C#, D...)
    for (let i = 2; i < binCount / 2; i++) {
      const freq = (i * nyquist) / binCount;
      if (freq >= 65 && freq <= 2000) {
        const noteNum = 12 * (Math.log(freq / 440) / Math.log(2)) + 69;
        const noteIndex = Math.floor(noteNum + 0.5) % 12;
        const safeIndex = (noteIndex + 12) % 12;
        chroma[safeIndex] += freqData[i] / 255;
      }
    }

    // Normalize
    const maxVal = Math.max(0.001, ...chroma);
    return chroma.map(v => Math.min(1.0, Math.max(0.08, v / maxVal)));
  }
}

// Global singleton instance for the app
export const audio = new AudioEngine();
