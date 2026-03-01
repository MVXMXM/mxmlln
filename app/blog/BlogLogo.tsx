'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

const SCROLL_PAUSE_MS = 120;

export function BlogLogo() {
  const pathname = usePathname();
  const isArticlePage = pathname !== '/blog' && pathname.startsWith('/blog/');
  const lottieRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<ReturnType<typeof lottie.loadAnimation> | null>(null);
  const scrollStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (!isArticlePage || !lottieRef.current) return;

    animRef.current = lottie.loadAnimation({
      container: lottieRef.current,
      path: '/assets/LogoSpin2026.json',
      renderer: 'svg',
      loop: true,
      autoplay: false,
    });

    return () => {
      animRef.current?.destroy();
      animRef.current = null;
    };
  }, [isArticlePage]);

  useEffect(() => {
    if (!isArticlePage) return;

    const onScroll = () => {
      const y = window.scrollY ?? document.documentElement.scrollTop;
      const anim = animRef.current;
      if (anim) {
        const direction = y > lastScrollYRef.current ? 1 : -1;
        lastScrollYRef.current = y;
        anim.setDirection(direction);
        anim.play();
      }
      if (scrollStopTimeoutRef.current) {
        clearTimeout(scrollStopTimeoutRef.current);
      }
      scrollStopTimeoutRef.current = setTimeout(() => {
        animRef.current?.pause();
        scrollStopTimeoutRef.current = null;
      }, SCROLL_PAUSE_MS);
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (scrollStopTimeoutRef.current) {
        clearTimeout(scrollStopTimeoutRef.current);
      }
      animRef.current?.pause();
    };
  }, [isArticlePage]);

  return (
    <div className="blog-logo">
      <a href="/blog">
        {isArticlePage ? (
          <div ref={lottieRef} className="blog-logo-lottie" aria-hidden />
        ) : (
          <img src="/assets/Sig2026.gif" alt="MXMLLN" width={100} height={100} />
        )}
      </a>
    </div>
  );
}
