'use client';

import { useState, useEffect, useRef } from 'react';
import './minimap.css';

interface Section {
  id: string;
  text: string;
  level: number;
}

interface MinimapProps {
  selector?: string;
}

// On hover, notch width tracks proximity to the cursor rather than heading
// level: the hovered notch peaks and the bonus halves each step out, down to
// the REVERB_BASE floor. At rest, notches keep their hierarchy widths.
const REVERB_BASE = 4;
const REVERB_AMPLITUDE = 30;
const REVERB_FALLOFF = 0.5;

export default function Minimap({
  selector = '.blog-post-header[id], .blog-prose h2[id], .blog-prose h3[id]',
}: MinimapProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // One persistent label, not one card per notch, so it keeps its last text
  // and position while fading out — leaving the rail shouldn't snap it away.
  const [labelY, setLabelY] = useState(0);
  const [labelText, setLabelText] = useState('');
  const [labelWidth, setLabelWidth] = useState(0);
  const labelTextRef = useRef<HTMLSpanElement>(null);

  // Roll direction tracks cursor travel through the rail, so successive labels
  // read as one reel advancing rather than a cross-fade in place.
  const [prevLabel, setPrevLabel] = useState<string | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const curTextRef = useRef('');
  const prevIndexRef = useRef<number | null>(null);
  const swapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hoveredIndex === null || !sections[hoveredIndex]) return;
    const nextText = sections[hoveredIndex].text;
    const cur = curTextRef.current;
    if (cur && cur !== nextText) {
      const pi = prevIndexRef.current;
      setDir(pi !== null && hoveredIndex < pi ? -1 : 1);
      setPrevLabel(cur);
      if (swapTimer.current) clearTimeout(swapTimer.current);
      swapTimer.current = setTimeout(() => setPrevLabel(null), 320);
    }
    curTextRef.current = nextText;
    prevIndexRef.current = hoveredIndex;
    setLabelText(nextText);
  }, [hoveredIndex, sections]);

  useEffect(() => () => {
    if (swapTimer.current) clearTimeout(swapTimer.current);
  }, []);

  useEffect(() => {
    if (labelTextRef.current) setLabelWidth(labelTextRef.current.scrollWidth);
  }, [labelText]);

  useEffect(() => {
    const headings = document.querySelectorAll(selector);
    const items: Section[] = Array.from(headings).map((el) => ({
      id: el.id,
      text: el.getAttribute('data-minimap-label') || el.textContent || '',
      level: el.tagName === 'H3' ? 3 : 2,
    }));
    setSections(items);
  }, [selector]);

  useEffect(() => {
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) return null;

  return (
    <div className="minimap minimap--reverb" onMouseLeave={() => setHoveredIndex(null)}>
      <div className="minimap-notches">
        {sections.map((s, i) => {
          const restWidth = s.level === 3 ? 10 : 16;
          const width =
            hoveredIndex === null
              ? restWidth
              : REVERB_BASE + REVERB_AMPLITUDE * Math.pow(REVERB_FALLOFF, Math.abs(i - hoveredIndex));
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-label={s.text}
              className={`minimap-notch-row ${activeId === s.id ? 'minimap-notch-row--active' : ''} ${hoveredIndex === i ? 'minimap-notch-row--hovered' : ''}`}
              onMouseEnter={(e) => {
                setHoveredIndex(i);
                setLabelY(e.currentTarget.offsetTop + e.currentTarget.offsetHeight / 2);
              }}
              onFocus={(e) => {
                setHoveredIndex(i);
                setLabelY(e.currentTarget.offsetTop + e.currentTarget.offsetHeight / 2);
              }}
              onBlur={() => setHoveredIndex(null)}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span
                className={`minimap-notch ${s.level === 3 ? 'minimap-notch--sub' : ''} ${activeId === s.id ? 'minimap-notch--active' : ''}`}
                style={{ width: `${width}px` }}
              />
            </a>
          );
        })}
        <div
          className={`minimap-label ${hoveredIndex !== null ? 'minimap-label--visible' : ''}`}
          style={{
            transform: `translateY(${labelY}px) translateY(-50%)`,
            width: labelWidth ? `${labelWidth}px` : undefined,
          }}
          aria-hidden="true"
        >
          <span className="minimap-label-reel">
            {prevLabel !== null && (
              <span
                key={`out-${prevLabel}`}
                className={`minimap-label-text minimap-label-text--out ${dir === 1 ? 'is-down' : 'is-up'}`}
              >
                {prevLabel}
              </span>
            )}
            <span
              key={`in-${labelText}`}
              ref={labelTextRef}
              className={`minimap-label-text minimap-label-text--in ${dir === 1 ? 'is-down' : 'is-up'}`}
            >
              {labelText}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
