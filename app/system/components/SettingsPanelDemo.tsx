'use client';

import { useId, useState } from 'react';
import {
  Headphones,
  Mic,
  MonitorSpeaker,
  Speaker,
  Waves,
} from 'lucide-react';
import {
  SettingsPanel,
  SettingsPanelControlRow,
  SettingsPanelDropdownRow,
  SettingsPanelSliderRow,
  SliderGeneral,
  Switch,
} from '@mvxmxm/maxos';
import '@mvxmxm/maxos/menu.css';
import '@mvxmxm/maxos/settings-panel.css';
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

  return (
    <SettingsPanel aria-label="Sound settings">
      <SettingsPanelSliderRow>
        <SliderGeneral
          label="Sound"
          value={volume}
          onChange={setVolume}
          icon={volumeIcon(volume)}
          stretch
        />
      </SettingsPanelSliderRow>

      <SettingsPanelDropdownRow
        labelId={outputId}
        icon={<Headphones size={16} strokeWidth={1.75} />}
        label="Output"
        items={OUTPUT_ITEMS}
        value={output}
        onChange={setOutput}
        open={openMenu}
        onOpenChange={setOpenMenu}
      />

      <SettingsPanelControlRow
        labelId={inputId}
        icon={<Mic size={16} strokeWidth={1.75} />}
        label="Input"
        cycle
        onClick={() => {
          const index = INPUT_OPTIONS.findIndex((option) => option.id === input);
          const next = INPUT_OPTIONS[(index + 1) % INPUT_OPTIONS.length]!;
          setInput(next.id);
        }}
      >
        <Switch
          variant="cycle"
          aria-labelledby={inputId}
          value={input}
          options={INPUT_OPTIONS}
          onValueChange={setInput}
        />
      </SettingsPanelControlRow>

      <SettingsPanelControlRow
        labelId={hapticsId}
        icon={<Waves size={16} strokeWidth={1.75} />}
        label="Haptics"
        onClick={() => setHaptics((value) => !value)}
      >
        <Switch
          aria-labelledby={hapticsId}
          checked={haptics}
          onCheckedChange={setHaptics}
        />
      </SettingsPanelControlRow>
    </SettingsPanel>
  );
}
