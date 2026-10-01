'use client';

import { useState } from 'react';
import BlobScene from './BlobScene';
import CubeScene from './CubeScene';
import GradientScene from './GradientScene';
import PlaneScene from './PlaneScene';
import PlanetScene from './PlanetScene';
import { BG } from './Stage';

const TABS = [
  { id: 'cube', label: 'Cube' },
  { id: 'plane', label: 'Plane' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'blob', label: 'Blob' },
  { id: 'planet', label: 'Planet' },
  { id: 'info', label: 'Info' },
] as const;

const SCENES = {
  cube: CubeScene,
  plane: PlaneScene,
  gradient: GradientScene,
  blob: BlobScene,
  planet: PlanetScene,
} as const;

const SOURCE_HREF =
  'https://blog.maximeheckel.com/posts/the-study-of-shaders-with-react-three-fiber/';

type TabId = (typeof TABS)[number]['id'];

function InfoPanel() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <p className="max-w-xl text-center text-base leading-[1.75] text-white/75">
        These are examples pulled from{' '}
        <a
          href={SOURCE_HREF}
          target="_blank"
          rel="noreferrer"
          className="text-accent underline-offset-4 transition-opacity duration-200 ease-out hover:underline hover:opacity-80"
        >
          Maxime Heckel’s study of shaders with React Three Fiber
        </a>
        .
      </p>
    </div>
  );
}

export default function Page() {
  const [tab, setTab] = useState<TabId>('cube');
  const Scene = tab === 'info' ? null : SCENES[tab];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: BG,
      }}
    >
      <nav className="pointer-events-none absolute inset-x-0 top-5 z-10 flex justify-center px-4">
        <div
          role="tablist"
          aria-label="Shader scenes"
          className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-[40px] p-1.5"
          style={{
            backdropFilter: 'blur(80px)',
            WebkitBackdropFilter: 'blur(80px)',
            backgroundColor: 'rgba(15, 23, 43, 0.55)',
            boxShadow: '0px 3px 30px 0px rgba(0, 0, 0, 0.25)',
            border: 'solid 1px rgba(255, 255, 255, 0.12)',
          }}
        >
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`shrink-0 rounded-[40px] px-5 py-2 text-[13px] font-medium leading-none transition-[background,color,opacity] duration-200 ease-out ${
                  active ? '' : 'hover:opacity-50'
                }`}
                style={{
                  background: active ? '#fcfcfc' : 'transparent',
                  color: active ? '#0f172b' : 'rgba(255, 255, 255, 0.72)',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
      {Scene ? <Scene /> : <InfoPanel />}
    </div>
  );
}
