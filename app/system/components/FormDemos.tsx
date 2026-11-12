'use client';

import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

export function ButtonDemo() {
  return (
    <div className="ui-button-row">
      <button type="button" className="ui-button ui-button--primary">
        Primary
      </button>
      <button type="button" className="ui-button ui-button--secondary">
        Secondary
      </button>
      <button type="button" className="ui-button ui-button--ghost">
        Ghost
      </button>
      <button type="button" className="ui-button ui-button--primary" disabled>
        Disabled
      </button>
    </div>
  );
}

// The real chat composer: a text field with an embedded submit arrow that
// activates only once there's input. Mirrors public/components/ChatIntelligence.js.
export function InputDemo() {
  const [text, setText] = useState('');
  const [composer, setComposer] = useState('');

  return (
    <div className="ui-field-stack">
      <label className="ui-field">
        <span className="ui-field-label">Text input</span>
        <input
          type="text"
          className="ui-input"
          placeholder="Your name…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
        />
      </label>

      <label className="ui-field">
        <span className="ui-field-label">Composer</span>
        <div className="ui-composer">
          <input
            type="text"
            className="ui-input ui-composer-input"
            placeholder="Tell me what you're looking for…"
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            autoComplete="off"
          />
          <button
            type="button"
            className="ui-composer-submit"
            disabled={composer.trim() === ''}
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 20V5M12 5l-6 6M12 5l6 6"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </label>
    </div>
  );
}

// Travel distance is derived from the CSS variables on .ui-switch so the
// drag can't drift from the drawn knob. A drag commits on pointerup; the
// click that follows would flip the value back, so that click is swallowed.
function Switch({
  id,
  checked,
  disabled = false,
  onCheckedChange,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  const travelRef = useRef(0);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    origin: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [pressed, setPressed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [knobX, setKnobX] = useState<number | null>(null);

  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (disabled || e.button !== 0) return;
    const style = getComputedStyle(e.currentTarget);
    const track = parseFloat(style.getPropertyValue('--track'));
    const knob = parseFloat(style.getPropertyValue('--knob'));
    const inset = parseFloat(style.getPropertyValue('--inset'));
    const travel = track - knob - inset * 2;
    travelRef.current = travel;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      origin: checked ? travel : 0,
      moved: false,
    };
    setPressed(true);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 4) d.moved = true;
    if (!d.moved) return;
    const x = Math.min(travelRef.current, Math.max(0, d.origin + dx));
    setDragging(true);
    setKnobX(x);
  }

  function onPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    if (d.moved) {
      const x = Math.min(travelRef.current, Math.max(0, d.origin + (e.clientX - d.startX)));
      suppressClick.current = true;
      onCheckedChange(x >= travelRef.current / 2);
    }
    drag.current = null;
    setPressed(false);
    setDragging(false);
    setKnobX(null);
  }

  function onClick() {
    if (disabled) return;
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onCheckedChange(!checked);
  }

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={['ui-switch', pressed ? 'is-pressed' : '', dragging ? 'is-dragging' : '']
        .filter(Boolean)
        .join(' ')}
      style={
        knobX == null
          ? undefined
          : ({
              '--knob-x': `${knobX}px`,
              '--progress': travelRef.current ? knobX / travelRef.current : 0,
            } as CSSProperties)
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onClick}
    >
      <span className="ui-switch-knob" aria-hidden="true" />
    </button>
  );
}

export function SwitchDemo() {
  const [checked, setChecked] = useState(true);

  return (
    <div className="ui-switch-list">
      <div className="ui-switch-row">
        <label htmlFor="ui-switch">Label</label>
        <Switch id="ui-switch" checked={checked} onCheckedChange={setChecked} />
      </div>
      <div className="ui-switch-row">
        <label htmlFor="ui-switch-disabled" className="is-disabled">
          Disabled
        </label>
        <Switch id="ui-switch-disabled" checked={false} disabled onCheckedChange={() => {}} />
      </div>
    </div>
  );
}
