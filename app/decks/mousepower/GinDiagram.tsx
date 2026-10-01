'use client';

// Three forward-advanced build steps. Step 0 — the gin drawn as a stopwatch.
// Step 1 — schematic shrinks, the equation emerges. Step 2 — ROI thesis.
// Orbit/flip animations are gated in CSS on .deck-slide[data-active='true'].
import { useBuildSteps } from '../Deck';
import { GinSchematic } from './GinSchematic';
import { EmergeSwap } from './emergeText';

const STEPS = 3;

export function GinDiagram() {
  const { step } = useBuildSteps(STEPS, { interval: 3000 });

  return (
    <div className="gin-stage rack-in" data-step={step}>
      <GinSchematic className="hp-diagram" />

      <EmergeSwap
        className="hp-caption"
        text={
          step === 1
            ? '1 horsepower = 33,000 ft·lbf/min'
            : step === 2
              ? 'If we can’t measure ROI,\nwe can’t communicate value.'
              : ''
        }
      />
    </div>
  );
}
