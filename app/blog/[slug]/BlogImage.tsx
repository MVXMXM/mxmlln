'use client';

import { useState, useEffect, useCallback } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function BlogImage(props: any) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, close]);

  return (
    <>
      <figure className="blog-figure" onClick={() => setOpen(true)} style={{ cursor: 'zoom-in' }}>
        <img {...props} />
        {props.alt && <figcaption>{props.alt}</figcaption>}
      </figure>
      {open && (
        <div className="lightbox-overlay" onClick={close}>
          <img src={props.src} alt={props.alt || ''} className="lightbox-image" />
        </div>
      )}
    </>
  );
}
