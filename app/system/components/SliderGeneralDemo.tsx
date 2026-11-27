'use client';

import { useState } from 'react';
import { SegmentedController, SliderGeneral } from '@mvxmxm/maxos';
import '@mvxmxm/maxos/segmented-controller.css';
import '@mvxmxm/maxos/slider-general.css';
import { ComponentPreview } from './ComponentPreview';
import { volumeIcon } from './volumeIcon';

const LABEL_OPTIONS = [
  { id: 'on', label: 'Label on' },
  { id: 'off', label: 'Label off' },
] as const;

type LabelMode = (typeof LABEL_OPTIONS)[number]['id'];

export function SliderGeneralDemo() {
  const [volume, setVolume] = useState(50);
  const [labelMode, setLabelMode] = useState<LabelMode>('on');

  return (
    <>
      <div className="logo-demo-header">
        <h3 id="slider">Slider</h3>
        <SegmentedController
          label="Slider label"
          items={LABEL_OPTIONS}
          value={labelMode}
          onChange={setLabelMode}
        />
      </div>
      <ComponentPreview>
        <SliderGeneral
          label={labelMode === 'on' ? 'Volume' : undefined}
          aria-label="Volume"
          value={volume}
          onChange={setVolume}
          icon={volumeIcon(volume)}
        />
      </ComponentPreview>
    </>
  );
}
