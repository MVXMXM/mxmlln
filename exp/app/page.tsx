'use client';

import { useEffect, useRef, useState } from 'react';

const experiments = [
  { num: '001', title: 'Glass Button', path: '/001' },
  { num: '002', title: 'Liquid Glass', path: '/002' },
  { num: '003', title: 'Experiment 003', path: '/003' },
  { num: '004', title: 'Experiment 004', path: '/004' },
  { num: '005', title: 'Experiment 005', path: '/005' },
  { num: '006', title: 'Experiment 006', path: '/006' },
  { num: '007', title: 'Experiment 007', path: '/007' },
  { num: '008', title: 'Light Card', path: '/008' },
  { num: '009', title: 'Animated Text', path: '/009' },
  { num: '010', title: 'Experiment 010', path: '/010' },
  { num: '011', title: 'ASCII Art', path: '/011' },
  { num: '012', title: 'Chat Interface', path: '/012' },
  { num: '013', title: 'Chat Variant', path: '/013' },
  { num: '014', title: 'Chat Variant', path: '/014' },
  { num: '015', title: 'Shine On Button', path: '/015' },
  { num: '016', title: 'Experiment 016', path: '/016' },
  { num: '017', title: 'Experiment 017', path: '/017' },
  { num: '018', title: 'Experiment 018', path: '/018' },
  { num: '019', title: 'Experiment 019', path: '/019' },
  { num: '020', title: 'Experiment 020', path: '/020' },
  { num: '021', title: 'Reading List', path: '/021' },
  { num: '022', title: 'Loader', path: '/022' },
  { num: '023', title: 'Loader Test', path: '/023' },
  { num: '024', title: 'Experiment 024', path: '/024' },
  { num: '026', title: 'Experiment 026', path: '/026' },
  { num: '027', title: 'Experiment 027', path: '/027' },
  { num: '028', title: 'Experiment 028', path: '/028' },
  { num: '029', title: 'Experiment 029', path: '/029' },
  { num: '030', title: 'Experiment 030', path: '/030' },
  { num: '031', title: 'Agent Loop', path: '/031' },
  { num: '032', title: 'Experiment 032', path: '/032' },
];

export default function Home() {
  const [loadedIframes, setLoadedIframes] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const expNum = entry.target.getAttribute('data-exp');
            if (expNum && !loadedIframes.has(expNum)) {
              setLoadedIframes((prev) => new Set(prev).add(expNum));
              observerRef.current?.unobserve(entry.target);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.01,
      }
    );

    return () => observerRef.current?.disconnect();
  }, []);

  useEffect(() => {
    const cards = document.querySelectorAll('.experiment-preview-wrapper');
    cards.forEach((card) => {
      if (observerRef.current) {
        observerRef.current.observe(card);
      }
    });
  }, []);

  return (
    <>
      <section className="experiments-section">
        <div className="experiments-grid">
          {experiments.map((exp) => (
            <a
              key={exp.num}
              href={exp.path}
              className="experiment-card"
            >
              <div
                className="experiment-preview-wrapper"
                data-exp={exp.num}
              >
                {loadedIframes.has(exp.num) ? (
                  <iframe
                    src={exp.path}
                    className="experiment-preview"
                    title={`Experiment ${exp.num}`}
                    onLoad={(e) => {
                      (e.target as HTMLIFrameElement).classList.add('loaded');
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {exp.num}
                  </div>
                )}
              </div>
              <div className="experiment-number">
                {exp.num}
              </div>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
