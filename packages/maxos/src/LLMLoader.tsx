import type { ComponentPropsWithoutRef } from 'react';

export function LLMLoader({
  children = 'Thinking',
  className,
  ...props
}: ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      role="status"
      {...props}
      className={className ? `maxos-llm-loader ${className}` : 'maxos-llm-loader'}
    >
      {children}
    </span>
  );
}
