'use client';

// One statement stacked on three lines — the changing first word on its own
// line, the tail broken across the two lines below — split into two "slots".
// Each slot only re-animates when its own text changes (its React key is its
// text, so an unchanged slot never remounts and stays perfectly still). The
// changing slot emerges character-by-character (the blur-in-up "emergence"
// effect, /static/001):
//   step 0 — Execution   / at the speed / of compute
//   step 1 — Measurement / at the speed / of compute            (word morphs)
//   step 2 — Measurement / fits customer's / mental model       (tail morphs)
// Every step is three lines, so the word above never shifts. An accumulating row
// of icons sits above the text — one revealed per step.
import { useEffect, useState } from 'react';
import { useBuildSteps } from '../Deck';
import { EmergeSwap } from './emergeText';

const STEPS = 3;

// Line-style icons (inherit the text ink) that accumulate above the text — one
// revealed per step, the earlier ones sliding over as each new one fades/blurs in.
const SVG = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};
// Execution → pen tool (making / building).
const IconExecution = (
  <svg {...SVG}>
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
);
// Measurement → ruler.
const IconMeasurement = (
  <svg {...SVG}>
    <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
    <path d="m14.5 12.5 2-2" />
    <path d="m11.5 9.5 2-2" />
    <path d="m8.5 6.5 2-2" />
    <path d="m17.5 15.5 2-2" />
  </svg>
);
// Customer's mental model of value → a piggy bank (value / ROI).
const IconModel = (
  <svg {...SVG}>
    <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" />
    <path d="M2 9v1c0 1.1.9 2 2 2h1" />
    <path d="M16 11h.01" />
  </svg>
);

export function ComputeStatement() {
  const { active, step } = useBuildSteps(STEPS, { interval: 2600 });
  // Bumped on each entry so the whole line re-emerges when the slide is (re)shown;
  // stepping within the slide leaves it untouched, so only the slot whose text
  // changed re-animates.
  const [entry, setEntry] = useState(0);

  useEffect(() => {
    if (active) setEntry((e) => e + 1);
  }, [active]);

  const slotA = step === 0 ? 'Execution' : 'Measurement';
  const slotB =
    step <= 1 ? 'at the speed\nof compute' : 'fits customer’s\nmental model';

  return (
    <div className="morph-slide rack-in">
      <div className="morph-col">
        <div className="morph-icons" data-step={step}>
          <span className="morph-icon morph-icon--exec">{IconExecution}</span>
          <span className="morph-icon morph-icon--measure">{IconMeasurement}</span>
          <span className="morph-icon morph-icon--model">{IconModel}</span>
        </div>
        <div className="morph-stack">
          <EmergeSwap className="morph-word-line" text={slotA} cycle={entry} />
          <EmergeSwap className="morph-tail" text={slotB} cycle={entry} />
        </div>
      </div>
    </div>
  );
}
