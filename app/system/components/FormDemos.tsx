'use client';

import { useState } from 'react';
import { Kbd, Switch } from '@mvxmxm/maxos';
import '@mvxmxm/maxos/kbd.css';
import '@mvxmxm/maxos/switch.css';

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

const CYCLE_OPTIONS = [
  { id: 'system', label: 'System' },
  { id: 'microphone', label: 'Microphone' },
] as const;

export function SwitchDemo() {
  const [checked, setChecked] = useState(true);
  const [input, setInput] = useState<(typeof CYCLE_OPTIONS)[number]['id']>('system');

  return (
    <div className="ui-switch-list">
      <div className="ui-switch-row">
        <label htmlFor="ui-switch">Toggle</label>
        <Switch id="ui-switch" checked={checked} onCheckedChange={setChecked} />
      </div>
      <div className="ui-switch-row">
        <label htmlFor="ui-switch-cycle">Cycle</label>
        <Switch
          id="ui-switch-cycle"
          variant="cycle"
          value={input}
          options={CYCLE_OPTIONS}
          onValueChange={setInput}
        />
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

export function KbdDemo() {
  return (
    <div className="flex flex-col items-center gap-2">
      <Kbd>control + shift + M</Kbd>
      <Kbd>esc</Kbd>
      <Kbd>tab</Kbd>
    </div>
  );
}
