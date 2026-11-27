'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  ChevronsUpDown,
  Headphones,
  Mic,
  MonitorSpeaker,
  Speaker,
  Waves,
} from 'lucide-react';
import { Menu, SliderGeneral, Switch } from '@mvxmxm/maxos';
import '@mvxmxm/maxos/menu.css';
import '@mvxmxm/maxos/slider-general.css';
import '@mvxmxm/maxos/switch.css';
import { volumeIcon } from './volumeIcon';

const OUTPUT_ITEMS = [
  { id: 'system', label: 'System', icon: <MonitorSpeaker size={16} strokeWidth={1.75} /> },
  { id: 'speakers', label: 'Speakers', icon: <Speaker size={16} strokeWidth={1.75} /> },
  { id: 'headphones', label: 'Headphones', icon: <Headphones size={16} strokeWidth={1.75} /> },
] as const;

const INPUT_OPTIONS = [
  { id: 'system', label: 'System' },
  { id: 'microphone', label: 'Microphone' },
] as const;

type OutputId = (typeof OUTPUT_ITEMS)[number]['id'];
type InputId = (typeof INPUT_OPTIONS)[number]['id'];

function DropdownRow<T extends string>({
  id,
  icon,
  label,
  items,
  value,
  onChange,
  open,
  onOpenChange,
}: {
  id: string;
  icon: ReactNode;
  label: string;
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
      className="settings-panel-row settings-panel-row--control settings-panel-row--dropdown"
      data-open={open || undefined}
      onClick={() => onOpenChange(!open)}
    >
      <div className="settings-panel-meta">
        <span className="settings-panel-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="settings-panel-label" id={id}>
          {label}
        </span>
      </div>
      <span className="settings-panel-control settings-panel-control--dropdown">
        <span className="settings-panel-value">{selected?.label}</span>
        <button
          type="button"
          className="settings-panel-dropdown"
          aria-labelledby={id}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <ChevronsUpDown size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </span>
      {present ? (
        <div
          className="settings-panel-menu"
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

export function SettingsPanelDemo() {
  const baseId = useId();
  const [volume, setVolume] = useState(62);
  const [haptics, setHaptics] = useState(false);
  const [output, setOutput] = useState<OutputId>('system');
  const [input, setInput] = useState<InputId>('system');
  const [openMenu, setOpenMenu] = useState(false);
  const hapticsId = `${baseId}-haptics`;
  const outputId = `${baseId}-output`;
  const inputId = `${baseId}-input`;

  function cycleInput() {
    const index = INPUT_OPTIONS.findIndex((option) => option.id === input);
    const next = INPUT_OPTIONS[(index + 1) % INPUT_OPTIONS.length]!;
    setInput(next.id);
  }

  return (
    <div className="settings-panel" role="group" aria-label="Sound settings">
      <div className="settings-panel-row settings-panel-row--slider">
        <SliderGeneral
          label="Sound"
          value={volume}
          onChange={setVolume}
          icon={volumeIcon(volume)}
          stretch
        />
      </div>

      <DropdownRow
        id={outputId}
        icon={<Headphones size={16} strokeWidth={1.75} />}
        label="Output"
        items={OUTPUT_ITEMS}
        value={output}
        onChange={setOutput}
        open={openMenu}
        onOpenChange={setOpenMenu}
      />

      <div
        className="settings-panel-row settings-panel-row--control settings-panel-row--cycle"
        onClick={cycleInput}
      >
        <div className="settings-panel-meta">
          <span className="settings-panel-icon" aria-hidden="true">
            <Mic size={16} strokeWidth={1.75} />
          </span>
          <span className="settings-panel-label" id={inputId}>
            Input
          </span>
        </div>
        <span className="settings-panel-control" onClick={(event) => event.stopPropagation()}>
          <Switch
            variant="cycle"
            aria-labelledby={inputId}
            value={input}
            options={INPUT_OPTIONS}
            onValueChange={setInput}
          />
        </span>
      </div>

      <div
        className="settings-panel-row settings-panel-row--control"
        onClick={() => setHaptics((value) => !value)}
      >
        <div className="settings-panel-meta">
          <span className="settings-panel-icon" aria-hidden="true">
            <Waves size={16} strokeWidth={1.75} />
          </span>
          <span className="settings-panel-label" id={hapticsId}>
            Haptics
          </span>
        </div>
        <span className="settings-panel-control" onClick={(event) => event.stopPropagation()}>
          <Switch
            aria-labelledby={hapticsId}
            checked={haptics}
            onCheckedChange={setHaptics}
          />
        </span>
      </div>
    </div>
  );
}
