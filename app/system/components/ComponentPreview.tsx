import React from 'react';

/**
 * Frames a live, interactive component example in a bordered card.
 * Authored in content/system.mdx as:
 *
 *   <ComponentPreview background="glass"><DockDemo /></ComponentPreview>
 *
 * The example itself (children) carries any interactivity; this wrapper is
 * presentational. Where each component lives is noted in the section prose.
 */
export function ComponentPreview({
  background = 'light',
  tall = false,
  square = false,
  children,
}: {
  background?: 'light' | 'dark' | 'checker' | 'glass';
  /** Taller, top-aligned canvas — for content that needs vertical room (popovers). */
  tall?: boolean;
  /** Canvas matches its width, for specimens that should read as a square stage. */
  square?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`component-preview${square ? ' component-preview--square' : ''}`}>
      <div
        className={`component-preview-canvas component-preview-canvas--${background}${tall ? ' component-preview-canvas--tall' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}
