'use client';

import { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import { Dock } from '../../components/Dock/Dock';
import { ComponentPreview } from './ComponentPreview';

/**
 * Lightly-interactive replicas of the site chrome, for the /system previews.
 * They convey behavior (hover, active selection, popover) without navigating
 * away. The real components live in app/blog/ — see each ComponentPreview's
 * `source`. The live Minimap is also mounted on this page's left rail.
 */

// The two faces of the mark, both Lottie. "Signature" is the index-page state;
// "Spin" is what article pages drive with scroll direction.
const LOGO_VARIANTS = [
  { key: 'signature', label: 'Signature', path: '/assets/Sig2026.json' },
  { key: 'spin', label: 'Spin', path: '/assets/LogoSpin2026.json' },
] as const;

type LogoVariant = (typeof LOGO_VARIANTS)[number]['key'];

export function LogoDemo() {
  const [variant, setVariant] = useState<LogoVariant>('signature');
  const lottieRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lottieRef.current) return;
    const path = LOGO_VARIANTS.find((v) => v.key === variant)!.path;
    const anim = lottie.loadAnimation({
      container: lottieRef.current,
      path,
      renderer: 'svg',
      loop: true,
      autoplay: true,
    });
    return () => anim.destroy();
  }, [variant]);

  return (
    <>
      <div className="logo-demo-header">
        <h2 id="logo">Logo</h2>
        <div className="segmented" role="tablist" aria-label="Logo variant">
          {LOGO_VARIANTS.map((v) => (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={variant === v.key}
              className={`segmented-option ${variant === v.key ? 'segmented-option--active' : ''}`}
              onClick={() => setVariant(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <ComponentPreview>
        <div ref={lottieRef} className="logo-demo" aria-label="MXMLLN" />
      </ComponentPreview>
    </>
  );
}

const DOCK_SKELETONS = 6;

export function DockDemo() {
  return (
    <div className="dock-demo">
      <div className="dock-demo-stage">
        <div className="dock-demo-scroll">
          {Array.from({ length: DOCK_SKELETONS }, (_, index) => (
            <div className="dock-skeleton" key={index}>
              <div className="dock-skeleton-media" />
              <div className="dock-skeleton-copy">
                <div className="dock-skeleton-line dock-skeleton-line--title" />
                <div className="dock-skeleton-line" />
                <div className="dock-skeleton-line dock-skeleton-line--short" />
              </div>
            </div>
          ))}
        </div>
        <Dock contained />
      </div>
    </div>
  );
}

// Mix of top-level (level 2) and nested (level 3) items so the demo shows the
// indented sub-item design.
const MENU_ITEMS = [
  { label: 'Color', level: 2 },
  { label: 'Typography', level: 2 },
  { label: 'Components', level: 2 },
  { label: 'Logo', level: 3 },
  { label: 'Dock', level: 3 },
  { label: 'Menu', level: 3 },
];

// The labeled popover list. Documented on its own because the list is the
// reusable primitive; the rail of notches around it is specific to the Minimap.
// Clicking an item sets the active state.
export function MenuDemo() {
  const [active, setActive] = useState(2);
  return (
    <div className="minimap-popover minimap-popover--demo">
      {MENU_ITEMS.map((s, i) => (
        <a
          key={s.label}
          href="#"
          className={`minimap-link ${s.level === 3 ? 'minimap-link--sub' : ''} ${i === active ? 'minimap-link--active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            setActive(i);
          }}
        >
          {s.label}
        </a>
      ))}
    </div>
  );
}
