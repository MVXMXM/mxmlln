'use client';

import { useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';

type DirectionStop<T extends string> = {
  id: T;
  label: string;
  preview?: string;
};

export function DirectionSlider<T extends string>({
  label,
  left,
  right,
  leftIcon,
  rightIcon,
  onSelect,
  disabled = false,
}: {
  label: string;
  left: readonly DirectionStop<T>[];
  right: readonly DirectionStop<T>[];
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onSelect: (id: T) => void;
  disabled?: boolean;
}) {
  const [position, setPosition] = useState<number | null>(null);
  const pointerId = useRef<number | null>(null);
  const center = left.length;
  const stops = [...left, null, ...right];
  const dragging = !disabled && position !== null;
  const bandPosition = dragging ? position : center + 0.5;
  const index = Math.floor(bandPosition);
  const start = Math.min(center, bandPosition - 0.5);
  const end = Math.max(center + 1, bandPosition + 0.5);

  function positionAtPointer(event: PointerEvent<HTMLDivElement>) {
    const { left, width } = event.currentTarget.getBoundingClientRect();
    const position = ((event.clientX - left) / width) * stops.length;
    return Math.max(0.5, Math.min(stops.length - 0.5, position));
  }

  function clearDrag() {
    pointerId.current = null;
    setPosition(null);
  }

  return (
    <div className="maxos-direction-slider" role="group" aria-label={label} data-disabled={disabled || undefined}>
      <div
        className="maxos-direction-slider-track"
        data-dragging={dragging || undefined}
        style={{ gridTemplateColumns: `repeat(${stops.length}, minmax(0, 1fr))` }}
        onPointerDown={(event) => {
          if (disabled || !event.isPrimary || event.button !== 0 || pointerId.current !== null) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          pointerId.current = event.pointerId;
          setPosition(positionAtPointer(event));
        }}
        onPointerMove={(event) => {
          if (pointerId.current === event.pointerId) setPosition(positionAtPointer(event));
        }}
        onPointerUp={(event) => {
          if (pointerId.current !== event.pointerId) return;
          const stop = stops[Math.floor(positionAtPointer(event))];
          clearDrag();
          if (!disabled && stop) onSelect(stop.id);
        }}
        onLostPointerCapture={clearDrag}
      >
        <span
          className="maxos-direction-slider-band"
          aria-hidden="true"
          style={{ left: `${start / stops.length * 100}%`, right: `${(1 - end / stops.length) * 100}%` }}
        >
          <span
            className="maxos-direction-slider-notch"
            data-side={index === center ? 'center' : index < center ? 'left' : 'right'}
          />
        </span>
        {left.length > 0 && leftIcon && (
          <span className="maxos-direction-slider-icon" data-side="left" aria-hidden="true">{leftIcon}</span>
        )}
        {right.length > 0 && rightIcon && (
          <span className="maxos-direction-slider-icon" data-side="right" aria-hidden="true">{rightIcon}</span>
        )}
        {stops.map((stop) => stop ? (
          <button
            key={stop.id}
            className="maxos-direction-slider-stop"
            type="button"
            disabled={disabled}
            aria-label={stop.preview ? `${stop.label}, ${stop.preview}` : stop.label}
            onClick={(event) => { if (event.detail === 0) onSelect(stop.id); }}
          />
        ) : <span key={center} aria-hidden="true" />)}
      </div>
    </div>
  );
}
