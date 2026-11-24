import { Fragment } from 'react';

/**
 * Doc-only presentational helpers for the design-system page.
 * Specimens mirror the text styles in app/globals.css.
 * Passed into MDXRemote so content/system.mdx can use them as tags.
 * No interactivity -> server components.
 */

const FAMILIES = {
  sans: 'var(--font-sans)',
  inter: 'var(--font-inter), sans-serif',
  handwritten: 'var(--font-handwritten)',
  mono: 'var(--font-mono)',
  serif: 'var(--font-serif)',
} as const;

const CHARSET = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  `& . , : ; ! ? ' " - – — ( ) [ ] / @ # % * + =`,
] as const;

const TEXT_WRAP: Record<string, 'balance' | 'pretty'> = {
  Display: 'balance',
  H1: 'balance',
  H2: 'balance',
  H3: 'balance',
  Body: 'pretty',
  Caption: 'pretty',
};

const TYPE_FAMILIES = [
  { name: 'Archivo', font: 'var(--font-sans)', weight: 600, script: false },
  { name: 'Inter', font: FAMILIES.inter, weight: 400, script: false },
  { name: 'Homemade Apple', font: 'var(--font-handwritten)', weight: 400, script: true },
  { name: 'Playfair Display', font: 'var(--font-serif)', weight: 600, script: false },
  { name: 'JetBrains Mono', font: 'var(--font-mono)', weight: 500, script: false },
] as const;

export function Families() {
  return (
    <div className="type-families">
      {TYPE_FAMILIES.map((family) => (
        <div className={family.script ? 'type-family type-family--script' : 'type-family'} key={family.name}>
          <span className="type-specimen-name">{family.name}</span>
          <div className="type-family-row">
            <span
              className="type-family-ag"
              style={{ fontFamily: family.font, fontWeight: family.weight }}
            >
              Ag
            </span>
            <div
              className="type-family-set"
              style={{ fontFamily: family.font, fontWeight: family.weight }}
            >
              {CHARSET.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Type({
  name,
  sample = 'Form follows functionality',
  font = 'sans',
  size,
  weight,
  leading,
  tracking,
  color,
  transform,
  numeric,
  amp,
  bare,
  note,
}: {
  name: string;
  sample?: string;
  font?: keyof typeof FAMILIES;
  size?: string;
  weight?: number | string;
  leading?: string;
  tracking?: string;
  color?: string;
  transform?: 'uppercase';
  numeric?: 'tabular-nums';
  amp?: boolean;
  bare?: boolean;
  note?: string;
}) {
  const text = sample.replaceAll('\\n', '\n');
  const meta = [
    size,
    weight != null && weight !== '' ? String(weight) : null,
    leading ? `leading ${leading}` : null,
    tracking != null ? `tracking ${tracking}` : null,
    transform === 'uppercase' ? 'uppercase' : null,
    numeric === 'tabular-nums' ? 'tabular' : null,
    color ?? null,
    !amp && font !== 'sans' ? font : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="type-specimen">
      <div className="type-specimen-meta">
        <span className="type-specimen-name">{name}</span>
        {bare ? null : <code className="token-value">{meta}</code>}
        {note ? <span className="token-note">{note}</span> : null}
      </div>
      <div
        className="type-specimen-sample"
        style={{
          fontFamily: FAMILIES[font],
          fontWeight: weight as number,
          lineHeight: leading,
          letterSpacing: tracking,
          color,
          textTransform: transform,
          fontVariantNumeric: numeric,
          textWrap: TEXT_WRAP[name] ?? 'wrap',
          whiteSpace: text.includes('\n') ? 'pre-line' : undefined,
          ['--sample-size' as string]: size,
        }}
      >
        <SampleText sample={text} amp={amp} />
      </div>
    </div>
  );
}

function SampleText({ sample, amp }: { sample: string; amp?: boolean }) {
  if (!amp || !sample.includes('&')) return sample;
  const parts = sample.split('&');
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 ? <span className="type-amp">&amp;</span> : null}
      {part}
    </Fragment>
  ));
}
