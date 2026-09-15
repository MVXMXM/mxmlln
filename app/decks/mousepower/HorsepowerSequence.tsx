'use client';

// Two forward-advanced build steps showcasing the horse-gin → steam-engine
// transition. Step 0: the steam engine alone (focused). Step 1: the horse gin
// animates in on the left with a cyan arrow pointing across to the engine — the
// shift from horsepower to steam.
import { useBuildSteps } from '../Deck';

const STEPS = 2;

export function HorsepowerSequence() {
  const { step } = useBuildSteps(STEPS);

  return (
    <div className="hp-stage rack-in" data-step={step}>
      <div className="hp-card hp-card--gin">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/decks/mousepower/diagram-gin.png"
          alt="Diagram of a horse driving a mill gin"
        />
        <span className="hp-label">horse gin</span>
      </div>

      <div className="hp-card hp-card--engine">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/decks/mousepower/diagram-steam-engine.png"
          alt="Diagram of a Watt steam engine"
        />
        <span className="hp-label">Watt engine</span>
      </div>
    </div>
  );
}
