'use client';

import { useEffect, useRef, useState } from 'react';

interface Experiment {
  id: string;
  path: string;
}

const CARD_MARGIN = 16;

export default function FolioGallery({ experiments }: { experiments: Experiment[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const sidebarItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const snapTimerRef = useRef<number | null>(null);
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            setActiveIndex(idx);
          }
        });
      },
      { root, rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    );

    cardRefs.current.forEach((el) => el && observer.observe(el));

    const snapToNearest = () => {
      const scrollTop = root.scrollTop;
      let nearestIdx = 0;
      let nearestDist = Infinity;
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const targetTop = card.offsetTop - CARD_MARGIN;
        const dist = Math.abs(targetTop - scrollTop);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      });
      const target = cardRefs.current[nearestIdx];
      if (!target) return;
      const targetTop = target.offsetTop - CARD_MARGIN;
      if (Math.abs(targetTop - scrollTop) < 2) return;
      isProgrammaticScroll.current = true;
      root.scrollTo({ top: targetTop, behavior: 'smooth' });
    };

    const supportsScrollEnd = 'onscrollend' in window;

    const onScrollEnd = () => {
      if (isProgrammaticScroll.current) {
        isProgrammaticScroll.current = false;
        return;
      }
      snapToNearest();
    };

    const onScrollFallback = () => {
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
      snapTimerRef.current = window.setTimeout(() => {
        if (isProgrammaticScroll.current) {
          isProgrammaticScroll.current = false;
          return;
        }
        snapToNearest();
      }, 10);
    };

    if (supportsScrollEnd) {
      root.addEventListener('scrollend', onScrollEnd, { passive: true });
    } else {
      root.addEventListener('scroll', onScrollFallback, { passive: true });
    }

    return () => {
      observer.disconnect();
      if (supportsScrollEnd) root.removeEventListener('scrollend', onScrollEnd);
      else root.removeEventListener('scroll', onScrollFallback);
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
    };
  }, [experiments.length]);

  const scrollToCard = (idx: number) => {
    const root = rootRef.current;
    const target = cardRefs.current[idx];
    if (!root || !target) return;
    isProgrammaticScroll.current = true;
    root.scrollTo({ top: target.offsetTop - CARD_MARGIN, behavior: 'smooth' });
  };

  return (
    <div className="folio-root" ref={rootRef}>
      <header className="sketchbook-hero folio-hero">
        <p className="sketchbook-subhead">taste is a function of tinkering</p>
        <h1 className="sketchbook-title">Interaction Sketchbook</h1>
      </header>
      <div className="folio-layout">
        <aside className="folio-sidebar">
          <div className="folio-eyebrow">Interaction Sketchbook</div>
          {experiments.map((exp, i) => (
            <a
              key={exp.id}
              ref={(el) => { sidebarItemRefs.current[i] = el; }}
              href={`#exp-${exp.id}`}
              className={`folio-sidebar-item ${i === activeIndex ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToCard(i);
              }}
            >
              <span className="title">{exp.id}</span>
            </a>
          ))}
        </aside>

        <main className="folio-cards">
          {experiments.map((exp, i) => (
            <article
              key={exp.id}
              id={`exp-${exp.id}`}
              ref={(el) => { cardRefs.current[i] = el; }}
              data-index={i}
              className={`folio-card ${i === activeIndex ? 'is-active' : ''}`}
              data-exp={exp.id}
            >
              <iframe
                src={exp.path}
                className="folio-card-frame"
                title={`Experiment ${exp.id}`}
                loading="lazy"
              />
            </article>
          ))}
        </main>
      </div>
    </div>
  );
}
