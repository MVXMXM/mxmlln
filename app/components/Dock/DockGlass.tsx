'use client';

import { Fragment, useEffect, useId, useRef } from 'react';

const AIR_TO_GLASS = 1 / 1.5;
const DISTORTION_CURVE = 5;
const REFRACTION_STRENGTH = 3;
const CHROMA = 0.5;

function roundedRectangleDisplacement(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  radius = Math.min(radius, width / 2, height / 2);
  if (radius <= 0) return { x: 0, y: 0 };
  const halfLineX = width / 2 - radius;
  const halfLineY = height / 2 - radius;
  const localX = (x - Math.max(-halfLineX, Math.min(halfLineX, x))) / radius;
  const localY = (y - Math.max(-halfLineY, Math.min(halfLineY, y))) / radius;
  const distance = Math.hypot(localX, localY);
  const reach = Math.min(1, distance);
  const normalX = distance ? (localX / distance) * reach : 0;
  const normalY = distance ? (localY / distance) * reach : 0;
  const normalZ = Math.sqrt(1 - reach * reach);
  const bend = AIR_TO_GLASS * normalZ - Math.sqrt(1 - AIR_TO_GLASS ** 2 * reach * reach);
  const strength = reach ** DISTORTION_CURVE;
  return { x: normalX * bend * strength, y: normalY * bend * strength };
}

function gaussBoxes(sigma: number) {
  const passes = 3;
  const ideal = Math.sqrt((12 * sigma * sigma) / passes + 1);
  let lower = Math.floor(ideal);
  if (lower % 2 === 0) lower -= 1;
  const upper = lower + 2;
  const count = Math.round(
    (12 * sigma * sigma - passes * lower * lower - 4 * passes * lower - 3 * passes) / (-4 * lower - 4),
  );
  return Array.from({ length: passes }, (_, index) => (index < count ? lower : upper));
}

function blurAxis(
  src: Uint8ClampedArray,
  dst: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  horizontal: boolean,
) {
  const span = radius * 2 + 1;
  if (horizontal) {
    for (let y = 0; y < height; y++) {
      const base = y * width;
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      for (let offset = -radius; offset <= radius; offset++) {
        const pixel = (base + Math.min(width - 1, Math.max(0, offset))) * 4;
        red += src[pixel];
        green += src[pixel + 1];
        blue += src[pixel + 2];
        alpha += src[pixel + 3];
      }
      for (let x = 0; x < width; x++) {
        const out = (base + x) * 4;
        dst[out] = red / span;
        dst[out + 1] = green / span;
        dst[out + 2] = blue / span;
        dst[out + 3] = alpha / span;
        const remove = (base + Math.min(width - 1, Math.max(0, x - radius))) * 4;
        const add = (base + Math.min(width - 1, Math.max(0, x + radius + 1))) * 4;
        red += src[add] - src[remove];
        green += src[add + 1] - src[remove + 1];
        blue += src[add + 2] - src[remove + 2];
        alpha += src[add + 3] - src[remove + 3];
      }
    }
    return;
  }
  for (let x = 0; x < width; x++) {
    let red = 0;
    let green = 0;
    let blue = 0;
    let alpha = 0;
    for (let offset = -radius; offset <= radius; offset++) {
      const pixel = (Math.min(height - 1, Math.max(0, offset)) * width + x) * 4;
      red += src[pixel];
      green += src[pixel + 1];
      blue += src[pixel + 2];
      alpha += src[pixel + 3];
    }
    for (let y = 0; y < height; y++) {
      const out = (y * width + x) * 4;
      dst[out] = red / span;
      dst[out + 1] = green / span;
      dst[out + 2] = blue / span;
      dst[out + 3] = alpha / span;
      const remove = (Math.min(height - 1, Math.max(0, y - radius)) * width + x) * 4;
      const add = (Math.min(height - 1, Math.max(0, y + radius + 1)) * width + x) * 4;
      red += src[add] - src[remove];
      green += src[add + 1] - src[remove + 1];
      blue += src[add + 2] - src[remove + 2];
      alpha += src[add + 3] - src[remove + 3];
    }
  }
}

