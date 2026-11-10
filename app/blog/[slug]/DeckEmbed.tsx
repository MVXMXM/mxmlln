'use client';

// Scales a fullscreen deck slide into the blog column the same way Deck.tsx
// builds hover-preview miniatures: a viewport-sized stage, CSS-scaled to fit.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { DeckContext, SlideIndexContext } from '../../decks/Deck';
import '../../decks/decks.css';

const noop = () => {};

export function DeckEmbed({
  children,
  caption,
}: {
  children: ReactNode;
  caption?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [vp, setVp] = useState({ w: 1920, h: 1080 });
  const [scale, setScale] = useState(0.36);

  useEffect(() => {
    const measure = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / window.innerWidth);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15, rootMargin: '80px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <figure className="blog-deck-figure">
      <div
        ref={frameRef}
        className="blog-deck-frame"
        style={{ height: vp.h * scale }}
      >
        <div
          className="blog-deck-stage"
          style={{
            width: vp.w,
            height: vp.h,
            transform: `scale(${scale})`,
          }}
        >
          <DeckContext.Provider
            value={{
              activeIndex: inView ? 0 : -1,
              setForwardInterceptor: noop,
              embed: true,
            }}
          >
            <section
              className="deck-slide deck-slide--embed"
              data-active={inView}
              style={{ background: '#f5f5f5', color: '#3B3B3B' }}
            >
              <SlideIndexContext.Provider value={0}>
                {children}
              </SlideIndexContext.Provider>
            </section>
          </DeckContext.Provider>
        </div>
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
