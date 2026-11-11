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

/**
 * Chromium refracts the backdrop through an SVG displacement map. Other
 * engines keep the CSS blur, sheen, and edge light.
 */
export function NavGlass() {
  const id = useId().replace(/:/g, '');
  const ref = useRef<HTMLSpanElement>(null);
  const mapRef = useRef<SVGFEImageElement>(null);
  const displacementRefs = useRef<(SVGFEDisplacementMapElement | null)[]>([]);

  useEffect(() => {
    const backdrop = ref.current;
    const nav = backdrop?.parentElement;
    if (!backdrop || !nav || !/Chrome|Chromium|Edg\//.test(navigator.userAgent)) return;
    // The backdrop is display:none until this is set, so the map can be measured.
    nav.dataset.navNative = 'true';
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
      nav.style.setProperty('backdrop-filter', 'none');
      nav.style.setProperty('-webkit-backdrop-filter', 'none');
      nav.dataset.navNative = 'false';
      nav.dataset.navMoving = 'true';
    };

    const beginCover = () => {
      const closing = nav.closest('.mx-nav')?.getAttribute('data-closing') === 'true';
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
      nav.style.removeProperty('backdrop-filter');
      nav.style.removeProperty('-webkit-backdrop-filter');
      backdrop.style.removeProperty('opacity');
      nav.dataset.navNative = 'true';
      delete nav.dataset.navMoving;
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
            nav.offsetWidth,
            nav.offsetHeight,
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
      // The backdrop stays hidden while frost is covering the resize.
      const width = nav.offsetWidth;
      const height = nav.offsetHeight;
      if (!width || !height || token !== generation) return;
      const size = `${width}x${height}`;
      const radius = Math.min(
        parseFloat(getComputedStyle(nav).borderRadius) || 0,
        nav.offsetWidth / 2,
        nav.offsetHeight / 2,
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
      const size = `${Math.round(nav.offsetWidth)}x${Math.round(nav.offsetHeight)}`;
      if (size === '0x0' || size === pendingSize) return;
      pendingSize = size;
      const handoff = Boolean(builtSize);
      if (handoff) beginCover();
      const token = ++generation;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => update(token), handoff ? 70 : 0);
    };

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(nav);
    scheduleUpdate();
    return () => {
      observer.disconnect();
      window.clearTimeout(settleTimer);
      generation += 1;
      nav.style.removeProperty('backdrop-filter');
      nav.style.removeProperty('-webkit-backdrop-filter');
      backdrop.style.removeProperty('opacity');
      delete nav.dataset.navNative;
      delete nav.dataset.navMoving;
    };
  }, []);

  return (
    <>
      <svg width="0" height="0" className="navGlassDefs" aria-hidden="true">
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
        className="navGlassBackdrop"
        style={{
          backdropFilter: `url("#${id}") saturate(1.6)`,
          WebkitBackdropFilter: `url("#${id}") saturate(1.6)`,
        }}
        aria-hidden="true"
      />
      <span className="navGlassTint" aria-hidden="true" />
    </>
  );
}
