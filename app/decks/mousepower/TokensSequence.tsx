'use client';

// Slides 7–9 unified into one slide with three forward-advanced build steps that
// share a SINGLE persistent Coin3D (the 3D canvas never remounts, so it morphs
// seamlessly between states instead of relying on slide cuts):
//   step 0 — "TOKENS" wordmark, the coin as the "O"
//   step 1 — letters fade, coin slides to centre AND shrinks to an "o", the task
//            orbit pops in, and the coin reads as the middle "o" of "outcomes"
//            (halves flank it; the orbit circles the word)
//   step 2 — the task icons give way to the activity rings; "outcomes" fades out,
//            leaving the small coin parked at the rings' centre
// Advancement uses the same capture-phase key listener as the other build slides.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBuildSteps } from '../Deck';
import { ActivityRings } from './ActivityRings';
import { Coin3D } from './Coin3D';
import { TokensOrbit } from './TokensOrbit';

const STEPS = 3;
// Hold the orbit until the coin has centred (the .tokens-coin slide is ~0.65s).
const ORBIT_DELAY = 720;
const RINGS_DELAY = 720; // after the coin shrinks (step 2), before the rings draw

export function TokensSequence() {
  const [orbitOn, setOrbitOn] = useState(false);
  const [ringsOn, setRingsOn] = useState(false);
  const seqRef = useRef<HTMLDivElement>(null);

  // Shift that brings the coin's centre to the stage centre. Neutralise any
  // prior shift first so the coin is always measured at its natural (wordmark)
  // position — stable regardless of the current step or re-measures. Visual
  // deltas are converted back to layout px so CSS-scaled blog embeds stay true.
  const applyShift = useCallback(() => {
    const stage = seqRef.current;
    const wm = stage?.querySelector<HTMLElement>('.tokens-wordmark');
    const coin = wm?.querySelector<HTMLElement>('.tokens-coin');
    if (!stage || !wm || !coin) return;
    wm.style.setProperty('--coin-shift', '0px');
    const cr = coin.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    const scale = sr.width / stage.offsetWidth || 1;
    const visualDelta = sr.left + sr.width / 2 - (cr.left + cr.width / 2);
    wm.style.setProperty('--coin-shift', `${visualDelta / scale}px`);
  }, []);

  const onAdvance = useCallback(
    (from: number) => {
      if (from === 0) applyShift();
    },
    [applyShift]
  );
  const { active, step } = useBuildSteps(STEPS, { interval: 3200, onAdvance });

  // Reset the build whenever the slide leaves.
  useEffect(() => {
    if (!active) {
      setOrbitOn(false);
      setRingsOn(false);
    }
  }, [active]);

  // Wrap-around (blog autoplay) must park the coin back on the wordmark.
  useEffect(() => {
    if (step === 0) {
      seqRef.current
        ?.querySelector<HTMLElement>('.tokens-wordmark')
        ?.style.setProperty('--coin-shift', '0px');
    }
  }, [step]);

  // The orbit icons hold off until the coin has slid to centre (step 1), then pop.
  useEffect(() => {
    if (step < 1) {
      setOrbitOn(false);
      return;
    }
    if (orbitOn) return; // already shown — don't re-pop on later steps
    const t = window.setTimeout(() => setOrbitOn(true), ORBIT_DELAY);
    return () => window.clearTimeout(t);
  }, [step, orbitOn]);

  // Keep the shift correct against resize / late font load.
  useEffect(() => {
    if (!active) return;
    applyShift();
    window.addEventListener('resize', applyShift);
    document.fonts?.ready.then(applyShift);
    return () => window.removeEventListener('resize', applyShift);
  }, [active, applyShift]);

  // Rings draw on a beat after the coin has shrunk, so they never overlap the
  // still-large cluster (matches the old activity slide).
  useEffect(() => {
    if (step < 2) {
      setRingsOn(false);
      return;
    }
    const t = window.setTimeout(() => setRingsOn(true), RINGS_DELAY);
    return () => window.clearTimeout(t);
  }, [step]);

  return (
    <div className="tokens-seq rack-in" data-step={step} data-rings={ringsOn} ref={seqRef}>
      <div className="tokens-seq-rings">
        <ActivityRings on={ringsOn} />
      </div>
      <div
        className={`tokens-wordmark${step >= 1 ? ' is-morphing' : ''}`}
        role="img"
        aria-label="tokens are an output"
      >
        <span aria-hidden="true">t</span>
        <Coin3D overlay={<TokensOrbit active={orbitOn} />} />
        <span aria-hidden="true">kens</span>
      </div>
      {/* Second statement line, same size/ink as the wordmark — a sibling, NOT a
          child: the wordmark's letters are color:transparent + background-clip:text,
          and an extra child would also steal the :first/:last-child gold-gradient
          from T / KENS. Absolutely placed below the centred wordmark so it never
          nudges the coin off the viewport centre the rings rely on. Present at
          step 0; fades out with the letters once the morph begins, leaving steps
          1–2 untouched. */}
      <div className="tokens-subline" aria-hidden="true">
        are an
        <br />
        output
      </div>
      {/* Step 1 (icons) — reads "we want / outcomes / instead". The persistent
          full-size coin (parked at centre with the task icons orbiting it) is the
          middle "o" of "outcomes": the two halves flank it, with "we want" above
          and "instead" below. Same gold ink; fades out at step 2 as the icons
          give way to the rings. */}
      <div className="oc-wordmark" aria-hidden="true">
        <span className="oc-want">we want</span>
        <span className="oc-half oc-pre">outc</span>
        <span className="oc-half oc-post">mes</span>
        <span className="oc-instead">instead</span>
      </div>
    </div>
  );
}
