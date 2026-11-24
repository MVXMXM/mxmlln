import type { ComponentPropsWithoutRef } from 'react';

export function Kbd({ className, ...props }: ComponentPropsWithoutRef<'kbd'>) {
  return <kbd {...props} className={className ? `maxos-kbd ${className}` : 'maxos-kbd'} />;
}
