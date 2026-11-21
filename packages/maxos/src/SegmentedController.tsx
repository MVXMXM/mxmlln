'use client';

import { useLayoutEffect, useRef } from 'react';

export function SegmentedController<T extends string>({
  label,
  items,
  value,
  onChange,
  animate = true,
  bordered = true,
}: {
  label: string;
  items: readonly { id: T; label: string; expanded?: boolean }[];
  value: T;
  onChange: (value: T) => void;
  animate?: boolean;
  bordered?: boolean;
}) {
  const segmentsRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = segmentsRef.current;
    const indicator = indicatorRef.current;
    if (!root || !indicator) return;
    const place = () => {
      const active = root.querySelector<HTMLElement>('button[aria-pressed="true"]');
      const labels = indicator.querySelector<HTMLElement>('.segmented-controller-labels');
      if (!active || !labels) return;
      indicator.style.width = `${active.offsetWidth}px`;
      indicator.style.height = `${active.offsetHeight}px`;
      indicator.style.transform = `translate3d(${active.offsetLeft}px, ${active.offsetTop}px, 0)`;
      labels.style.transform = `translate3d(${-active.offsetLeft}px, ${-active.offsetTop}px, 0)`;
      const buttons = [...root.querySelectorAll<HTMLElement>('button')];
      const copies = [...labels.querySelectorAll<HTMLElement>('.segmented-controller-label')];
      buttons.forEach((button, index) => {
        const copy = copies[index];
        if (!copy) return;
        copy.style.left = `${button.offsetLeft}px`;
        copy.style.top = `${button.offsetTop}px`;
        copy.style.width = `${button.offsetWidth}px`;
        copy.style.height = `${button.offsetHeight}px`;
      });
    };
    place();
    // The first placement should not travel in from 0,0.
    const frame = indicator.dataset.ready ? undefined : requestAnimationFrame(() => {
      indicator.dataset.ready = 'true';
    });
    const observer = new ResizeObserver(place);
    observer.observe(root);
    for (const button of root.querySelectorAll('button')) observer.observe(button);
    return () => {
      observer.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [items, value]);

  return (
    <div
      className="segmented-controller"
      role="group"
      aria-label={label}
      data-static={!animate || undefined}
      data-bordered={bordered || undefined}
      ref={segmentsRef}
    >
      <span className="segmented-controller-indicator" ref={indicatorRef} aria-hidden="true">
        <span className="segmented-controller-labels">
          {items.map((item) => (
            <span key={item.id} className="segmented-controller-label">
              {item.label}
            </span>
          ))}
        </span>
      </span>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="segmented-controller-button"
          aria-pressed={value === item.id}
          aria-expanded={item.expanded}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
