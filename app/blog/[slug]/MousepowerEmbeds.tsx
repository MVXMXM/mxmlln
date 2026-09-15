'use client';

import { ComputeStatement } from '../../decks/mousepower/ComputeStatement';
import { DoomLoop } from '../../decks/mousepower/DoomLoop';
import { EntropyPaper } from '../../decks/mousepower/EntropyPaper';
import { EntropySliders } from '../../decks/mousepower/EntropySliders';
import { GinDiagram } from '../../decks/mousepower/GinDiagram';
import { HorsepowerSequence } from '../../decks/mousepower/HorsepowerSequence';
import { MousepowerMeasure } from '../../decks/mousepower/MousepowerMeasure';
import { SpendVsTokens } from '../../decks/mousepower/SpendVsTokens';
import { TokensSequence } from '../../decks/mousepower/TokensSequence';
import { VerificationStats } from '../../decks/mousepower/VerificationStats';
import { DeckEmbed } from './DeckEmbed';

export function HorsepowerEmbed() {
  return (
    <DeckEmbed caption="A horse gin, then the Watt engine that needed a unit a mill owner already understood.">
      <HorsepowerSequence />
    </DeckEmbed>
  );
}

export function GinEmbed() {
  return (
    <DeckEmbed caption="One horsepower = 33,000 ft·lbf/min. If we can't measure ROI, we can't communicate value.">
      <GinDiagram />
    </DeckEmbed>
  );
}

export function DoomLoopEmbed() {
  return (
    <DeckEmbed caption="FOMO licenses the spend. Tokenmaxxing lights the meter. The bill arrives. Austerity slams the brakes.">
      <DoomLoop />
    </DeckEmbed>
  );
}

export function SpendEmbed() {
  return (
    <DeckEmbed caption="Coinbase AI spend versus token usage — both exploding, neither answering whether the work got better.">
      <SpendVsTokens />
    </DeckEmbed>
  );
}

export function TokensEmbed() {
  return (
    <DeckEmbed caption="Tokens are an output. We want outcomes instead.">
      <TokensSequence />
    </DeckEmbed>
  );
}

export function VerificationEmbed() {
  return (
    <DeckEmbed>
      <VerificationStats />
    </DeckEmbed>
  );
}

export function ComputeEmbed() {
  return (
    <DeckEmbed>
      <ComputeStatement />
    </DeckEmbed>
  );
}

export function MousepowerMeasureEmbed() {
  return (
    <DeckEmbed caption="Move the pointer. One mousepower never settles — the gag is the point.">
      <MousepowerMeasure />
    </DeckEmbed>
  );
}

export function EntropyPaperEmbed() {
  return (
    <DeckEmbed>
      <EntropyPaper />
    </DeckEmbed>
  );
}

export function EntropyMatrixEmbed() {
  return (
    <DeckEmbed caption="Uncertainty in acceptance criteria versus uncertainty in task steps.">
      <EntropySliders />
    </DeckEmbed>
  );
}
