import type { Metadata } from 'next';
import { getExperiments } from '../getExperiments';
import Sketchbook from './Sketchbook';

export const metadata: Metadata = {
  title: 'Interaction Sketchbook',
  description: 'A physical sketchbook of interaction studies.',
};

export default function SketchbookPage() {
  return <Sketchbook experiments={getExperiments()} />;
}