// The shader frost kernel bands, and a backdrop blur paints behind the sharp
// lens, so the photograph is frosted before it is bent.
function blurPhoto(source: HTMLCanvasElement, sigma: number) {
  const context = source.getContext('2d');
  if (!context || sigma <= 0) return;
  const { width, height } = source;
  const image = context.getImageData(0, 0, width, height);
  const pixels = image.data;
  const scratch = new Uint8ClampedArray(pixels.length);
  for (const diameter of gaussBoxes(sigma)) {
    const radius = (diameter - 1) >> 1;
    blurAxis(pixels, scratch, width, height, radius, true);
    blurAxis(scratch, pixels, width, height, radius, false);
  }
  context.putImageData(image, 0, 0);
}

type CapturedRenderer = Omit<NonNullable<Window['__liquidGLRenderer__']>, 'captureSnapshot'> & {
  scaleFactor?: number;
  captureSnapshot?: () => void;
  _uploadTexture?: (source: HTMLCanvasElement) => void;
  _renderLens?: (lens: unknown) => void;
};

function mountCapturedGlass(dock: HTMLElement) {
  let cancelled = false;
  let recaptureTimer = 0;
  let resizeTimer = 0;
  let revealTimer = 0;
  let refreshing = false;
  let refreshQueued = false;
  let undoLens: (() => void) | null = null;
  let sized = false;
  let lastSize = '';
  let resizing = false;
  let fadeHold = false;
  let fadeEpoch = 0;
  const stage = dock.closest<HTMLElement>('.dock-demo-stage');
  const scroller = stage?.querySelector<HTMLElement>('.dock-demo-scroll') ?? null;
  const snapshot = stage ?? document.body;
  snapshot.setAttribute('data-dock-snapshot', '');
  dock.closest('.mx-dock')?.setAttribute('data-liquid-ignore', '');
  dock.dataset.dockCapture = 'true';

  // One photograph of the whole list. Scroll just slides that photo under
  // the lens. Rephotographing on scroll is what made the refraction lag.
  const refreshSnapshot = async () => {
    const renderer = window.__liquidGLRenderer__ as CapturedRenderer | undefined;
    if (!renderer?._uploadTexture || !scroller || cancelled || dock.dataset.dockGlass !== 'live') return;
    if (refreshing) {
      refreshQueued = true;
      return;
    }
    refreshing = true;
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;pointer-events:none';
    const clone = scroller.cloneNode(true) as HTMLElement;
    clone.removeAttribute('data-fading');
    clone.style.cssText = `position:absolute;left:0;top:0;width:${scroller.clientWidth}px;height:auto;max-height:none;overflow:visible;opacity:1;background:${getComputedStyle(stage ?? scroller).backgroundColor}`;
    host.appendChild(clone);
    document.body.appendChild(host);
    try {
      const { snapdom } = await import('@zumer/snapdom');
      const next = await snapdom.toCanvas(clone, {
        scale: 2,
        dpr: 1,
        backgroundColor: getComputedStyle(stage ?? scroller).backgroundColor,
      });
      const contentHeight = scroller.scrollHeight;
      if (!cancelled && contentHeight > 0) {
        blurPhoto(next, 8);
        renderer.snapshotTarget = scroller;
        renderer.scaleFactor = next.height / contentHeight;
        renderer._uploadTexture(next);
      }
    } catch (error) {
      console.warn('Dock glass recapture failed', error);
    } finally {
      host.remove();
      refreshing = false;
      if (refreshQueued && !cancelled) {
        refreshQueued = false;
        void refreshSnapshot();
      }
    }
  };

  const recapture = () => {
    window.clearTimeout(recaptureTimer);
    recaptureTimer = window.setTimeout(() => {
      void refreshSnapshot();
    }, 280);
  };

  // The photograph has no live backdrop, so a view change frosts over it the
  // same way the Chromium lens does while its map is rebuilding. Resizes use
  // the heavy cover. A fading list uses the resting blur until the new photo
  // is in.
  const applyCover = () => {
    const canvas = (window.__liquidGLRenderer__ as CapturedRenderer | undefined)?.canvas;
    // Glassworks leaves transition:none on the pill, which cancels the grow.
    dock.style.removeProperty('transition');
    if (resizing) {
      dock.dataset.dockMoving = 'true';
      delete dock.dataset.dockVeil;
      // Same cover as the Chromium lens: the tint carries the grow, with no
      // live blur underneath it.
      dock.style.setProperty('backdrop-filter', 'none');
      dock.style.setProperty('-webkit-backdrop-filter', 'none');
    } else if (fadeHold) {
      delete dock.dataset.dockMoving;
      dock.dataset.dockVeil = 'true';
      dock.style.removeProperty('backdrop-filter');
      dock.style.removeProperty('-webkit-backdrop-filter');
    } else {
      delete dock.dataset.dockMoving;
      delete dock.dataset.dockVeil;
      dock.style.removeProperty('backdrop-filter');
      dock.style.removeProperty('-webkit-backdrop-filter');
    }
    if (!canvas) return;
    canvas.style.transition = 'none';
    canvas.style.opacity = resizing || fadeHold ? '0' : '1';
  };

  // The shader falloff is 2 × band. Chromium's bend dies one corner-radius
  // in, so the band is half the used radius and the center of the pill stays flat.
  const fitRim = () => {
    const lens = window.__liquidGLRenderer__?.lenses.find((item) => item.el === dock);
    if (!lens) return;
    const short = Math.min(dock.offsetWidth, dock.offsetHeight);
    const specified = parseFloat(getComputedStyle(dock).borderTopLeftRadius) || 0;
    const radius = Math.min(specified, dock.offsetWidth / 2, dock.offsetHeight / 2);
    if (short > 0 && radius > 0) lens.options.bevelWidth = radius / (2 * short);
  };

  const onResize = () => {
    fitRim();
    const size = `${Math.round(dock.offsetWidth)}x${Math.round(dock.offsetHeight)}`;
    if (!sized) {
      sized = true;
      lastSize = size;
      return;
    }
    if (size === lastSize) return;
    lastSize = size;
    resizing = true;
    applyCover();
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resizing = false;
      applyCover();
    }, 70);
  };

  const onFade = () => {
    const fading = scroller?.hasAttribute('data-fading') ?? false;
    const epoch = ++fadeEpoch;
    if (fading) {
      fadeHold = true;
      applyCover();
      return;
    }
    fadeHold = true;
    applyCover();
    void refreshSnapshot().finally(() => {
      window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(() => {
        if (cancelled || epoch !== fadeEpoch) return;
        fadeHold = false;
        applyCover();
      }, 240);
    });
  };

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(dock);
  const observer = scroller
    ? new MutationObserver((records) => {
        if (records.some((record) => record.attributeName === 'data-fading')) onFade();
        else recapture();
      })
    : null;
  observer?.observe(scroller!, { childList: true, attributes: true, attributeFilter: ['data-fading'] });

  const trackScroll = (renderer: CapturedRenderer) => {
    if (!scroller || !renderer._renderLens || undoLens) return;
    const original = renderer._renderLens.bind(renderer);
    renderer._renderLens = (lens) => {
      if (renderer.snapshotTarget !== scroller) {
        original(lens);
        return;
      }
      const top = scroller.scrollTop;
      const left = scroller.scrollLeft;
      const read = scroller.getBoundingClientRect.bind(scroller);
      scroller.getBoundingClientRect = () => {
        const rect = read();
        return new DOMRect(rect.x - left, rect.y - top, rect.width, rect.height);
      };
      try {
        original(lens);
      } finally {
        scroller.getBoundingClientRect = read;
      }
    };
    renderer.captureSnapshot = () => {
      void refreshSnapshot();
    };
    undoLens = () => {
      renderer._renderLens = original;
      undoLens = null;
    };
  };

  void (async () => {
    try {
      const [{ default: glassworks, createSnapdomEngine }, { snapdom }] = await Promise.all([
        import('@codedgar/glassworks'),
        import('@zumer/snapdom'),
      ]);
      if (cancelled) return;
      glassworks({
        target: '.dockDynamicContainer[data-dock-capture="true"]',
        snapshot: '[data-dock-snapshot]',
        engine: createSnapdomEngine(snapdom),
        resolution: 2,
        refraction: 0.04,
        bevelDepth: 0.012,
        bevelWidth: 0.25,
        frost: 0,
        shadow: false,
        specular: false,
        reveal: 'none',
        tilt: false,
        magnify: 1,
        on: {
          init() {
            if (cancelled) return;
            // The shared canvas is appended to body at z-index 0. The stage's
            // overflow traps the dock, so that canvas paints behind the stage
            // or over the controls. Seating it here puts the lens above the
            // scroll content and under the cluster (z-index 900).
            const canvas = window.__liquidGLRenderer__?.canvas;
            if (canvas && stage) {
              stage.appendChild(canvas);
              canvas.style.zIndex = '2';
            }
            dock.dataset.dockGlass = 'live';
            fitRim();
            applyCover();
            const renderer = window.__liquidGLRenderer__ as CapturedRenderer | undefined;
            if (renderer) trackScroll(renderer);
            void refreshSnapshot();
          },
        },
      });
    } catch (error) {
      console.warn('Dock glass capture failed', error);
      dock.style.opacity = '';
      dock.style.pointerEvents = '';
      dock.style.background = '';
      dock.style.backdropFilter = '';
      dock.style.removeProperty('-webkit-backdrop-filter');
    }
  })();

  return () => {
    cancelled = true;
    window.clearTimeout(recaptureTimer);
    window.clearTimeout(resizeTimer);
    window.clearTimeout(revealTimer);
    resizeObserver.disconnect();
    observer?.disconnect();
    undoLens?.();
    delete dock.dataset.dockMoving;
    delete dock.dataset.dockVeil;
    const renderer = window.__liquidGLRenderer__;
    if (renderer) renderer.lenses = renderer.lenses.filter((lens) => lens.el !== dock);
    delete dock.dataset.dockCapture;
    delete dock.dataset.dockGlass;
    dock.closest('.mx-dock')?.removeAttribute('data-liquid-ignore');
    dock.style.opacity = '';
    dock.style.pointerEvents = '';
    dock.style.background = '';
    dock.style.backgroundColor = '';
    dock.style.backdropFilter = '';
    dock.style.removeProperty('-webkit-backdrop-filter');
    dock.style.transition = '';
    dock.style.boxShadow = '';
    if (!document.querySelector('[data-dock-capture]')) snapshot.removeAttribute('data-dock-snapshot');
  };
}

