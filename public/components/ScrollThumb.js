(function () {
  let dispose = null;

  function mountScrollThumb() {
    if (dispose) dispose();

    const thumb = document.createElement('div');
    thumb.className = 'scrollThumb is-off';
    thumb.setAttribute('aria-hidden', 'true');
    document.body.appendChild(thumb);

    const scroller = () => document.scrollingElement;

    function sync() {
      const se = scroller();
      const max = se.scrollHeight - se.clientHeight;
      const locked = getComputedStyle(document.body).overflowY === 'hidden';
      const off = locked || max <= 1;
      thumb.classList.toggle('is-off', off);
      if (off) return;
      const track = se.clientHeight;
      const size = Math.max(36, (track / se.scrollHeight) * track);
      const y = (se.scrollTop / max) * (track - size);
      thumb.style.height = size + 'px';
      thumb.style.transform = 'translateY(' + y + 'px)';
    }

    addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);
    const resizeObserver = window.ResizeObserver ? new ResizeObserver(sync) : null;
    if (resizeObserver) resizeObserver.observe(document.body);
    const mutationObserver = new MutationObserver(sync);
    mutationObserver.observe(document.body, { attributes: true, attributeFilter: ['style'] });

    let drag = null;
    const onDown = (event) => {
      if (thumb.classList.contains('is-off')) return;
      const se = scroller();
      drag = {
        y: event.clientY,
        top: se.scrollTop,
        max: se.scrollHeight - se.clientHeight,
        track: se.clientHeight - thumb.offsetHeight
      };
      thumb.setPointerCapture(event.pointerId);
      event.preventDefault();
    };
    const onMove = (event) => {
      if (!drag || drag.track <= 0) return;
      const next = drag.top + ((event.clientY - drag.y) / drag.track) * drag.max;
      scroller().scrollTo({ top: Math.min(drag.max, Math.max(0, next)), behavior: 'instant' });
    };
    const endDrag = () => { drag = null; };

    thumb.addEventListener('pointerdown', onDown);
    thumb.addEventListener('pointermove', onMove);
    thumb.addEventListener('pointerup', endDrag);
    thumb.addEventListener('pointercancel', endDrag);

    dispose = () => {
      removeEventListener('scroll', sync);
      removeEventListener('resize', sync);
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      thumb.remove();
      dispose = null;
    };

    sync();
  }

  window.mountScrollThumb = mountScrollThumb;
  window.disposeScrollThumb = () => { if (dispose) dispose(); };
  mountScrollThumb();
})();
