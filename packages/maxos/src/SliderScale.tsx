'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

import { NumericReadout } from './NumericReadout.js';

const TICK_WIDTH = 16;
const HOVER_RADIUS = 7;

function nearestStop(position: number, subdivisions: number) {
  return Math.round(position * subdivisions) / subdivisions;
}

export function SliderScale({
  label,
  count,
  value,
  onChange,
  formatValue,
  formatProgress,
  tickLabel,
  animateValue = false,
  subdivisions = 1,
}: {
  label: string;
  count: number;
  value: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
  formatProgress?: (position: number) => string;
  tickLabel?: (value: number) => string | undefined;
  animateValue?: boolean;
  subdivisions?: number;
}) {
  const [position, setPosition] = useState(value);
  const ruler = useRef<HTMLDivElement>(null);
  const hoverWindow = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  const hover = useRef<{ offset: number | null; ticks: HTMLElement[] }>({ offset: null, ticks: [] });
  const drag = useRef<{ x: number; left: number; lastX: number; time: number; velocity: number } | null>(null);
  const clamp = (stop: number) => Math.min(count - 1, Math.max(0, stop));
  const positionMatchesValue = nearestStop(position, subdivisions) === value;
  const labelPosition = positionMatchesValue ? position : value;
  const readout = formatProgress && positionMatchesValue
    ? formatProgress(position)
    : formatValue(value);
  const intermediateStops = useMemo(() => Array.from({ length: subdivisions - 1 }, (_, index) => (
    <span
      className="maxos-slider-scale-intermediate-stop"
      key={index}
      style={{ left: `${50 + (index + 1) * 100 / subdivisions}%` }}
    />
  )), [subdivisions]);

  useLayoutEffect(() => {
    const element = ruler.current;
    if (element && nearestStop(element.scrollLeft / TICK_WIDTH, subdivisions) !== value) {
      element.scrollLeft = value * TICK_WIDTH;
    }
  }, [subdivisions, value]);

  function updateHover(element: HTMLDivElement, offset: number | null) {
    const previous = hover.current;
    if (offset === null) {
      if (previous.offset !== null) hoverWindow.current?.removeAttribute('data-hovering');
      for (const tick of previous.ticks) tick.style.removeProperty('--maxos-slider-scale-tick-lift');
      marker.current?.style.removeProperty('--maxos-slider-scale-tick-lift');
      hover.current = { offset: null, ticks: [] };
      return;
    }

    const center = clamp(element.scrollLeft / TICK_WIDTH) + offset;
    const first = Math.max(0, Math.ceil(center - HOVER_RADIUS));
    const last = Math.min(count - 1, Math.floor(center + HOVER_RADIUS));
    if (previous.offset === null) hoverWindow.current?.setAttribute('data-hovering', '');
    const ticks = [];
    for (let index = first; index <= last; index++) {
      const tick = element.children.item(index) as HTMLElement;
      tick.style.setProperty('--maxos-slider-scale-tick-lift', `${14 * 0.5 ** Math.abs(index - center)}px`);
      ticks.push(tick);
    }
    for (const tick of previous.ticks) {
      if (!ticks.includes(tick)) tick.style.removeProperty('--maxos-slider-scale-tick-lift');
    }
    marker.current?.style.setProperty('--maxos-slider-scale-tick-lift', `${14 * 0.5 ** Math.abs(offset)}px`);
    hover.current = { offset, ticks };
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next: number;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next = value - 1 / subdivisions;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        next = value + 1 / subdivisions;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    onChange(clamp(nearestStop(next, subdivisions)));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch' || event.button !== 0) return;
    const element = event.currentTarget;
    updateHover(element, null);
    element.setPointerCapture(event.pointerId);
    element.dataset.dragging = '';
    drag.current = {
      x: event.clientX,
      left: element.scrollLeft,
      lastX: event.clientX,
      time: event.timeStamp,
      velocity: 0,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    if (!gesture) {
      if (event.pointerType === 'mouse') {
        const bounds = event.currentTarget.getBoundingClientRect();
        updateHover(event.currentTarget, (event.clientX - bounds.left - bounds.width / 2) / TICK_WIDTH);
      }
      return;
    }
    event.currentTarget.scrollLeft = gesture.left + gesture.x - event.clientX;
    const elapsed = event.timeStamp - gesture.time;
    if (elapsed > 0) gesture.velocity = (gesture.lastX - event.clientX) / elapsed;
    gesture.lastX = event.clientX;
    gesture.time = event.timeStamp;
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    const released = event.type === 'pointerup';
    const tapped = released && event.pointerType === 'touch';
    if (!gesture && !tapped) return;
    drag.current = null;
    const element = event.currentTarget;
    delete element.dataset.dragging;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let destination = element.scrollLeft;
    if (released && (!gesture || Math.abs(event.clientX - gesture.x) < 4)) {
      const bounds = element.getBoundingClientRect();
      destination += event.clientX - bounds.left - bounds.width / 2;
    } else if (gesture && released && !reducedMotion && event.timeStamp - gesture.time < 80) {
      destination += Math.max(-96, Math.min(96, gesture.velocity * 100));
    }

    element.scrollTo({
      left: clamp(nearestStop(destination / TICK_WIDTH, subdivisions)) * TICK_WIDTH,
      behavior: reducedMotion ? 'instant' : 'smooth',
    });
  }

  return (
    <div className="maxos-slider-scale">
      <div className="maxos-slider-scale-value" aria-hidden="true">
        {animateValue && /^-?\d+(?:\.\d+)?$/.test(readout) ? <NumericReadout text={readout} /> : readout}
      </div>
      <div className="maxos-slider-scale-window" ref={hoverWindow}>
        <div
          ref={ruler}
          className="maxos-slider-scale-ruler"
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={count - 1}
          aria-valuenow={value}
          aria-valuetext={formatValue(value)}
          onKeyDown={handleKeyDown}
          onScroll={(event) => {
            const position = clamp(event.currentTarget.scrollLeft / TICK_WIDTH);
            if (hover.current.offset !== null) updateHover(event.currentTarget, hover.current.offset);
            setPosition(position);
            const next = nearestStop(position, subdivisions);
            if (next !== value) onChange(next);
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerLeave={(event) => updateHover(event.currentTarget, null)}
          onPointerUp={finishDrag}
          onLostPointerCapture={finishDrag}
        >
          {Array.from({ length: count }, (_, index) => {
            const caption = tickLabel?.(index);
            return (
              <span
                className="maxos-slider-scale-tick"
                data-major={caption ? '' : undefined}
                key={index}
                aria-hidden="true"
              >
                {index < count - 1 && intermediateStops}
                {caption && (
                  <span
                    className="maxos-slider-scale-caption"
                    style={{ opacity: Math.min(1, Math.max(0, Math.abs(index - labelPosition) - 3.25)) }}
                  >
                    {caption}
                  </span>
                )}
              </span>
            );
          })}
        </div>
        <span
          className="maxos-slider-scale-marker"
          aria-hidden="true"
          ref={marker}
        />
        <span className="maxos-slider-scale-pointer" aria-hidden="true" />
      </div>
    </div>
  );
}
