'use client';

import { useState } from 'react';
import { SliderScale } from '@mvxmxm/maxos';
import '@mvxmxm/maxos/slider-scale.css';

const MAX = 100;

function formatScale(value: number) {
  return value.toFixed(1);
}

export function SliderScaleDemo() {
  const [step, setStep] = useState(MAX / 2);

  return (
    <SliderScale
      label="Scale"
      count={MAX + 1}
      value={step}
      onChange={setStep}
      formatValue={formatScale}
      formatProgress={formatScale}
      animateValue
      subdivisions={10}
      tickLabel={(index) => index % 5 === 0 ? String(index) : undefined}
    />
  );
}
