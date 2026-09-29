'use client';

import dynamic from 'next/dynamic';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Experiment } from '../getExperiments';
import {
  captureElement,
  captureFace,
  disposeTexture,
  precacheFaces,
  registerFace,
} from './capture';
import type { CoverPhase } from './CoverScene';
import type { FlipDir, FlipSession } from './FlipOverlay';
import { noteFor } from './notes';
import './sketchbook.css';

const CoverScene = dynamic(() => import('./CoverScene'), { ssr: false });
const FlipOverlay = dynamic(() => import('./FlipOverlay'), { ssr: false });

const OPEN_MS = 1110;
const CLOSE_MS = 840;

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

function NotesBody({ id }: { id: string }) {
  const note = noteFor(id);
  return (
    <div className="sk-notes">
      <p className="sk-notes__id">{id}</p>
      <h1 className="sk-notes__title">{note.title}</h1>
      <p className="sk-notes__body">{note.body}</p>
    </div>
  );
}

export default function Sketchbook({ experiments }: { experiments: Experiment[] }) {
  const single = useMediaQuery('(max-width: 768px)');
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const n = experiments.length;

  const [phase, setPhase] = useState<CoverPhase>('closed');
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [session, setSession] = useState<FlipSession | null>(null);
  const [painted, setPainted] = useState(false);
  const [pageSize, setPageSize] = useState({ w: 420, h: 600 });

  const sessionRef = useRef<FlipSession | null>(null);
  sessionRef.current = session;
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const sid = useRef(0);

  const open = phase === 'open';
  const lastSpread = Math.max(0, n - 1);
  const lastPage = Math.max(0, n * 2 - 1);

  const modeMounted = useRef(false);
  useEffect(() => {
    if (!modeMounted.current) {
      modeMounted.current = true;
      return;
    }
    if (single) setPageIndex(spreadIndex * 2 + 1);
    else setSpreadIndex(Math.floor(pageIndex / 2));
    // sync only when the breakpoint flips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [single]);

  const [frameScale, setFrameScale] = useState(0.28);

  useEffect(() => {
    const el = rightRef.current;
    if (!el) return;
    const measure = () => {
      const page = el.getBoundingClientRect();
      const well = el.querySelector('.sk-frame-well')?.getBoundingClientRect();
      if (page.width && page.height) setPageSize({ w: page.width, h: page.height });
      const box = well?.width && well.height ? well : page;
      if (box.width && box.height) {
        setFrameScale(
          Math.max(box.width / window.innerWidth, box.height / window.innerHeight),
        );
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [single, phase, spreadIndex, pageIndex]);

  const neighborIdxs = useMemo(() => {
    const base = single ? Math.floor(pageIndex / 2) : spreadIndex;
    return [base - 1, base, base + 1, base + 2].filter((i) => i >= 0 && i < n);
  }, [single, pageIndex, spreadIndex, n]);

  useEffect(() => {
    if (phase !== 'open' && phase !== 'opening') return;
    const ids = neighborIdxs.flatMap((i) => {
      const id = experiments[i]?.id;
      return id ? [`notes:${id}`, `notes-flat:${id}`] : [];
    });
    precacheFaces(ids);
  }, [phase, neighborIdxs, experiments]);

  const visibleExpIndex = single ? Math.floor(pageIndex / 2) : spreadIndex;
  const paintedExpIndex =
    session && painted && session.dir === 'fwd' && !single
      ? Math.min(lastSpread, spreadIndex + 1)
      : visibleExpIndex;

  const leftExp = experiments[single ? -1 : spreadIndex];
  const leftId =
    session && painted && session.dir === 'back' && !single
      ? experiments[spreadIndex - 1]?.id
      : leftExp?.id;

  const canFlip = useCallback(
    (dir: FlipDir) => {
      if (session) return false;
      if (single) return dir === 'fwd' ? pageIndex < lastPage : pageIndex > 0;
      return dir === 'fwd' ? spreadIndex < lastSpread : spreadIndex > 0;
    },
    [session, single, pageIndex, lastPage, spreadIndex, lastSpread],
  );

  const commit = useCallback(
    (dir: FlipDir) => {
      if (single) {
        setPageIndex((i) => Math.max(0, Math.min(lastPage, i + (dir === 'fwd' ? 1 : -1))));
      } else {
        setSpreadIndex((i) => Math.max(0, Math.min(lastSpread, i + (dir === 'fwd' ? 1 : -1))));
      }
    },
    [single, lastPage, lastSpread],
  );

  const closeBook = useCallback(() => {
    if (phase !== 'open' || session) return;
    if (reduceMotion) {
      setPhase('closed');
      setSpreadIndex(0);
      setPageIndex(0);
      return;
    }
    setPhase('closing');
    window.setTimeout(() => {
      setPhase('closed');
      setSpreadIndex(0);
      setPageIndex(0);
    }, CLOSE_MS);
  }, [phase, session, reduceMotion]);

  const openBook = useCallback(() => {
    if (phase !== 'closed') return;
    if (reduceMotion) {
      setPhase('open');
      return;
    }
    setPhase('opening');
    window.setTimeout(() => setPhase('open'), OPEN_MS);
  }, [phase, reduceMotion]);

  const startFlip = useCallback(
    async (dir: FlipDir) => {
      if (sessionRef.current || !canFlip(dir)) return null;
      if (reduceMotion) {
        commit(dir);
        return null;
      }
      const pageEl = rightRef.current;
      if (!pageEl) return null;

      try {
        const withTimeout = <T,>(p: Promise<T>, ms: number) =>
          Promise.race([
            p,
            new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error('capture timeout')), ms)),
          ]);

        let frontTex;
        let backTex;
        if (single) {
          const nextIdx = dir === 'fwd' ? pageIndex + 1 : pageIndex - 1;
          const nextExp = experiments[Math.floor(nextIdx / 2)];
          [frontTex, backTex] = await withTimeout(
            Promise.all([
              captureElement(pageEl),
              nextIdx % 2 === 0
                ? captureFace(`notes:${nextExp.id}`)
                : captureFace(`exp:${nextExp.id}`),
            ]),
            1800,
          );
        } else if (dir === 'fwd') {
          const next = experiments[spreadIndex + 1];
          [frontTex, backTex] = await withTimeout(
            Promise.all([captureElement(pageEl), captureFace(`notes:${next.id}`)]),
            1800,
          );
        } else {
          const prev = experiments[spreadIndex - 1];
          const left = leftRef.current;
          [frontTex, backTex] = await withTimeout(
            Promise.all([
              captureFace(`exp:${prev.id}`),
              left
                ? captureElement(left)
                : captureFace(`notes:${experiments[spreadIndex].id}`),
            ]),
            1800,
          );
        }

        const rect = pageEl.getBoundingClientRect();
        const next: FlipSession = {
          id: ++sid.current,
          dir,
          frontTex,
          backTex,
          frontFlatTex: frontTex,
          backFlatTex: backTex,
          spineX: rect.left - window.innerWidth / 2,
          bottomY: window.innerHeight / 2 - rect.bottom,
          pageW: rect.width,
          pageH: rect.height,
          motion: {
            fx: rect.width,
            fy: 0,
            fxTarget: rect.width,
            fyTarget: 0,
            dragging: false,
            smoothTime: 0.13,
            done: false,
          },
        };
        setSession(next);
        return next;
      } catch {
        commit(dir);
        return null;
      }
    },
    [canFlip, reduceMotion, commit, single, pageIndex, experiments, spreadIndex],
  );

  const finishFlip = useCallback(
    (committed: boolean) => {
      const current = sessionRef.current;
      if (!current) return;
      if (committed) commit(current.dir);
      disposeTexture(current.frontTex, current.backTex, current.frontFlatTex, current.backFlatTex);
      setSession(null);
      setPainted(false);
    },
    [commit],
  );

  const flip = useCallback(
    async (dir: FlipDir) => {
      const started = await startFlip(dir);
      if (!started) return;
      started.motion.fxTarget = -started.pageW;
      started.motion.fyTarget = 0;
      started.motion.fy = started.pageH * 0.06;
      started.motion.dragging = false;
      started.motion.smoothTime = 0.22;
    },
    [startFlip],
  );

  const goBack = useCallback(() => {
    if (!open || sessionRef.current) return;
    if (canFlip('back')) flip('back');
    else closeBook();
  }, [open, canFlip, flip, closeBook]);

  const goFwd = useCallback(() => {
    if (!open || sessionRef.current) return;
    if (canFlip('fwd')) flip('fwd');
    else closeBook();
  }, [open, canFlip, flip, closeBook]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goFwd();
      if (e.key === 'ArrowLeft') goBack();
      if (e.key === 'Escape') closeBook();
    };
    const onClick = (e: MouseEvent) => {
      if (sessionRef.current || e.button !== 0) return;
      const hit = e.target instanceof Element ? e.target.closest('.sk-frame, iframe') : null;
      if (e.clientX < window.innerWidth / 2) goBack();
      else if (!hit) goFwd();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
    };
  }, [open, goFwd, goBack, closeBook]);

  if (!n) {
    return (
      <div className="sk-root">
        <div className="sk-viewport">
          <p>No experiments yet.</p>
        </div>
      </div>
    );
  }

  const currentId = experiments[visibleExpIndex]?.id;
  const showCover = phase === 'closed' || phase === 'opening' || phase === 'closing';

  return (
    <div className={`sk-root${open ? ' is-open' : ''}`}>
      <div className="sk-viewport">
        <div className="sk-vignette" aria-hidden />
        <div className="sk-film" aria-hidden />

        <div className={`sk-book-scene ${phase !== 'closed' ? 'is-visible' : ''}`}>
          <div
            className={`sk-book ${single ? 'is-single' : ''}`}
            style={{
              ['--sk-fill-left' as string]: String(spreadIndex / Math.max(1, lastSpread)),
              ['--sk-fill-right' as string]: String(1 - spreadIndex / Math.max(1, lastSpread)),
              ['--sk-pile-left' as string]: `calc(var(--sk-u) * ${0.35 + 1.1 * (spreadIndex / Math.max(1, lastSpread))})`,
              ['--sk-pile-right' as string]: `calc(var(--sk-u) * ${0.35 + 1.1 * (1 - spreadIndex / Math.max(1, lastSpread))})`,
            }}
          >
            <div className="sk-book__cover" aria-hidden />
            <div className="sk-book__edges sk-book__edges--left" aria-hidden />
            <div className="sk-book__edges sk-book__edges--right" aria-hidden />
            <div className="sk-book__edges sk-book__edges--bottom-left" aria-hidden />
            <div className="sk-book__edges sk-book__edges--bottom-right" aria-hidden />
            <div className="sk-book__block">
              <div className="sk-spread">
                {!single && leftId && (
                  <div className="sk-page sk-page--left" ref={leftRef}>
                    <div className="sk-page__content">
                      <NotesBody id={leftId} />
                    </div>
                    <div className="sk-page__shading" />
                    <div className="sk-page__grain" />
                    <span className="sk-folio">{experiments.findIndex((e) => e.id === leftId) * 2 + 1}</span>
                  </div>
                )}
                <div
                  className={`sk-page sk-page--right ${single ? 'is-single' : ''} ${single && pageIndex % 2 === 0 ? '' : 'sk-page--live'}`}
                  ref={rightRef}
                >
                  {single && pageIndex % 2 === 0 ? (
                    <div className="sk-page__content" style={{ padding: 'calc(var(--sk-u) * 5.4) calc(var(--sk-u) * 7) calc(var(--sk-u) * 6.5) calc(var(--sk-u) * 5.2)' }}>
                      <NotesBody id={currentId} />
                    </div>
                  ) : (
                    <div className="sk-page__content">
                      <div className="sk-frame-well">
                      {neighborIdxs.map((i) => {
                        const exp = experiments[i];
                        const active = single
                          ? pageIndex % 2 === 1 && i === visibleExpIndex
                          : i === paintedExpIndex;
                        return (
                          <div
                            key={exp.id}
                            className={`sk-frame ${active ? 'is-current' : 'is-waiting'}`}
                            style={{
                              transform: `translate(-50%, -50%) scale(${frameScale})`,
                            }}
                          >
                            <iframe
                              src={exp.path}
                              title={noteFor(exp.id).title}
                              ref={(el) => registerFace(`exp:${exp.id}`, el)}
                              style={{
                                pointerEvents: active && !session ? 'auto' : 'none',
                              }}
                              tabIndex={active ? 0 : -1}
                              aria-hidden={!active}
                            />
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                  <div className="sk-page__shading" />
                  <div className="sk-page__grain" />
                  <span className="sk-folio">
                    {single ? pageIndex + 1 : spreadIndex * 2 + 2}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {open && <div className="sk-turn sk-turn--back" aria-hidden />}

        <FlipOverlay
          session={session}
          onFirstPaint={() => setPainted(true)}
          onSettled={finishFlip}
        />

        {showCover && (
          <CoverScene phase={phase} pageW={pageSize.w} pageH={pageSize.h} onOpen={openBook} />
        )}

        <div className="sk-capture" aria-hidden>
          {experiments.map((exp) => (
            <div key={exp.id}>
              <div
                className="sk-page sk-page--left"
                ref={(el) => registerFace(`notes:${exp.id}`, el)}
              >
                <div className="sk-page__content">
                  <NotesBody id={exp.id} />
                </div>
                <div className="sk-page__shading" />
                <div className="sk-page__grain" />
              </div>
              <div
                className="sk-page sk-page--left sk-page--flat"
                ref={(el) => registerFace(`notes-flat:${exp.id}`, el)}
              >
                <div className="sk-page__content">
                  <NotesBody id={exp.id} />
                </div>
                <div className="sk-page__shading" />
                <div className="sk-page__grain" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
