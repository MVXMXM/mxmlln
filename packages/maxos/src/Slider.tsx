'use client';

export function Slider({
  label,
  min,
  max,
  center,
  value,
  valueText,
  onChange,
  disabled = false,
}: {
  label: string;
  min: number;
  max: number;
  center?: number;
  value: number;
  valueText?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const position = (stop: number) => ((stop - min) / (max - min)) * 100;
  const start = center ?? min;

  return (
    <div className="maxos-slider" data-disabled={disabled || undefined}>
      <div className="maxos-slider-scale" aria-hidden="true">
        <span
          className="maxos-slider-fill"
          style={{
            left: `${position(Math.min(start, value))}%`,
            right: `${100 - position(Math.max(start, value))}%`,
          }}
        />
        {Array.from({ length: max - min + 1 }, (_, index) => {
          const stop = min + index;
          return (
            <span
              className="maxos-slider-tick"
              data-center={stop === center || undefined}
              key={stop}
              style={{ left: `${position(stop)}%` }}
            />
          );
        })}
        <span className="maxos-slider-thumb" style={{ left: `${position(value)}%` }} />
      </div>
      <input
        className="maxos-slider-input"
        type="range"
        aria-label={label}
        aria-valuetext={valueText}
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
    </div>
  );
}
