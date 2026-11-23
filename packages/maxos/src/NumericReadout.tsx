'use client';

import { useState } from 'react';

function RollingDigit({ digit, countsDown }: { digit: string; countsDown: boolean }) {
  const [change, setChange] = useState({ digit, previous: '', countsDown, revision: 0 });
  if (digit !== change.digit) {
    setChange({ digit, previous: change.digit, countsDown, revision: change.revision + 1 });
  }

  return (
    <span className="maxos-numeric-digit" data-counts-down={change.countsDown || undefined}>
      {change.previous && <span key={`out-${change.revision}`} data-outgoing>{change.previous}</span>}
      <span key={change.revision} data-incoming={change.revision > 0 || undefined}>{change.digit}</span>
    </span>
  );
}

export function NumericReadout({ text }: { text: string }) {
  const value = Number(text);
  const [change, setChange] = useState({ value, countsDown: false });
  if (value !== change.value) setChange({ value, countsDown: value < change.value });

  return [...text].map((character, index) => {
    const column = text.length - index;
    return /\d/.test(character)
      ? <RollingDigit key={column} digit={character} countsDown={change.countsDown} />
      : <span key={column}>{character}</span>;
  });
}
