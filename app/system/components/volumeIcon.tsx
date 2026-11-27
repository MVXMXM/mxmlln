import type { ReactElement } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

/** Mute at 0; otherwise Volume2. */
export function volumeIcon(level: number): ReactElement {
  const Icon = level === 0 ? VolumeX : Volume2;
  return <Icon size={16} strokeWidth={1.75} aria-hidden="true" />;
}
