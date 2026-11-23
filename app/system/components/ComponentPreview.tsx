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
  block = false,
  children,
}: {
  background?: 'light' | 'dark' | 'checker' | 'glass';
  /** Taller, top-aligned canvas — for content that needs vertical room (popovers). */
  tall?: boolean;
  block?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="component-preview">
      <div
        className={`component-preview-canvas component-preview-canvas--${background}${tall ? ' component-preview-canvas--tall' : ''}${block ? ' component-preview-canvas--block' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}
