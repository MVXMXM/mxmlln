'use client';

import { useState } from 'react';

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
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className="ui-switch"
      onClick={() => onCheckedChange(!checked)}
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
