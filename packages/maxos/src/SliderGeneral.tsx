'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { NumericReadout } from './NumericReadout.js';

function clampValue(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function SliderGeneral({
  label = 'Value',
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
  const notch = useRef<HTMLSpanElement>(null);
  const content = useRef<HTMLSpanElement>(null);
  const wheelTimeout = useRef<number | undefined>(undefined);
  const gesture = useRef<{ pointerId: number; x: number; value: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [wheeling, setWheeling] = useState(false);
  const level = Math.round(clampValue(value));
  const percentage = `${level}%`;
  const readout = (
    <>
      <span className="maxos-slider-general-icon">{icon}</span>
      <span className="maxos-slider-general-value">
        <NumericReadout text={String(level)} />
        <span>%</span>
      </span>
    </>
  );

  useLayoutEffect(() => {
    const handle = notch.current;
    const fill = handle?.parentElement;
    const [speaker, percentageLabel] = Array.from(content.current?.children ?? []);
    if (!handle || !fill || !speaker || !percentageLabel) return;

    const updateOverlap = () => {
      const bounds = handle.getBoundingClientRect();
      const overlaps = [speaker, percentageLabel].some((element) => {
        const { left, right, width } = element.getBoundingClientRect();
        return width > 0 && bounds.right + 4 > left && bounds.left - 4 < right;
      });
      handle.toggleAttribute('data-overlapping', overlaps);
    };

    const observer = new ResizeObserver(updateOverlap);
    observer.observe(fill);
    observer.observe(speaker);
    observer.observe(percentageLabel);
    updateOverlap();
    return () => observer.disconnect();
  }, []);

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
      const next = Math.round(clampValue(level + event.deltaY - event.deltaX));
      if (next !== level) onChange(next);
    }

    element.addEventListener('wheel', adjustWithWheel, { passive: false });
    return () => element.removeEventListener('wheel', adjustWithWheel);
  }, [disabled, onChange, level]);

  return (
    <div
      className="maxos-slider-general"
      data-disabled={disabled || undefined}
      data-dragging={!disabled && dragging || undefined}
      data-wheeling={!disabled && wheeling || undefined}
      style={{ '--maxos-slider-general-level': level / 100 } as CSSProperties}
    >
      <span className="maxos-slider-general-fill" aria-hidden="true">
        <span className="maxos-slider-general-cyan" style={{ width: percentage }}>
          <span className="maxos-slider-general-notch" ref={notch} />
        </span>
      </span>
      <span className="maxos-slider-general-content" ref={content} aria-hidden="true">{readout}</span>
      <span className="maxos-slider-general-content maxos-slider-general-content--filled" aria-hidden="true">
        {readout}
      </span>
      <input
        ref={input}
        className="maxos-slider-general-input"
        type="range"
        min={0}
        max={100}
        step={1}
        value={level}
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
          gesture.current = { pointerId: event.pointerId, x: event.clientX, value: level };
          setDragging(true);
        }}
        onPointerMove={(event) => {
          const drag = gesture.current;
          if (disabled || !drag || event.pointerId !== drag.pointerId) return;
          const gain = event.pointerType === 'touch' ? 2 : 1;
          const previous = Math.round(drag.value);
          drag.value = clampValue(drag.value + (event.clientX - drag.x) * gain);
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
          const next = clampValue(level + (event.key === 'ArrowRight' ? 10 : -10));
          if (next !== level) onChange(next);
        }}
      />
    </div>
  );
}
