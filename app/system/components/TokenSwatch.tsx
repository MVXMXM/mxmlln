/**
 * Doc-only presentational helpers for the design-system page.
 * These render token values from globals.css / blog.css as visual specimens.
 * They are passed into MDXRemote so content/system.mdx can use them as tags.
 * No interactivity -> server components.
 */

export function Type({
  name,
  sample = 'Form follows functionality',
  font = 'sans',
  size,
  weight,
  note,
}: {
  name: string;
  sample?: string;
  font?: 'sans' | 'handwritten' | 'mono';
  size?: string;
  weight?: number | string;
  note?: string;
}) {
  const fontFamily =
    font === 'handwritten'
      ? "var(--font-homemade-apple), 'Homemade Apple', cursive"
      : font === 'mono'
        ? "'JetBrains Mono', monospace"
        : "var(--font-archivo), 'Archivo', sans-serif";
  return (
    <div className="type-specimen">
      <div className="type-specimen-meta">
        <span className="type-specimen-name">{name}</span>
        <code className="token-value">
          {[size, weight ? `weight ${weight}` : null, font].filter(Boolean).join(' · ')}
        </code>
        {note ? <span className="token-note">{note}</span> : null}
      </div>
      <div
        className="type-specimen-sample"
        style={{ fontFamily, fontSize: size, fontWeight: weight as number }}
      >
        {sample}
      </div>
    </div>
  );
}
