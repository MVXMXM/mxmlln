'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import { Dock, type DockItem } from '../../components/Dock/Dock';
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

function WorkSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }, (_, index) => (
        <div className="dock-skeleton" key={index}>
          <div className="dock-skeleton-media" />
          <div className="dock-skeleton-copy">
            <div className="dock-skeleton-line dock-skeleton-line--title" />
            <div className="dock-skeleton-line" />
            <div className="dock-skeleton-line dock-skeleton-line--short" />
          </div>
        </div>
      ))}
    </>
  );
}

const ABOUT_BLOCKS = ['text', 'image', 'text', 'carousel', 'text'] as const;

function AboutMedia({ kind }: { kind: 'image' | 'carousel' }) {
  if (kind === 'carousel') {
    return (
      <div className="dock-skel-carousel">
        <div className="dock-skel-carousel-row">
          <span className="dock-skel-slide" />
          <span className="dock-skel-slide" />
        </div>
        <span className="dock-skel-dots">
          <span />
          <span />
          <span />
        </span>
      </div>
    );
  }
  return <div className="dock-skel-media" />;
}

function AboutSkeleton() {
  return (
    <div className="dock-skel-about" aria-hidden="true">
      {ABOUT_BLOCKS.map((block, index) =>
        block === 'text' ? (
          <div className="dock-skel-note" key={index}>
            <span className="dock-skel-note-title" />
            <span className="dock-skel-note-line" />
          </div>
        ) : (
          <AboutMedia kind={block} key={index} />
        ),
      )}
    </div>
  );
}

function ChatSkeleton({ sent }: { sent: number }) {
  return (
    <div className="dock-skel-chat" aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => (
        <span className={index % 2 ? 'dock-skel-bubble dock-skel-bubble--end' : 'dock-skel-bubble'} key={index} />
      ))}
      {Array.from({ length: sent }, (_, index) => (
        <span className="dock-skel-bubble dock-skel-bubble--end" key={`sent-${index}`} />
      ))}
    </div>
  );
}

export function DockDemo() {
  const [item, setItem] = useState<DockItem>('work');
  const [selected, setSelected] = useState<DockItem>('work');
  const [fading, setFading] = useState(false);
  const [sent, setSent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentSeen = useRef(0);
  const pending = useRef<DockItem | null>(null);
  const fadeTimer = useRef<number | null>(null);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (item !== 'chat') {
      scroller.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    if (reduce) {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' });
      return;
    }
    // Pin the top through the fade-in. The glide has to start there, or the
    // part of the trip that happens while the thread is still transparent is lost.
    scroller.scrollTo({ top: 0, behavior: 'auto' });
    let started = false;
    const pin = () => {
      if (!started) scroller.scrollTop = 0;
    };
    const start = () => {
      if (started) return;
      started = true;
      scroller.removeEventListener('scroll', pin);
      scroller.removeEventListener('transitionend', onEnd);
      scroller.scrollTop = 0;
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
    };
    const onEnd = (event: TransitionEvent) => {
      if (event.propertyName === 'opacity' && event.target === scroller) start();
    };
    scroller.addEventListener('scroll', pin);
    scroller.addEventListener('transitionend', onEnd);
    const id = window.setTimeout(start, 400);
    return () => {
      started = true;
      window.clearTimeout(id);
      scroller.removeEventListener('scroll', pin);
      scroller.removeEventListener('transitionend', onEnd);
    };
  }, [item]);

  useLayoutEffect(() => {
    if (sent === sentSeen.current) return;
    sentSeen.current = sent;
    const scroller = scrollRef.current;
    if (!sent || item !== 'chat' || !scroller) return;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
  }, [sent, item]);

  useEffect(() => {
    return () => {
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    };
  }, []);

  function select(next: DockItem) {
    if (next === pending.current || (next === selected && !fadeTimer.current)) return;
    pending.current = next;
    setSelected(next);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pending.current = null;
      setItem(next);
      return;
    }
    setFading(true);
    if (fadeTimer.current) return;
    fadeTimer.current = window.setTimeout(() => {
      fadeTimer.current = null;
      setItem(pending.current ?? next);
      pending.current = null;
      setFading(false);
    }, 220);
  }

  return (
    <div className="dock-demo">
      <div className="dock-demo-stage">
        <div className="dock-demo-scroll" ref={scrollRef} data-fading={fading || undefined}>
          {item === 'about' ? <AboutSkeleton /> : item === 'chat' ? <ChatSkeleton sent={sent} /> : <WorkSkeleton />}
        </div>
        <Dock contained activeItem={selected} onActiveItemChange={select} onSend={() => setSent((count) => count + 1)} />
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
