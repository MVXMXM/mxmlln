import React, { useEffect, useRef } from 'react';

interface TextScrambleProps {
  children: React.ReactNode;
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!<>-_\\/[]{}—=+*^?#@%&$£§¢¥€•.,;:~|()';

export const TextScramble: React.FC<TextScrambleProps> = ({ children }) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;

    const spans = Array.from(containerRef.current.querySelectorAll('span'));
    const nextChange = spans.map(() => Date.now() + randomInterval());
    const animating = new Array(spans.length).fill(false);

    function randomInterval() {
      return 1000 + Math.random() * 2000;
    }

    function randomChar() {
      return CHARS[Math.floor(Math.random() * CHARS.length)];
    }

    function animate() {
      const now = Date.now();
      spans.forEach((span, i) => {
        if (span.textContent !== ' ') {
          if (!animating[i] && now >= nextChange[i]) {
            animating[i] = true;
            span.classList.add('scramble-fade');
            setTimeout(() => {
              span.textContent = randomChar();
              span.classList.remove('scramble-fade');
              nextChange[i] = Date.now() + randomInterval();
              animating[i] = false;
            }, 1500);
          }
        } else {
          span.textContent = ' ';
          span.classList.remove('scramble-fade');
          nextChange[i] = now + randomInterval();
          animating[i] = false;
        }
      });
      requestAnimationFrame(animate);
    }

    const animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <span
      ref={containerRef}
      className="ascii"
      data-text-scramble
      style={{
        color: '#94A3B8',
        display: 'inline-block',
        whiteSpace: 'pre',
        letterSpacing: 0.15,
        lineHeight: 1.5,
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 12,
        width: 1300,
        height: 600,
      }}
    >
      {children}
    </span>
  );
}; 
