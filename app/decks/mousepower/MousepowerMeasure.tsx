'use client';

// Interactive measurement slide. A uniform fan of rays runs from the cursor to
// the viewport edge in every direction with live px distances; the pointermove
// handler writes the mousepower value + speed straight to DOM text nodes (no rAF
// loop), so the reading only changes while moving and resets to zero when still.
import { useEffect, useRef, useState } from 'react';
import { useDeck, useSlideIndex } from '../Deck';

type Pt = { x: number; y: number };

// Tabular figures (.mpm-tag / .mpm-eq-val) keep the digits steady as they change.
const fmtValue = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtSpeed = (n: number) => `${Math.round(n).toLocaleString('en-US')} px/s`;
const fmtDist = (n: number) => `${n.toLocaleString('en-US')} px`;

export function MousepowerMeasure() {
  const { activeIndex } = useDeck();
  const index = useSlideIndex();
  const active = activeIndex === index;

  const stageRef = useRef<HTMLDivElement | null>(null);
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const speedRef = useRef<SVGTextElement | null>(null);

  const [size, setSize] = useState<Pt>({ x: 0, y: 0 });
  const [cursor, setCursor] = useState<Pt>({ x: 0, y: 0 });

  // Refs read inside the pointermove handler without re-subscribing it to state.
  const sizeRef = useRef<Pt>({ x: 0, y: 0 });
  const speed = useRef(0); // px/s, smoothed across moves
  const lastMove = useRef<{ x: number; y: number; t: number } | null>(null);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track stage size; seed the cursor at center before the first movement.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      // Layout box (transforms don't affect offset*); needed so a CSS-scaled
      // blog embed still maps rays in the same space as pointer tracking.
      const s = { x: el.offsetWidth, y: el.offsetHeight };
      sizeRef.current = s;
      setSize(s);
      if (!lastMove.current) {
        setCursor({ x: s.x / 2, y: s.y / 2 });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Cursor tracking — only while this slide is active.
  useEffect(() => {
    if (!active) return;
    const onMove = (e: PointerEvent) => {
      const el = stageRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      ) {
        return;
      }
      const sx = r.width / (el.offsetWidth || r.width) || 1;
      const sy = r.height / (el.offsetHeight || r.height) || 1;
      const x = (e.clientX - r.left) / sx;
      const y = (e.clientY - r.top) / sy;
      const now = e.timeStamp;
      const prev = lastMove.current;
      let spd = speed.current;
      if (prev) {
        const dt = now - prev.t;
        if (dt > 0) {
          const d = Math.hypot(x - prev.x, y - prev.y);
          // Exponential smoothing of px/s.
          spd = speed.current * 0.4 + ((d / dt) * 1000) * 0.6;
        }
      }
      speed.current = spd;
      lastMove.current = { x, y, t: now };
      setCursor({ x, y });

      // Rate metric: zero when still (scales with speed); sumD is a position term.
      const { x: w, y: h } = sizeRef.current;
      if (w && h) {
        const sumD =
          Math.hypot(x, y) +
          Math.hypot(w - x, y) +
          Math.hypot(x, h - y) +
          Math.hypot(w - x, h - y);
        const value = (sumD * spd) / 2500;
        if (valueRef.current) valueRef.current.textContent = fmtValue(value);
        if (speedRef.current) speedRef.current.textContent = fmtSpeed(spd);
      }

      // pointermove stops firing when the cursor rests; reset the reading to zero.
      if (idle.current) clearTimeout(idle.current);
      idle.current = setTimeout(() => {
        speed.current = 0;
        if (valueRef.current) valueRef.current.textContent = fmtValue(0);
        if (speedRef.current) speedRef.current.textContent = fmtSpeed(0);
      }, 120);
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (idle.current) clearTimeout(idle.current);
    };
  }, [active]);

  const { x: w, y: h } = size;
  const { x: cx, y: cy } = cursor;

  // Uniform fan of rays, each measured to the viewport edge. Starts outside the
  // probe ring (HOLE); label sits inside the edge endpoint.
  const HOLE = 26;
  const RAYS = 16;
  const rays = Array.from({ length: RAYS }, (_, i) => {
    const a = (i / RAYS) * Math.PI * 2;
    const dxn = Math.cos(a);
    const dyn = Math.sin(a);
    let t = Infinity;
    if (dxn > 1e-6) t = Math.min(t, (w - cx) / dxn);
    else if (dxn < -1e-6) t = Math.min(t, -cx / dxn);
    if (dyn > 1e-6) t = Math.min(t, (h - cy) / dyn);
    else if (dyn < -1e-6) t = Math.min(t, -cy / dyn);
    const d = Math.max(0, t); // distance from cursor to the viewport edge
    const s = Math.min(HOLE, d);
    const li = Math.min(96, d * 0.3); // label inset from the edge (avoids clipping)
    return {
      sx: cx + dxn * s,
      sy: cy + dyn * s,
      ex: cx + dxn * d,
      ey: cy + dyn * d,
      lx: cx + dxn * (d - li),
      ly: cy + dyn * (d - li),
      d,
    };
  });

  return (
    <div className="mpm-stage rack-in" ref={stageRef}>
      {w > 0 && (
        <svg className="mpm-field" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
          <g className="mpm-lines">
            {rays.map((r, i) => (
              <line
                key={`r${i}`}
                className="mpm-line"
                x1={r.sx}
                y1={r.sy}
                x2={r.ex}
                y2={r.ey}
              />
            ))}
          </g>

          {/* Distance read at each ray's edge endpoint. */}
          {rays.map((r, i) => (
            <text key={`l${i}`} className="mpm-tag" x={r.lx} y={r.ly}>
              {fmtDist(Math.round(r.d))}
            </text>
          ))}

          {/* Probe reticle riding the cursor; ring + gapped ticks. */}
          <g className="mpm-probe">
            <circle cx={cx} cy={cy} r="22" className="mpm-probe-ring" />
            <line x1={cx - 34} y1={cy} x2={cx - 15} y2={cy} className="mpm-probe-cross" />
            <line x1={cx + 15} y1={cy} x2={cx + 34} y2={cy} className="mpm-probe-cross" />
            <line x1={cx} y1={cy - 34} x2={cx} y2={cy - 15} className="mpm-probe-cross" />
            <line x1={cx} y1={cy + 15} x2={cx} y2={cy + 34} className="mpm-probe-cross" />
            <text ref={speedRef} className="mpm-tag mpm-speed" x={cx} y={cy + 52}>
              0 px/s
            </text>
          </g>
        </svg>
      )}

      <div className="mpm-eq">
        <span className="mpm-eq-lhs">1 mousepower =</span>{' '}
        <span className="mpm-eq-val" ref={valueRef}>
          0.00
        </span>{' '}
        <span className="mpm-eq-unit">px·rad/s</span>
      </div>
    </div>
  );
}
