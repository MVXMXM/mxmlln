'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { NumericReadout } from './NumericReadout.js';

function clampVolume(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function VolumeSlider({
  label = 'Volume',
  value,
  onChange,
  icon,
  disabled = false,
}: {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const wheelTimeout = useRef<number | undefined>(undefined);
  const gesture = useRef<{ pointerId: number; x: number; value: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [wheeling, setWheeling] = useState(false);
  const volume = Math.round(clampVolume(value));
  const percentage = `${volume}%`;
  const readout = (
    <>
      <span className="maxos-volume-slider-icon">{icon}</span>
      <span className="maxos-volume-slider-value">
        <NumericReadout text={String(volume)} />
        <span>%</span>
      </span>
    </>
  );

  useEffect(() => () => window.clearTimeout(wheelTimeout.current), []);

  useEffect(() => {
    const element = input.current;
    if (!element || disabled) return;

    function adjustWithWheel(event: WheelEvent) {
      if (event.ctrlKey || gesture.current) return;
      event.preventDefault();
      setWheeling(true);
      window.clearTimeout(wheelTimeout.current);
      wheelTimeout.current = window.setTimeout(() => setWheeling(false), 600);
      const next = Math.round(clampVolume(volume + event.deltaY - event.deltaX));
      if (next !== volume) onChange(next);
    }

    element.addEventListener('wheel', adjustWithWheel, { passive: false });
    return () => element.removeEventListener('wheel', adjustWithWheel);
  }, [disabled, onChange, volume]);

  return (
    <div
      className="maxos-volume-slider"
      data-disabled={disabled || undefined}
      data-dragging={!disabled && dragging || undefined}
      data-wheeling={!disabled && wheeling || undefined}
      style={{ '--maxos-volume-slider-level': volume / 100 } as CSSProperties}
    >
      <span className="maxos-volume-slider-fill" aria-hidden="true">
        <span style={{ width: percentage }} />
      </span>
      <span className="maxos-volume-slider-content" aria-hidden="true">{readout}</span>
      <span className="maxos-volume-slider-content maxos-volume-slider-content--filled" aria-hidden="true">
        {readout}
      </span>
      <input
        ref={input}
        className="maxos-volume-slider-input"
        type="range"
        min={0}
        max={100}
        step={1}
        value={volume}
        aria-label={label}
        aria-valuetext={percentage}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        onPointerDown={(event) => {
          if (disabled || !event.isPrimary || event.button !== 0 || gesture.current) return;
          event.preventDefault();
          window.clearTimeout(wheelTimeout.current);
          setWheeling(false);
          event.currentTarget.focus({ preventScroll: true });
          event.currentTarget.setPointerCapture(event.pointerId);
          gesture.current = { pointerId: event.pointerId, x: event.clientX, value: volume };
          setDragging(true);
        }}
        onPointerMove={(event) => {
          const drag = gesture.current;
          if (disabled || !drag || event.pointerId !== drag.pointerId) return;
          const gain = event.pointerType === 'touch' ? 2 : 1;
          const previous = Math.round(drag.value);
          drag.value = clampVolume(drag.value + (event.clientX - drag.x) * gain);
          drag.x = event.clientX;
          const next = Math.round(drag.value);
          if (next !== previous) onChange(next);
        }}
        onLostPointerCapture={(event) => {
          if (event.pointerId !== gesture.current?.pointerId) return;
          gesture.current = null;
          setDragging(false);
          event.currentTarget.blur();
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          const next = clampVolume(volume + (event.key === 'ArrowRight' ? 10 : -10));
          if (next !== volume) onChange(next);
        }}
      />
    </div>
  );
}
