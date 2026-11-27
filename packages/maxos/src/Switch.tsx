'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type SwitchOption<T extends string> = { id: T; label: string };

type SwitchShared = {
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  disabled?: boolean;
};

type ToggleSwitchProps = SwitchShared & {
  variant?: 'toggle';
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  value?: never;
  options?: never;
  onValueChange?: never;
};

type CycleSwitchProps<T extends string> = SwitchShared & {
  /** Cycles through labeled options; page dots mark the active step. */
  variant: 'cycle';
  value: T;
  options: readonly SwitchOption<T>[];
  onValueChange: (next: T) => void;
  checked?: never;
  onCheckedChange?: never;
};

export type SwitchProps<T extends string = string> = ToggleSwitchProps | CycleSwitchProps<T>;

function CycleSwitch<T extends string>({
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  disabled = false,
  value,
  options,
  onValueChange,
}: CycleSwitchProps<T>) {
  const index = Math.max(0, options.findIndex((option) => option.id === value));
  const selected = options[index];
  const labelText = selected?.label ?? '';
  const [prevLabel, setPrevLabel] = useState<string | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [slotWidth, setSlotWidth] = useState(0);
  const [swapKey, setSwapKey] = useState(0);
  const measureRef = useRef<HTMLSpanElement>(null);
  const curTextRef = useRef(labelText);
  const prevIndexRef = useRef(index);
  const swapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    let max = 0;
    for (const child of root.children) {
      max = Math.max(max, (child as HTMLElement).offsetWidth);
    }
    setSlotWidth(max);
  }, [options]);

  useLayoutEffect(() => {
    const cur = curTextRef.current;
    if (cur && cur !== labelText) {
      setDir(index > prevIndexRef.current ? 1 : -1);
      setPrevLabel(cur);
      setSwapKey((key) => key + 1);
      if (swapTimer.current) clearTimeout(swapTimer.current);
      swapTimer.current = setTimeout(() => setPrevLabel(null), 320);
    }
    curTextRef.current = labelText;
    prevIndexRef.current = index;
  }, [index, labelText]);

  useEffect(() => () => {
    if (swapTimer.current) clearTimeout(swapTimer.current);
  }, []);

  function cycle() {
    if (disabled || options.length === 0) return;
    const nextIndex = (index + 1) % options.length;
    const next = options[nextIndex]!;
    onValueChange(next.id);
  }

  const moving = prevLabel !== null;
  const dirClass = dir === 1 ? 'is-down' : 'is-up';

  return (
    <button
      id={id}
      type="button"
      className="maxos-switch maxos-switch--cycle"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      disabled={disabled}
      onClick={cycle}
    >
      <span
        className="maxos-switch-cycle-value"
        style={slotWidth ? { width: `${slotWidth}px` } : undefined}
      >
        <span ref={measureRef} className="maxos-switch-cycle-measure" aria-hidden="true">
          {options.map((option) => (
            <span key={option.id}>{option.label}</span>
          ))}
        </span>
        <span className="maxos-switch-cycle-reel">
          {moving && (
            <span
              key={`out-${swapKey}-${prevLabel}`}
              className={`maxos-switch-cycle-text maxos-switch-cycle-text--out ${dirClass}`}
            >
              {prevLabel}
            </span>
          )}
          <span
            key={`in-${swapKey}-${labelText}`}
            className={`maxos-switch-cycle-text${moving ? ` maxos-switch-cycle-text--in ${dirClass}` : ''}`}
          >
            {labelText}
          </span>
        </span>
      </span>
      <span className="maxos-switch-cycle-pager" aria-hidden="true">
        {options.map((option, optionIndex) => (
          <span
            key={option.id}
            className="maxos-switch-cycle-dot"
            data-active={optionIndex === index || undefined}
          />
        ))}
      </span>
    </button>
  );
}

export function Switch<T extends string>(props: SwitchProps<T>) {
  if (props.variant === 'cycle') {
    return <CycleSwitch {...props} />;
  }

  const {
    id,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    checked,
    disabled = false,
    onCheckedChange,
  } = props;

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      disabled={disabled}
      className="maxos-switch"
      onClick={() => onCheckedChange(!checked)}
    >
      <span className="maxos-switch-knob" aria-hidden="true" />
    </button>
  );
}