/**
 * Chromium refracts the backdrop through an SVG displacement map. Safari and
 * Firefox photograph the page and refract that still in WebGL (Glassworks).
 */
export function DockGlass() {
  const id = useId().replace(/:/g, '');
  const ref = useRef<HTMLSpanElement>(null);
  const mapRef = useRef<SVGFEImageElement>(null);
  const displacementRefs = useRef<(SVGFEDisplacementMapElement | null)[]>([]);

  useEffect(() => {
    const backdrop = ref.current;
    const dock = backdrop?.parentElement;
    if (!backdrop || !dock) return;
    if (!/Chrome|Chromium|Edg\//.test(navigator.userAgent)) return mountCapturedGlass(dock);
    // The backdrop is display:none until this is set, so the map can be measured.
    dock.dataset.dockNative = 'true';
    let settleTimer = 0;
    let generation = 0;
    let coverStarted = false;
    let closingAtStart = false;
    let builtSize = '';
    let pendingSize = '';

    // The lens map only matches one size. Frost covers that gap. A backdrop
    // filter on the panel would hide the lens, so the panel stays unfiltered.
    const holdCover = (closing: boolean) => {
      coverStarted = true;
      closingAtStart = closing;
      for (const element of displacementRefs.current) element?.setAttribute('scale', '0');
      backdrop.style.removeProperty('opacity');
      dock.style.setProperty('backdrop-filter', 'none');
      dock.style.setProperty('-webkit-backdrop-filter', 'none');
      dock.dataset.dockNative = 'false';
      dock.dataset.dockMoving = 'true';
    };

    const beginCover = () => {
      const closing = dock.closest('.mx-dock')?.getAttribute('data-closing') === 'true';
      if (coverStarted && closingAtStart === closing) return;
      holdCover(closing);
    };

    const writeScales = (radius: number) => {
      const lens = 2 * radius;
      const displacement = lens * REFRACTION_STRENGTH;
      const chromaSpread = displacement * CHROMA * 0.018;
      const channels = [displacement + chromaSpread, displacement, displacement - chromaSpread];
      for (const [index, scale] of channels.entries()) {
        displacementRefs.current[index]?.setAttribute('scale', String((scale * 255) / 254));
      }
    };

    const showLens = (radius: number, token: number) => {
      if (token !== generation) return;
      coverStarted = false;
      writeScales(radius);
      dock.style.removeProperty('backdrop-filter');
      dock.style.removeProperty('-webkit-backdrop-filter');
      backdrop.style.removeProperty('opacity');
      dock.dataset.dockNative = 'true';
      delete dock.dataset.dockMoving;
    };

    const paintMap = (width: number, height: number, radius: number) => {
      const density = Math.min(1, 512 / width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width * density);
      canvas.height = Math.ceil(height * density);
      const context = canvas.getContext('2d');
      if (!context) return;
      const pixels = context.createImageData(canvas.width, canvas.height);
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const localX = (x + 0.5) / density - width / 2;
          const localY = (y + 0.5) / density - height / 2;
          const direction = roundedRectangleDisplacement(
            localX,
            localY,
            dock.offsetWidth,
            dock.offsetHeight,
            radius,
          );
          const index = (y * canvas.width + x) * 4;
          pixels.data[index] = 128 + 127 * direction.x;
          pixels.data[index + 1] = 128 + 127 * direction.y;
          pixels.data[index + 2] = 128;
          pixels.data[index + 3] = 255;
        }
      }
      context.putImageData(pixels, 0, 0);
      const map = mapRef.current;
      if (!map) return;
      map.setAttribute('width', String(width));
      map.setAttribute('height', String(height));
      map.setAttribute('href', canvas.toDataURL());
    };

    const update = (token: number) => {
      const width = dock.offsetWidth;
      const height = dock.offsetHeight;
      if (!width || !height || token !== generation) return;
      const size = `${width}x${height}`;
      const radius = Math.min(
        parseFloat(getComputedStyle(dock).borderRadius) || 0,
        dock.offsetWidth / 2,
        dock.offsetHeight / 2,
      );
      if (size === builtSize) {
        showLens(radius, token);
        return;
      }
      builtSize = size;
      paintMap(width, height, radius);
      // The new map is blank for a frame. Show it once that frame has passed,
      // or the channel split reads as a turquoise flash.
      requestAnimationFrame(() => {
        showLens(radius, token);
      });
    };

    const scheduleUpdate = () => {
      const size = `${Math.round(dock.offsetWidth)}x${Math.round(dock.offsetHeight)}`;
      if (size === '0x0' || size === pendingSize) return;
      pendingSize = size;
      const handoff = Boolean(builtSize);
      if (handoff) beginCover();
      const token = ++generation;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => update(token), handoff ? 70 : 0);
    };

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(dock);
    scheduleUpdate();
    return () => {
      observer.disconnect();
      window.clearTimeout(settleTimer);
      generation += 1;
      dock.style.removeProperty('backdrop-filter');
      dock.style.removeProperty('-webkit-backdrop-filter');
      backdrop.style.removeProperty('opacity');
      delete dock.dataset.dockNative;
      delete dock.dataset.dockMoving;
    };
  }, []);

  return (
    <>
      <svg width="0" height="0" className="dockGlassDefs" aria-hidden="true">
        <defs>
          <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blurred" />
            <feImage ref={mapRef} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="encoded-map" />
            <feComponentTransfer in="encoded-map" result="map">
              <feFuncR type="linear" slope="1" intercept={-1 / 510} />
              <feFuncG type="linear" slope="1" intercept={-1 / 510} />
            </feComponentTransfer>
            {[
              ['red', '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0'],
              ['green', '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0'],
              ['blue', '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0'],
            ].map(([channel, matrix], index) => (
              <Fragment key={channel}>
                <feDisplacementMap
                  ref={(element) => {
                    displacementRefs.current[index] = element;
                  }}
                  in="blurred"
                  in2="map"
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result={`${channel}-shift`}
                />
                <feColorMatrix in={`${channel}-shift`} type="matrix" values={matrix} result={channel} />
              </Fragment>
            ))}
            <feBlend in="red" in2="green" mode="screen" result="red-green" />
            <feBlend in="red-green" in2="blue" mode="screen" />
          </filter>
        </defs>
      </svg>
      <span
        ref={ref}
        className="dockGlassBackdrop"
        style={{
          backdropFilter: `url("#${id}") saturate(1.6)`,
          WebkitBackdropFilter: `url("#${id}") saturate(1.6)`,
        }}
        aria-hidden="true"
      />
      <span className="dockGlassTint" aria-hidden="true" />
    </>
  );
}
