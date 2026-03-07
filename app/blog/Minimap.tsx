'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Section {
  id: string;
  text: string;
  level: number;
}

interface MinimapProps {
  selector?: string;
}

export default function Minimap({ selector = '.blog-prose h2[id], .blog-prose h3[id]' }: MinimapProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [hovering, setHovering] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback(() => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHovering(true);
  }, []);

  const handleLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => setHovering(false), 150);
  }, []);

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
    <div
      className="minimap"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className="minimap-notches">
        {sections.map((s) => (
          <div
            key={s.id}
            className={`minimap-notch ${s.level === 3 ? 'minimap-notch--sub' : ''} ${activeId === s.id ? 'minimap-notch--active' : ''}`}
          />
        ))}
      </div>
      {hovering && (
        <div className="minimap-popover" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`minimap-link ${s.level === 3 ? 'minimap-link--sub' : ''} ${activeId === s.id ? 'minimap-link--active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
                setHovering(false);
              }}
            >
              {s.text}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
