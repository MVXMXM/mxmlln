'use client';

import { useState } from 'react';
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react';
import { VolumeSlider } from '@mvxmxm/maxos';
import '@mvxmxm/maxos/volume-slider.css';

export function SliderGeneralDemo() {
  const [volume, setVolume] = useState(50);
  const Icon = volume === 0 ? VolumeX : volume <= 33 ? Volume : volume <= 66 ? Volume1 : Volume2;

  return <VolumeSlider value={volume} onChange={setVolume} icon={<Icon size={16} />} />;
}
