'use client';

import type { ReactNode } from 'react';

export function Menu<T extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: readonly { id: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="maxos-menu" role="group" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="maxos-menu-option"
          aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.icon != null && <span className="maxos-menu-icon" aria-hidden="true">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
}
