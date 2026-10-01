'use client';

import {
  Children,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

/**
 * A slide may register a forward "interceptor" while it is the active slide.
 * When set, pressing forward runs the interceptor (passing a `done` callback)
 * instead of advancing immediately — the deck advances only when `done` fires.
 * Used by the title slide to glide its mouse to centre before handing off to the
 * centered agent on the next slide (a seamless transition). Backward navigation
 * is never intercepted.
 */
type Interceptor = (done: () => void) => void;

export type DeckContextValue = {
  activeIndex: number;
  setForwardInterceptor: (fn: Interceptor | null) => void;
  // Blog embeds skip window key listeners and autoplay build steps instead.
  embed?: boolean;
};

export const DeckContext = createContext<DeckContextValue | null>(null);

export function useDeck() {
  const ctx = useContext(DeckContext);
  if (!ctx) throw new Error('useDeck must be used within a <Deck>');
  return ctx;
}

// Each slide is rendered inside a provider carrying its own index, so a slide
// component can tell whether it is the active one. Preview miniatures render
// their clone with index -1 so it can never match activeIndex — keeping every
// slide's active-gated side effects (interceptors, keydown, animations) inert.
export const SlideIndexContext = createContext(0);
export function useSlideIndex() {
  return useContext(SlideIndexContext);
}

const FWD = new Set(['ArrowRight', 'ArrowDown', ' ']);
const BACK = new Set(['ArrowLeft', 'ArrowUp', 'Backspace']);

/** Shared build-step machine for slides that advance on → before the deck does. */
export function useBuildSteps(
  steps: number,
  opts?: { interval?: number; onAdvance?: (from: number) => void }
) {
  const { activeIndex, embed } = useDeck();
  const index = useSlideIndex();
  const active = activeIndex === index;
  const [step, setStep] = useState(0);
  const onAdvanceRef = useRef(opts?.onAdvance);
  onAdvanceRef.current = opts?.onAdvance;
  const interval = opts?.interval ?? 2800;

  useEffect(() => {
    if (active) setStep(0);
  }, [active]);

  useEffect(() => {
    if (!active || embed) return;
    const onKey = (e: KeyboardEvent) => {
      if (FWD.has(e.key) && step < steps - 1) {
        e.preventDefault();
        e.stopImmediatePropagation();
        onAdvanceRef.current?.(step);
        setStep((s) => Math.min(s + 1, steps - 1));
      } else if (BACK.has(e.key) && step > 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setStep((s) => Math.max(s - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [active, step, embed, steps]);

  useEffect(() => {
    if (!active || !embed) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStep(steps - 1);
      return;
    }
    const id = window.setInterval(() => {
      setStep((s) => {
        onAdvanceRef.current?.(s);
        return (s + 1) % steps;
      });
    }, interval);
    return () => window.clearInterval(id);
  }, [active, embed, steps, interval]);

  return { active, step, setStep };
}

// Rendered width of a hover-preview miniature (px). Its height is derived from
// the live viewport ratio so the thumbnail matches what's on screen.
const PREVIEW_WIDTH = 200;

/**
 * Fullscreen slideshow shell for a deck. Each top-level child is one slide;
 * only the active slide is shown (others fade out). Navigate with the arrow
 * keys (← / →, or ↑ / ↓) and Space / Backspace. Renders full-bleed — no chrome
 * — so it fills the entire screen for presenting.
 */
export function Deck({ children }: { children: React.ReactNode }) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const [index, setIndex] = useState(0);

  // Pagination-tick hover preview: which slide is hovered, that tick's offset
  // from the row centre (px, so the thumbnail sits above the tick), and the live
  // viewport size (used to size/scale the miniature so it mirrors the screen).
  const [hover, setHover] = useState<number | null>(null);
  const [hoverDX, setHoverDX] = useState(0);
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null);

  // Anchor the preview above a tick: offset = tick centre − row centre, clamped
  // so a near-edge thumbnail stays fully on screen.
  const showPreview = useCallback((i: number, tick: HTMLElement) => {
    const row = tick.parentElement;
    if (row) {
      const dx = tick.offsetLeft + tick.offsetWidth / 2 - row.offsetWidth / 2;
      const max = Math.max(0, (window.innerWidth - PREVIEW_WIDTH) / 2 - 12);
      setHoverDX(Math.min(Math.max(dx, -max), max));
    }
    setHover(i);
  }, []);

  // Forward interceptor + a busy latch so a transition can't be double-fired.
  const interceptor = useRef<Interceptor | null>(null);
  const busy = useRef(false);

  const setForwardInterceptor = useCallback((fn: Interceptor | null) => {
    interceptor.current = fn;
  }, []);

  // Jump straight to a slide (clicking a tick). Clears any pending interceptor
  // latch so a jump out of a mid-transition slide can't wedge.
  const jumpTo = useCallback(
    (i: number) => {
      busy.current = false;
      setIndex(Math.min(Math.max(i, 0), count - 1));
    },
    [count]
  );

  useEffect(() => {
    const measure = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const go = useCallback(
    (delta: number) => {
      if (busy.current) return;
      // Forward with an interceptor: run it, advance on its `done` callback.
      if (delta > 0 && interceptor.current) {
        busy.current = true;
        interceptor.current(() => {
          busy.current = false;
          setIndex((i) => Math.min(i + 1, count - 1));
        });
        return;
      }
      setIndex((i) => Math.min(Math.max(i + delta, 0), count - 1));
    },
    [count]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          go(1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'Backspace':
          e.preventDefault();
          go(-1);
          break;
        case 'Home':
          e.preventDefault();
          setIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setIndex(count - 1);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, count]);

  return (
    <DeckContext.Provider value={{ activeIndex: index, setForwardInterceptor }}>
      <div className="deck-viewport">
        {slides.map((slide, i) => (
          <section
            key={i}
            className="deck-slide"
            data-active={i === index}
            aria-hidden={i !== index}
          >
            <SlideIndexContext.Provider value={i}>{slide}</SlideIndexContext.Provider>
          </section>
        ))}
        {count > 1 && (
          <div className="deck-progress-wrap" onMouseLeave={() => setHover(null)}>
            {hover !== null && viewport && (
              <div className="deck-preview" style={{ '--dx': `${hoverDX}px` } as React.CSSProperties}>
                <span
                  className="deck-preview-stage"
                  style={{
                    width: PREVIEW_WIDTH,
                    height: Math.round((viewport.h * PREVIEW_WIDTH) / viewport.w),
                  }}
                >
                  <span
                    className="deck-preview-scale"
                    style={{
                      width: viewport.w,
                      height: viewport.h,
                      transform: `scale(${PREVIEW_WIDTH / viewport.w})`,
                    }}
                  >
                    <SlideIndexContext.Provider value={-1}>
                      {slides[hover]}
                    </SlideIndexContext.Provider>
                  </span>
                </span>
              </div>
            )}
            <div className="deck-progress">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className="deck-progress-hit"
                  aria-label={`Go to slide ${i + 1}`}
                  onMouseEnter={(e) => showPreview(i, e.currentTarget)}
                  onFocus={(e) => showPreview(i, e.currentTarget)}
                  onClick={() => jumpTo(i)}
                >
                  <span className="deck-progress-tick" data-active={i === index} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </DeckContext.Provider>
  );
}
