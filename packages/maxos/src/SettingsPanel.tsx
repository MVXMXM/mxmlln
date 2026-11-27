'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Menu } from './Menu.js';

function ChevronUpDown() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  );
}

export function SettingsPanel({
  children,
  'aria-label': ariaLabel,
}: {
  children: ReactNode;
  'aria-label': string;
}) {
  return (
    <div className="maxos-settings-panel" role="group" aria-label={ariaLabel}>
      {children}
    </div>
  );
}

export function SettingsPanelSliderRow({ children }: { children: ReactNode }) {
  return <div className="maxos-settings-panel-row maxos-settings-panel-row--slider">{children}</div>;
}

export function SettingsPanelControlRow({
  icon,
  label,
  labelId,
  cycle = false,
  onClick,
  children,
}: {
  icon: ReactNode;
  label: string;
  labelId: string;
  /** Tighter block padding for the tall cycle switch reel. */
  cycle?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={[
        'maxos-settings-panel-row',
        'maxos-settings-panel-row--control',
        cycle ? 'maxos-settings-panel-row--cycle' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
    >
      <div className="maxos-settings-panel-meta">
        <span className="maxos-settings-panel-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="maxos-settings-panel-label" id={labelId}>
          {label}
        </span>
      </div>
      <span
        className="maxos-settings-panel-control"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </span>
    </div>
  );
}

export function SettingsPanelDropdownRow<T extends string>({
  icon,
  label,
  labelId,
  items,
  value,
  onChange,
  open,
  onOpenChange,
}: {
  icon: ReactNode;
  label: string;
  labelId: string;
  items: readonly { id: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [present, setPresent] = useState(open);
  const [visible, setVisible] = useState(open);
  const selected = items.find((item) => item.id === value);

  useEffect(() => {
    if (open) {
      setPresent(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (rowRef.current?.contains(event.target as Node)) return;
      onOpenChange(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onOpenChange(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <div
      ref={rowRef}
      className="maxos-settings-panel-row maxos-settings-panel-row--control maxos-settings-panel-row--dropdown"
      data-open={open || undefined}
      onClick={() => onOpenChange(!open)}
    >
      <div className="maxos-settings-panel-meta">
        <span className="maxos-settings-panel-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="maxos-settings-panel-label" id={labelId}>
          {label}
        </span>
      </div>
      <span className="maxos-settings-panel-control maxos-settings-panel-control--dropdown">
        <span className="maxos-settings-panel-value">{selected?.label}</span>
        <button
          type="button"
          className="maxos-settings-panel-dropdown"
          aria-labelledby={labelId}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <ChevronUpDown />
        </button>
      </span>
      {present ? (
        <div
          className="maxos-settings-panel-menu"
          data-open={visible || undefined}
          onClick={(event) => event.stopPropagation()}
          onTransitionEnd={(event) => {
            if (event.propertyName !== 'opacity' || open) return;
            setPresent(false);
          }}
        >
          <Menu
            label={label}
            items={items}
            value={value}
            onChange={(next) => {
              onChange(next);
              onOpenChange(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
