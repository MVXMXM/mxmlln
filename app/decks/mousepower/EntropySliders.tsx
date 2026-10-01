'use client';

// Takeaway bands reveal one per forward step (bare chart → script → OOD →
// verification → NP).
import { useBuildSteps } from '../Deck';

const STEPS = 5;

export function EntropySliders() {
  const { step } = useBuildSteps(STEPS, { interval: 2200 });
  const shown = (n: number) => (step >= n ? ' es-shown' : '');

  return (
    <div className="es-stage rack-in">
      <div className="es-panel">
        <div className="es-matrix">
          <span className="es-axis es-axis-x">Uncertainty in Acceptance Criteria</span>
          <span className="es-axis es-axis-y">Uncertainty in Task Steps</span>
          <div className="es-plot">
            <span className="es-dot es-dot-top" aria-hidden />
            <span className="es-dot es-dot-left" aria-hidden />
            <span className="es-arrow es-arrow-x" aria-hidden />
            <span className="es-arrow es-arrow-y" aria-hidden />
            <span className="es-tick es-tick-xlow">low</span>
            <span className="es-tick es-tick-xhigh">high</span>
            <span className="es-tick es-tick-ylow">low</span>
            <span className="es-tick es-tick-yhigh">high</span>

            <div className={`es-hatch es-hatch-script${shown(1)}`}>
              <span className="es-hatch-label">Write a script, save tokens</span>
            </div>
            <div className={`es-hatch es-hatch-ood${shown(2)}`}>
              <span className="es-hatch-label">
                Data risk of OOD in pretraining /<br />
                sparse rewards for RL
              </span>
            </div>
            <div className={`es-hatch es-hatch-verif${shown(3)}`}>
              <span className="es-hatch-label">
                Verification is indistinguishable from execution
              </span>
            </div>
            <div className={`es-hatch es-hatch-np${shown(4)}`}>
              <span className="es-hatch-label">
                {'Verification ~< execution'}
                <br />
                NP w/ adversarial agents ;)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
