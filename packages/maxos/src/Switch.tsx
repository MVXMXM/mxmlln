'use client';

export function Switch({
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  checked,
  disabled = false,
  onCheckedChange,
}: {
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      disabled={disabled}
      className="maxos-switch"
      onClick={() => onCheckedChange(!checked)}
    >
      <span className="maxos-switch-knob" aria-hidden="true" />
    </button>
  );
}
