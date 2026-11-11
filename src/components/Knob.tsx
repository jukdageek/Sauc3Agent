import React, { useRef, useState, useCallback, useEffect } from 'react';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  size?: number;
  accentColor?: string;
  onChange: (val: number) => void;
}

export const Knob: React.FC<KnobProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  defaultValue = min,
  unit = '',
  size = 54,
  accentColor = '#00f2fe',
  onChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startValueRef = useRef<number>(value);
  const knobRef = useRef<HTMLDivElement>(null);

  // Clamp & normalize percentage (0% to 100%)
  const clampedVal = Math.min(max, Math.max(min, value));
  const pct = Math.min(100, Math.max(0, ((clampedVal - min) / (max - min)) * 100));

  // Rotation: -135deg (min) to +135deg (max) => 270 degree sweep
  const rotationDeg = (pct * 2.7) - 135;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = clampedVal;
    if (knobRef.current) {
      knobRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const deltaY = startYRef.current - e.clientY; // drag up increases
      const sensitivity = (max - min) / 140; // 140px vertical drag traverses full range
      let newVal = startValueRef.current + deltaY * sensitivity;

      // Snap to step if specified
      if (step > 0) {
        newVal = Math.round(newVal / step) * step;
      }
      newVal = Math.min(max, Math.max(min, newVal));
      onChange(Number(newVal.toFixed(2)));
    },
    [isDragging, min, max, step, onChange]
  );

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (knobRef.current) {
      try {
        knobRef.current.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? step || 1 : -(step || 1);
    let newVal = clampedVal + delta;
    newVal = Math.min(max, Math.max(min, newVal));
    onChange(Number(newVal.toFixed(2)));
  };

  const handleDoubleClick = () => {
    onChange(defaultValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      const newVal = Math.min(max, clampedVal + (step || 1));
      onChange(Number(newVal.toFixed(2)));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const newVal = Math.max(min, clampedVal - (step || 1));
      onChange(Number(newVal.toFixed(2)));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(max);
    }
  };

  // Formatted display value
  const formattedVal = React.useMemo(() => {
    let str = clampedVal.toFixed(step < 1 ? 1 : 0);
    if (clampedVal > 0 && unit === 'dB') str = `+${str}`;
    if (unit) return `${str} ${unit}`;
    return str;
  }, [clampedVal, unit, step]);

  return (
    <div
      className="flex flex-col items-center select-none group touch-none"
      title={`${label}: ${formattedVal} (Drag vertically, scroll or double-click to reset)`}
    >
      {/* Rotary Dial Container */}
      <div
        ref={knobRef}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clampedVal}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        className="relative cursor-ns-resize focus:outline-none transition-transform active:scale-[0.98]"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {/* Outer Conic Track Glow Gauge */}
        <div
          className={`absolute inset-0 rounded-full transition-shadow duration-150 ${
            isDragging ? 'shadow-[0_0_15px_rgba(0,242,254,0.45)]' : 'group-hover:shadow-[0_0_8px_rgba(0,242,254,0.25)]'
          }`}
          style={{
            background: `conic-gradient(from 225deg, ${accentColor} 0%, #f43f5e ${pct * 0.75}%, #1e293b ${pct * 0.75}%, #1e293b 75%, transparent 75%)`,
            padding: '3px',
          }}
        >
          {/* Inner Machined Metallic Bezel */}
          <div
            className="w-full h-full rounded-full flex items-center justify-center relative border border-white/10"
            style={{
              background: 'radial-gradient(circle at 35% 35%, #2a2e3d, #101217)',
              boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.12), 0 3px 6px rgba(0,0,0,0.85)',
            }}
          >
            {/* Center Cap with Knurled Texture */}
            <div className="w-4 h-4 rounded-full bg-slate-900/80 border border-slate-700/50 shadow-inner flex items-center justify-center" />

            {/* Glowing Pointer Indicator Needle */}
            <div
              className="absolute top-1 bottom-1 w-[3px] rounded-full flex justify-start pointer-events-none transition-transform duration-75"
              style={{
                transform: `rotate(${rotationDeg}deg)`,
                transformOrigin: 'center center',
              }}
            >
              <div
                className="w-full h-3 rounded-full"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 0 6px ${accentColor}`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Label and Live Numerical Readout */}
      <span className="text-[10px] font-mono tracking-wider text-slate-400 mt-1.5 uppercase text-center leading-none">
        {label}
      </span>
      <span className="text-[11px] font-mono font-bold text-brand-accent mt-0.5 tracking-tight tabular-nums">
        {formattedVal}
      </span>
    </div>
  );
};
