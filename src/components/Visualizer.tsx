import React, { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/AudioEngine';
import { VisualizerMode } from '../types/audio';

interface VisualizerProps {
  mode: VisualizerMode;
  onModeChange: (mode: VisualizerMode) => void;
}

export const Visualizer: React.FC<VisualizerProps> = ({ mode, onModeChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI crisp canvas
    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    updateCanvasSize();
    const ro = new ResizeObserver(() => updateCanvasSize());
    ro.observe(canvas);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      const analyzer = audio.getAnalyzer();
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Dark background with subtle grid lines
      ctx.fillStyle = '#050608';
      ctx.fillRect(0, 0, width, height);

      // Draw faint technical grid
      ctx.strokeStyle = '#151722';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = 0; y < height; y += 24) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      for (let x = 0; x < width; x += 36) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      ctx.stroke();

      if (!analyzer) return;

      const bufferLength = analyzer.frequencyBinCount;
      const timeData = new Uint8Array(bufferLength);
      const freqData = new Uint8Array(bufferLength);
      analyzer.getByteTimeDomainData(timeData);
      analyzer.getByteFrequencyData(freqData);

      // Also trigger audio engine metrics update
      audio.updateMetrics(timeData, freqData);

      if (mode === 'fft') {
        // Draw Frequency Spectrum Analyzer
        const numBars = 48;
        const barWidth = width / numBars;
        const barSpacing = 1.5;

        for (let i = 0; i < numBars; i++) {
          // Logarithmic bin mapping for human hearing distribution (20Hz to 20kHz)
          const binIndex = Math.min(
            bufferLength - 1,
            Math.floor(Math.pow(i / numBars, 1.8) * (bufferLength * 0.75))
          );
          const rawVal = freqData[binIndex] || 0;
          const barHeight = Math.max(3, (rawVal / 255) * (height - 6));

          // Gradient color: crimson -> cyan -> neon
          const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
          grad.addColorStop(0, '#e11d48');
          grad.addColorStop(0.5, '#00f2fe');
          grad.addColorStop(1, '#39ff14');

          ctx.fillStyle = grad;
          const x = i * barWidth;
          const y = height - barHeight;
          ctx.fillRect(x, y, barWidth - barSpacing, barHeight);

          // Top peak led pip
          ctx.fillStyle = rawVal > 200 ? '#ffffff' : '#00f2fe';
          ctx.fillRect(x, y - 2, barWidth - barSpacing, 1.5);
        }
      } else {
        // Draw Waveform Oscilloscope Trace
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00f2fe';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 6;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      ro.disconnect();
    };
  }, [mode]);

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-xl border border-slate-800 p-2.5">
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/80">
        <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live Scope & FFT
        </span>
        <div className="flex bg-[#050608] rounded border border-slate-800 p-0.5 text-[10px] font-mono">
          <button
            type="button"
            onClick={() => onModeChange('fft')}
            className={`px-2 py-0.5 rounded transition ${
              mode === 'fft' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            FFT
          </button>
          <button
            type="button"
            onClick={() => onModeChange('wave')}
            className={`px-2 py-0.5 rounded transition ${
              mode === 'wave' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            WAVE
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-[110px] relative rounded-lg overflow-hidden border border-slate-800/80 bg-[#050608]">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};
