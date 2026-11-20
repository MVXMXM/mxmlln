'use client';

import { Fragment, useEffect, useId, useRef } from 'react';
import { bindFolioVisualViewport } from '@/app/(folio)/folio-viewport';
import { openGif, type GifReel } from './gif-frames';

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

let blurScratch = new Uint8ClampedArray(0);
let blurSigma = -1;
let blurBoxes: number[] = [];

function blurPhoto(source: HTMLCanvasElement, sigma: number) {
  const context = source.getContext('2d', { willReadFrequently: true });
  if (!context || sigma <= 0) return;
  const { width, height } = source;
  const image = context.getImageData(0, 0, width, height);
  const pixels = image.data;
  if (blurScratch.length !== pixels.length) blurScratch = new Uint8ClampedArray(pixels.length);
  if (blurSigma !== sigma) {
    blurSigma = sigma;
    blurBoxes = gaussBoxes(sigma);
  }
  for (const diameter of blurBoxes) {
    const radius = (diameter - 1) >> 1;
    blurAxis(pixels, blurScratch, width, height, radius, true);
    blurAxis(blurScratch, pixels, width, height, radius, false);
  }
  context.putImageData(image, 0, 0);
}

type CapturedRenderer = Omit<NonNullable<Window['__liquidGLRenderer__']>, 'captureSnapshot'> & {
  scaleFactor?: number;
  captureSnapshot?: () => void;
  _uploadTexture?: (source: HTMLCanvasElement) => void;
  _renderLens?: (lens: unknown) => void;
  render?: () => void;
  addLens?: (element: HTMLElement, options: Record<string, unknown>) => { el: HTMLElement; options: { bevelWidth?: number } };
};

type FolioLens = {
  el: HTMLElement;
  updateMetrics?: () => void;
  _handleOverscrollCompensation?: () => void;
};

function asFolioLens(lens: unknown): FolioLens | null {
  if (!lens || typeof lens !== 'object') return null;
  if (!('el' in lens) || !((lens as FolioLens).el instanceof HTMLElement)) return null;
  return lens as FolioLens;
}

function isFolioGlassLens(lens: unknown) {
  const item = asFolioLens(lens);
  if (!item) return false;
  if (pageGlassHosts.has(item.el)) return true;
  return Boolean(item.el.closest('.folio-page .mx-dock'));
}

const PAGE_PAD = 48;

const PAGE_GLASS_OPTS = {
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
} as const;

const pageGlassHosts = new Set<HTMLElement>();
let pageGlassRefresh: (() => void) | null = null;
// Glassworks raises the shared canvas to max(lens z) − 1. The carousel chrome
// sits at 901, so addLens would park the canvas on top of the dock (900).
let pageGlassLift: (() => void) | null = null;

function fitHostRim(el: HTMLElement) {
  const lens = window.__liquidGLRenderer__?.lenses.find((item) => item.el === el);
  if (!lens) return;
  const short = Math.min(el.offsetWidth, el.offsetHeight);
  const specified = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
  const radius = Math.min(specified, el.offsetWidth / 2, el.offsetHeight / 2);
  if (short > 0 && radius > 0) lens.options.bevelWidth = radius / (2 * short);
  el.style.removeProperty('transition');
}

function restoreGlassHost(el: HTMLElement) {
  el.style.opacity = '';
  el.style.pointerEvents = '';
  el.style.background = '';
  el.style.backgroundColor = '';
  el.style.backdropFilter = '';
  el.style.removeProperty('-webkit-backdrop-filter');
  el.style.removeProperty('transition');
  delete el.dataset.dockCapture;
  delete el.dataset.dockGlass;
}

function unionPlateRect(primary: DOMRect) {
  let left = primary.left;
  let top = primary.top;
  let right = primary.right;
  let bottom = primary.bottom;
  for (const host of pageGlassHosts) {
    if (!host.isConnected) continue;
    const rect = host.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }
  return new DOMRect(
    left - PAGE_PAD,
    top - PAGE_PAD,
    right - left + PAGE_PAD * 2,
    bottom - top + PAGE_PAD * 2,
  );
}

function attachSvgLiquidGlass(el: HTMLElement) {
  const id = `dock-glass-${Math.random().toString(36).slice(2, 10)}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.classList.add('dockGlassDefs');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<defs><filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blurred"/>
    <feImage x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="encoded-map"/>
    <feComponentTransfer in="encoded-map" result="map">
      <feFuncR type="linear" slope="1" intercept="${-1 / 510}"/>
      <feFuncG type="linear" slope="1" intercept="${-1 / 510}"/>
    </feComponentTransfer>
    <feDisplacementMap in="blurred" in2="map" xChannelSelector="R" yChannelSelector="G" result="red-shift"/>
    <feColorMatrix in="red-shift" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="red"/>
    <feDisplacementMap in="blurred" in2="map" xChannelSelector="R" yChannelSelector="G" result="green-shift"/>
    <feColorMatrix in="green-shift" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="green"/>
    <feDisplacementMap in="blurred" in2="map" xChannelSelector="R" yChannelSelector="G" result="blue-shift"/>
    <feColorMatrix in="blue-shift" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="blue"/>
    <feBlend in="red" in2="green" mode="screen" result="red-green"/>
    <feBlend in="red-green" in2="blue" mode="screen"/>
  </filter></defs>`;
  const mapRef = { current: svg.querySelector('feImage') as unknown as SVGFEImageElement | null };
  const displacementRefs = {
    current: [...svg.querySelectorAll('feDisplacementMap')] as (SVGFEDisplacementMapElement | null)[],
  };
  const backdrop = document.createElement('span');
  backdrop.className = 'dockGlassBackdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.style.backdropFilter = `url("#${id}") saturate(1.6)`;
  (backdrop.style as CSSStyleDeclaration & { webkitBackdropFilter: string }).webkitBackdropFilter =
    `url("#${id}") saturate(1.6)`;
  const tint = document.createElement('span');
  tint.className = 'dockGlassTint';
  tint.setAttribute('aria-hidden', 'true');
  el.dataset.dockCapture = 'true';
  el.prepend(tint);
  el.prepend(backdrop);
  el.prepend(svg);
  const disposeLens = mountSvgLens(el, backdrop, mapRef, displacementRefs);
  return () => {
    disposeLens();
    svg.remove();
    backdrop.remove();
    tint.remove();
    restoreGlassHost(el);
  };
}

function attachPhotoLiquidGlass(el: HTMLElement) {
  el.dataset.dockCapture = 'true';
  pageGlassHosts.add(el);
  let cancelled = false;

  const add = () => {
    const renderer = window.__liquidGLRenderer__ as CapturedRenderer | undefined;
    if (!renderer?.addLens || cancelled) return false;
    if (renderer.lenses.some((lens) => lens.el === el)) {
      fitHostRim(el);
      el.dataset.dockGlass = 'live';
      pageGlassRefresh?.();
      return true;
    }
    renderer.addLens(el, { ...PAGE_GLASS_OPTS, on: {} });
    fitHostRim(el);
    el.dataset.dockGlass = 'live';
    el.style.backdropFilter = '';
    (el.style as CSSStyleDeclaration & { webkitBackdropFilter: string }).webkitBackdropFilter = '';
    pageGlassLift?.();
    pageGlassRefresh?.();
    return true;
  };

  const boot = async () => {
    if (add()) return;
    const start = performance.now();
    while (!cancelled && performance.now() - start < 12000) {
      await new Promise((resolve) => window.setTimeout(resolve, 80));
      if (add()) return;
    }
  };
  void boot();

  return () => {
    cancelled = true;
    pageGlassHosts.delete(el);
    const renderer = window.__liquidGLRenderer__;
    if (renderer) renderer.lenses = renderer.lenses.filter((lens) => lens.el !== el);
    restoreGlassHost(el);
    pageGlassRefresh?.();
  };
}

export function attachLiquidGlass(el: HTMLElement) {
  if (usesSvgBackdropLens(navigator.userAgent)) return attachSvgLiquidGlass(el);
  return attachPhotoLiquidGlass(el);
}
const PAGE_SCALE = 0.5;

const GRADE_STOPS = [
  [0xa3, 0xdb, 0xee],
  [0xb8, 0xc2, 0xeb],
  [0xe3, 0xbf, 0xd2],
  [0xe5, 0xe5, 0xfe],
];

function axisLength(part: string, area: number) {
  if (part.endsWith('%')) return (area * Number.parseFloat(part)) / 100;
  if (part.endsWith('px')) return Number.parseFloat(part);
  return area;
}

function axisOffset(part: string, area: number, image: number) {
  if (part.endsWith('%')) return (area - image) * (Number.parseFloat(part) / 100);
  if (part.endsWith('px')) return Number.parseFloat(part);
  if (part === 'center') return (area - image) / 2;
  if (part === 'left' || part === 'top') return 0;
  if (part === 'right' || part === 'bottom') return area - image;
  return 0;
}

function linearToSrgb(channel: number) {
  const clamped = Math.min(1, Math.max(0, channel));
  const encoded = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return Math.round(encoded * 255);
}

function srgbToLinear(channel: number) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function toOklab(rgb: number[]) {
  const r = srgbToLinear(rgb[0]);
  const g = srgbToLinear(rgb[1]);
  const b = srgbToLinear(rgb[2]);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab(lab: number[]) {
  const l = lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2];
  const m = lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2];
  const s = lab[0] - 0.0894841775 * lab[1] - 1.291485548 * lab[2];
  const linear = [
    4.0767416621 * l ** 3 - 3.3077115913 * m ** 3 + 0.2309699292 * s ** 3,
    -1.2684380046 * l ** 3 + 2.6097574011 * m ** 3 - 0.3413193965 * s ** 3,
    -0.0041960863 * l ** 3 - 0.7034186147 * m ** 3 + 1.707614701 * s ** 3,
  ];
  return linear.map(linearToSrgb);
}

const GRADE_LABS = GRADE_STOPS.map((rgb) => toOklab(rgb));

function gradeMix(amount: number) {
  const stops = [0, 1 / 3, 2 / 3, 1];
  const t = Math.min(1, Math.max(0, amount));
  let index = 0;
  while (index < stops.length - 2 && t > stops[index + 1]) index += 1;
  const span = stops[index + 1] - stops[index];
  const local = span ? (t - stops[index]) / span : 0;
  const start = GRADE_LABS[index];
  const end = GRADE_LABS[index + 1];
  return fromOklab(start.map((channel, channelIndex) => channel + (end[channelIndex] - channel) * local));
}

function gradeTone(channel: number) {
  const contrasted = (channel / 255 - 0.5) * 1.1 + 0.5;
  return Math.round(Math.min(255, Math.max(0, contrasted * 1.1 * 255)));
}

function samplePageColor(region: DOMRect) {
  const grade = document.querySelector<HTMLElement>('.gradeBG');
  const width = window.innerWidth;
  const height = window.innerHeight;
  const x = region.left + region.width / 2;
  const y = region.top + region.height / 2;
  if (!grade) return 'rgb(184 194 235)';
  const style = getComputedStyle(grade);
  const size = style.backgroundSize.split(/\s+/);
  const position = style.backgroundPosition.split(/\s+/);
  const imageW = axisLength(size[0] || '100%', width);
  const imageH = axisLength(size[1] || size[0] || '100%', height);
  const offsetX = axisOffset(position[0] || '0%', width, imageW);
  const offsetY = axisOffset(position[1] || '50%', height, imageH);
  const rad = (10 * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const half = Math.abs((imageW / 2) * dx) + Math.abs((imageH / 2) * dy);
  const along = (x - offsetX - imageW / 2) * dx + (y - offsetY - imageH / 2) * dy;
  const [red, green, blue] = gradeMix(half ? along / (2 * half) + 0.5 : 0).map(gradeTone);
  const rx = 525 / 2;
  const ry = 525 / 2;
  const outsideX = Math.abs(x - width / 2) - rx;
  const outsideY = Math.abs(y - height / 2) - ry;
  const distance = Math.hypot(Math.max(outsideX, 0), Math.max(outsideY, 0)) + Math.min(Math.max(outsideX, outsideY), 0);
  const bloom = 0.75 * Math.exp(-(Math.max(distance, 0) ** 2) / (2 * 75 * 75));
  const mix = (channel: number) => Math.round(channel * (1 - bloom) + 255 * bloom);
  return `rgb(${mix(red)} ${mix(green)} ${mix(blue)})`;
}

function overlaps(rect: DOMRect, region: DOMRect) {
  return (
    rect.width > 1 &&
    rect.height > 1 &&
    rect.bottom > region.top &&
    rect.top < region.bottom &&
    rect.right > region.left &&
    rect.left < region.right
  );
}

const cardImages = new Map<string, HTMLImageElement>();
const gifClips = new Map<string, { reel: GifReel; canvas: HTMLCanvasElement; epoch: number }>();
const gifLoads = new Map<string, Promise<void>>();

function cardSrc(card: HTMLElement) {
  const match = /url\((['"]?)(.*?)\1\)/.exec(card.style.backgroundImage);
  return match?.[2] || null;
}

function cardPhoto(card: HTMLElement) {
  const src = cardSrc(card);
  if (!src) return null;
  let image = cardImages.get(src);
  if (!image) {
    image = new Image();
    image.src = src;
    cardImages.set(src, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : null;
}

// Orbit rotation lives on .folio-orbit-slot; the card is transform:none.
function cardVisualMatrix(card: HTMLElement) {
  let matrix = new DOMMatrix();
  let node: HTMLElement | null = card;
  while (node && node !== document.documentElement) {
    const transform = getComputedStyle(node).transform;
    if (transform && transform !== 'none') {
      matrix = new DOMMatrix(transform).multiply(matrix);
    }
    node = node.parentElement;
  }
  return matrix;
}

function paintCard(context: CanvasRenderingContext2D, card: HTMLElement, rect: DOMRect, region: DOMRect) {
  const style = getComputedStyle(card);
  if (style.visibility === 'hidden' || style.display === 'none') return;
  const matrix = cardVisualMatrix(card);
  const visual = Math.hypot(matrix.a, matrix.b) || 1;
  const rotation = Math.atan2(matrix.b, matrix.a);
  const width = card.offsetWidth * visual * PAGE_SCALE;
  const height = card.offsetHeight * visual * PAGE_SCALE;
  if (width < 1 || height < 1) return;
  const radius = (Number.parseFloat(style.borderTopLeftRadius) || 0) * visual * PAGE_SCALE;
  const border = (Number.parseFloat(style.borderTopWidth) || 0) * visual * PAGE_SCALE;
  context.save();
  context.translate(
    (rect.left + rect.width / 2 - region.left) * PAGE_SCALE,
    (rect.top + rect.height / 2 - region.top) * PAGE_SCALE,
  );
  if (rotation) context.rotate(rotation);
  context.beginPath();
  context.roundRect(-width / 2, -height / 2, width, height, radius);
  context.fillStyle = style.borderTopColor;
  context.fill();
  const innerW = width - border * 2;
  const innerH = height - border * 2;
  if (innerW > 1 && innerH > 1) {
    context.beginPath();
    context.roundRect(-innerW / 2, -innerH / 2, innerW, innerH, Math.max(0, radius - border));
    context.fillStyle = style.backgroundColor;
    context.fill();
    const video = card.querySelector('video');
    const clip = cardSrc(card);
    const source = video && video.readyState >= 2 ? video : (clip && gifClips.get(clip)?.canvas) || cardPhoto(card);
    if (source) {
      const sourceW = source instanceof HTMLVideoElement ? source.videoWidth : source instanceof HTMLCanvasElement ? source.width : source.naturalWidth;
      const sourceH = source instanceof HTMLVideoElement ? source.videoHeight : source instanceof HTMLCanvasElement ? source.height : source.naturalHeight;
      if (sourceW > 0 && sourceH > 0) {
        context.save();
        context.clip();
        const cover = Math.max(innerW / sourceW, innerH / sourceH);
        context.drawImage(source, (-sourceW * cover) / 2, (-sourceH * cover) / 2, sourceW * cover, sourceH * cover);
        context.restore();
      }
    }
  }
  context.restore();
}

function paintCards(context: CanvasRenderingContext2D, region: DOMRect) {
  const cards = document.getElementsByClassName('Card');
  const hits: { card: HTMLElement; rect: DOMRect }[] = [];
  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    if (!(card instanceof HTMLElement) || card.closest('.mx-dock')) continue;
    const rect = card.getBoundingClientRect();
    if (!overlaps(rect, region)) continue;
    hits.push({ card, rect });
  }
  hits.sort(
    (a, b) => (Number.parseInt(a.card.style.zIndex, 10) || 0) - (Number.parseInt(b.card.style.zIndex, 10) || 0),
  );
  for (const { card, rect } of hits) paintCard(context, card, rect, region);
}

function mountPageGlass(dock: HTMLElement) {
  let cancelled = false;
  let started = false;
  let revealed = false;
  let resizeTimer = 0;
  let scrollTimer = 0;
  let motionFrame = 0;
  let mediaFrame = 0;
  let orbitFrame = 0;
  let scrollingClips: { reel: GifReel; canvas: HTMLCanvasElement; epoch: number }[] | null = null;
  let presented = false;
  let refreshedAt = 0;
  let plateKey = '';
  let settleTimer = 0;
  let sharp: HTMLCanvasElement | null = null;
  let prior: HTMLCanvasElement | null = null;
  let lastScroll = Number.NaN;
  let home: DOMRect | null = null;
  let scrollShape = false;
  let lastSize = '';
  let masonryObserver: MutationObserver | null = null;
  let capture: () => void = () => {};
  let undoRenderLens: (() => void) | null = null;
  let undoOverscroll: (() => void) | null = null;
  let poseFrame = 0;
  let canvasGeom = '';
  // Glassworks snapshots this node’s scroll height and parks its canvas at z-index 0.
  // Empty plate = first snapshot off the page; lift under the dock (gradient is z-index 1).
  const plate = document.createElement('div');
  plate.setAttribute('data-dock-snapshot', '');
  plate.setAttribute('data-liquid-ignore', '');
  plate.setAttribute('aria-hidden', 'true');
  plate.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;visibility:hidden';
  document.body.appendChild(plate);
  dock.closest('.mx-dock')?.setAttribute('data-liquid-ignore', '');
  dock.dataset.dockCapture = 'true';

  const syncPlate = () => {
    const region = unionPlateRect(home ?? dock.getBoundingClientRect());
    const key = `${region.left}|${region.top}|${region.width}|${region.height}`;
    if (key !== plateKey) {
      plateKey = key;
      plate.style.left = `${region.left}px`;
      plate.style.top = `${region.top}px`;
      plate.style.width = `${region.width}px`;
      plate.style.height = `${region.height}px`;
    }
    return region;
  };

  const liftCanvas = () => {
    const canvas = window.__liquidGLRenderer__?.canvas;
    if (!canvas) return;
    if (!canvas.isConnected) document.body.appendChild(canvas);
    const cluster = dock.closest('.dockCluster');
    const z = cluster ? Number.parseInt(getComputedStyle(cluster).zIndex, 10) : 900;
        // Keep under the dock even after extra lenses (carousel) tempt a higher z.
    canvas.style.zIndex = String(Number.isFinite(z) && z > 1 ? z - 1 : 899);
        // Match the visible frame — layout innerHeight lags URL-bar / keyboard churn.
    const vv = window.visualViewport;
    if (vv) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(vv.width * dpr));
      const height = Math.max(1, Math.round(vv.height * dpr));
      const geom = `${vv.offsetLeft}|${vv.offsetTop}|${vv.width}|${vv.height}|${width}x${height}`;
      if (geom !== canvasGeom) {
        canvasGeom = geom;
        canvas.style.top = `${vv.offsetTop}px`;
        canvas.style.left = `${vv.offsetLeft}px`;
        canvas.style.width = `${vv.width}px`;
        canvas.style.height = `${vv.height}px`;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
      }
    }
  };
  pageGlassLift = liftCanvas;

    /** Our CSS already pins the dock to vv — liquidGL must not add offsetTop again. */
  const bindFolioLensPose = (renderer: CapturedRenderer) => {
    if (!renderer._renderLens || undoRenderLens) return;
    const original = renderer._renderLens.bind(renderer);
    renderer._renderLens = (lens) => {
      if (!isFolioGlassLens(lens) || !window.visualViewport) {
        original(lens);
        return;
      }
      const vv = window.visualViewport;
      Object.defineProperty(vv, 'offsetTop', { configurable: true, get: () => 0 });
      Object.defineProperty(vv, 'offsetLeft', { configurable: true, get: () => 0 });
      try {
        original(lens);
      } finally {
        Reflect.deleteProperty(vv, 'offsetTop');
        Reflect.deleteProperty(vv, 'offsetLeft');
      }
    };
    undoRenderLens = () => {
      renderer._renderLens = original;
      undoRenderLens = null;
    };

    const lens = asFolioLens(renderer.lenses.find((item) => item.el === dock));
    if (lens?._handleOverscrollCompensation && !undoOverscroll) {
      const prior = lens._handleOverscrollCompensation.bind(lens);
      lens._handleOverscrollCompensation = () => {};
      undoOverscroll = () => {
        lens._handleOverscrollCompensation = prior;
        undoOverscroll = null;
      };
    }
  };

  const syncLensPose = () => {
    if (cancelled || !started) return;
        // Minify animates width/height on the main thread — skip GL work so it doesn’t hitch mid-pill.
    if (scrollShape || dock.dataset.dockScrolling) return;
    liftCanvas();
    const renderer = window.__liquidGLRenderer__ as CapturedRenderer | undefined;
    if (!renderer) return;
    for (const lens of renderer.lenses) {
      if (!isFolioGlassLens(lens)) continue;
      asFolioLens(lens)?.updateMetrics?.();
    }
    renderer.render?.();
  };

  const scheduleLensPose = () => {
    if (poseFrame) return;
    poseFrame = requestAnimationFrame(() => {
      poseFrame = 0;
      syncLensPose();
    });
  };

  const fitRim = () => {
    const lens = window.__liquidGLRenderer__?.lenses.find((item) => item.el === dock);
    if (!lens) return;
    const short = Math.min(dock.offsetWidth, dock.offsetHeight);
    const specified = parseFloat(getComputedStyle(dock).borderTopLeftRadius) || 0;
    const radius = Math.min(specified, dock.offsetWidth / 2, dock.offsetHeight / 2);
    if (short > 0 && radius > 0) lens.options.bevelWidth = radius / (2 * short);
    dock.style.removeProperty('transition');
  };

  const restorePill = () => {
    dock.style.opacity = '';
    dock.style.pointerEvents = '';
    dock.style.background = '';
    dock.style.backgroundColor = '';
    dock.style.backdropFilter = '';
    dock.style.removeProperty('-webkit-backdrop-filter');
    dock.style.removeProperty('transition');
  };

  const upload = (photo: HTMLCanvasElement, region: DOMRect) => {
    const renderer = window.__liquidGLRenderer__ as CapturedRenderer | undefined;
    if (!renderer?._uploadTexture || cancelled || region.height < 1) return;
    renderer.snapshotTarget = plate;
    renderer.scaleFactor = photo.height / region.height;
    renderer._uploadTexture(photo);
    if (!presented) {
      presented = true;
      liftCanvas();
      fitRim();
      revealed = true;
      dock.dataset.dockGlass = 'live';
      // Lens writes backdrop-filter: none; live rule is saturate only — clear inline.
      dock.style.backdropFilter = '';
      (dock.style as CSSStyleDeclaration & { webkitBackdropFilter: string }).webkitBackdropFilter = '';
    }
    refreshedAt = performance.now();
    liftCanvas();
    if (renderer.canvas && !dock.dataset.dockMoving && !dock.dataset.dockScrolling && !dock.dataset.dockPaging) {
      renderer.canvas.style.opacity = '1';
    }
  };

  const sized = (canvas: HTMLCanvasElement | null, width: number, height: number) => {
    if (canvas && canvas.width === width && canvas.height === height) return canvas;
    const next = document.createElement('canvas');
    next.width = width;
    next.height = height;
    next.getContext('2d', { willReadFrequently: true });
    return next;
  };

  const paintStrip = (region: DOMRect) => {
    const width = Math.max(1, Math.round(region.width * PAGE_SCALE));
    const height = Math.max(1, Math.round(region.height * PAGE_SCALE));
    sharp = sized(sharp, width, height);
    const context = sharp.getContext('2d');
    if (!context) return sharp;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = samplePageColor(region);
    context.fillRect(0, 0, width, height);
    paintCards(context, region);
    const marker = document.querySelector('.ContentContainer');
    const origin = marker ? marker.getBoundingClientRect().top : window.scrollY;
    const dy = Number.isNaN(lastScroll) ? 0 : (lastScroll - origin) * PAGE_SCALE;
    lastScroll = origin;
    if (prior && prior.width === width && prior.height === height && Math.abs(dy) >= 1) {
      
      context.save();
      const steps = 3;
      for (let step = 1; step <= steps; step += 1) {
        context.globalAlpha = 0.34 * ((steps - step + 1) / steps);
        context.drawImage(prior, 0, -dy * (1 - step / (steps + 1)));
      }
      context.restore();
    }
    blurPhoto(sharp, 4 * PAGE_SCALE);
    prior = sized(prior, width, height);
    prior.getContext('2d')?.drawImage(sharp, 0, 0);
    return sharp;
  };

  
  
  const videoUnder = (region: DOMRect) => {
    for (const video of document.querySelectorAll<HTMLVideoElement>('.Card video')) {
      if (video.paused || video.ended || video.readyState < 2) continue;
      const card = video.closest('.Card');
      if (!(card instanceof HTMLElement) || card.closest('.mx-dock')) continue;
      if (overlaps(card.getBoundingClientRect(), region)) return true;
    }
    return false;
  };

  const paintClip = (clip: { reel: GifReel; canvas: HTMLCanvasElement }) => {
    const context = clip.canvas.getContext('2d');
    if (!context) return;
    const pixels = clip.reel.pixels as Uint8ClampedArray<ArrayBuffer>;
    context.putImageData(new ImageData(pixels, clip.reel.width, clip.reel.height), 0, 0);
  };

  const gifEpoch = (src: string) => {
    const url = new URL(src, location.href).href;
    let start = Number.POSITIVE_INFINITY;
    for (const entry of performance.getEntriesByName(url)) {
      if (entry instanceof PerformanceResourceTiming && entry.responseEnd > 0) {
        start = Math.min(start, entry.responseEnd);
      }
    }
    return Number.isFinite(start) ? start : performance.now();
  };

  const ensureGif = (src: string) => {
    if (gifClips.has(src) || gifLoads.has(src)) return;
    const load = (async () => {
      try {
        const bytes = new Uint8Array(await (await fetch(src)).arrayBuffer());
        if (cancelled) return;
        const reel = openGif(bytes);
        if (!reel) return;
        const canvas = document.createElement('canvas');
        canvas.width = reel.width;
        canvas.height = reel.height;
        const clip = { reel, canvas, epoch: gifEpoch(src) };
        clip.reel.sync(performance.now() - clip.epoch);
        paintClip(clip);
        gifClips.set(src, clip);
        if (started) refresh();
      } catch (error) {
        console.warn('Dock gif decode failed', error);
      }
    })();
    gifLoads.set(src, load);
  };

  const gifsUnder = (region: DOMRect) => {
    const playing: { reel: GifReel; canvas: HTMLCanvasElement; epoch: number }[] = [];
    const seen = new Set<string>();
    const cards = document.getElementsByClassName('Card');
    for (let index = 0; index < cards.length; index += 1) {
      const card = cards[index];
      if (!(card instanceof HTMLElement) || card.closest('.mx-dock')) continue;
      const src = cardSrc(card);
      if (!src || seen.has(src) || !/\.gif(?:$|[?#])/i.test(src)) continue;
      if (!overlaps(card.getBoundingClientRect(), region)) continue;
      seen.add(src);
      const clip = gifClips.get(src);
      if (clip) playing.push(clip);
      else ensureGif(src);
    }
    return playing;
  };

  const seekGifs = (clips: { reel: GifReel; canvas: HTMLCanvasElement; epoch: number }[]) => {
    const now = performance.now();
    for (const clip of clips) {
      const before = clip.reel.index;
      clip.reel.sync(now - clip.epoch);
      if (clip.reel.index !== before) paintClip(clip);
    }
  };

  const followMedia = (region: DOMRect) => {
    if (mediaFrame || cancelled || dock.dataset.dockMoving) return;
    const scrolling = Boolean(dock.dataset.dockScrolling);
    if (!scrolling && !gifsUnder(region).length && !videoUnder(region)) return;
    mediaFrame = requestAnimationFrame(() => {
      mediaFrame = 0;
      if (cancelled || !started || dock.dataset.dockMoving) return;
      if (dock.dataset.dockScrolling) {
        
        if (!scrollingClips) scrollingClips = gifsUnder(syncPlate());
        if (!scrollingClips.length) return;
        seekGifs(scrollingClips);
        followMedia(region);
        return;
      }
      scrollingClips = null;
      const next = syncPlate();
      const due = gifsUnder(next);
      if (!due.length && !videoUnder(next)) return;
      seekGifs(due);
      if (performance.now() - refreshedAt > 12) refresh();
      else followMedia(next);
    });
  };

  // Orbit transforms are rAF, not CSS — keep photographing or the pill freezes.
  const orbitLive = () =>
    Boolean(dock.closest('.folio-page')?.querySelector('.folio-masonry.is-orbit'));
  const followOrbit = () => {
    if (orbitFrame || cancelled || dock.dataset.dockMoving || !orbitLive()) return;
    orbitFrame = requestAnimationFrame(() => {
      orbitFrame = 0;
      if (cancelled || !started || dock.dataset.dockMoving || !orbitLive()) return;
      if (performance.now() - refreshedAt > 12) refresh();
      else followOrbit();
    });
  };

  const refresh = (force = false) => {
    const renderer = window.__liquidGLRenderer__ as CapturedRenderer | undefined;
    if (!renderer?._uploadTexture || cancelled || dock.dataset.dockPaging || (!force && dock.dataset.dockScrolling)) return;
    const region = syncPlate();
    if (region.width < 1 || region.height < 1) return;
    try {
      seekGifs(gifsUnder(region));
      upload(paintStrip(region), region);
      followMedia(region);
      followOrbit();
    } catch (error) {
      console.warn('Dock glass recapture failed', error);
      if (!revealed) restorePill();
    }
  };

  capture = () => refresh();
  pageGlassRefresh = () => {
    if (started) refresh(true);
  };

  const schedule = (delay: number) => {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      if (started) refresh();
    }, delay);
  };

  let touchDepth = 0;

  const releaseScroll = (force = false) => {
    scrollTimer = 0;
    if (!dock.dataset.dockScrolling) return;
    // Finger still down — expanding mid-gesture re-minifies on the next move.
    if (!force && touchDepth > 0) return;
    scrollingClips = null;
    if (mediaFrame) {
      cancelAnimationFrame(mediaFrame);
      mediaFrame = 0;
    }
    lastScroll = Number.NaN;
    if (started) refresh(true);
    const canvas = window.__liquidGLRenderer__?.canvas;
    if (canvas) canvas.style.transition = 'opacity 0.56s cubic-bezier(0.22, 1, 0.36, 1)';
    dock.dataset.dockExpanding = 'true';
    delete dock.dataset.dockScrolling;
    if (canvas && !dock.dataset.dockMoving && !dock.dataset.dockPaging) canvas.style.opacity = '1';
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      delete dock.dataset.dockExpanding;
      scrollShape = false;
      home = null;
      scrollTimer = 0;
      if (started) refresh();
      scheduleLensPose();
    }, 600);
  };

  const scheduleScrollRelease = () => {
    window.clearTimeout(scrollTimer);
    if (touchDepth > 0) return;
    scrollTimer = window.setTimeout(releaseScroll, 400);
  };

  const armScrollMinify = () => {
    // Chat composer stays full-width — minify is for the idle dock only.
    if (dock.closest('.mx-dock')?.hasAttribute('data-composer')) {
      if (dock.dataset.dockScrolling) releaseScroll(true);
      return;
    }
    if (!dock.dataset.dockScrolling) {
      if (!home) home = dock.getBoundingClientRect();
      scrollShape = true;
      delete dock.dataset.dockExpanding;
      dock.dataset.dockScrolling = 'true';
      if (started) {
        const canvas = window.__liquidGLRenderer__?.canvas;
        if (canvas) {
          canvas.style.transition = 'opacity 0.32s cubic-bezier(0.22, 1, 0.36, 1)';
          canvas.style.opacity = '0';
        }
        if (!mediaFrame) followMedia(syncPlate());
      }
    }
    scheduleScrollRelease();
  };

  const scrollFromDock = (target: EventTarget | null) => {
    const root = dock.closest('.mx-dock');
    return Boolean(target instanceof Node && root?.contains(target));
  };

  const onScroll = (event: Event) => {
    if (scrollFromDock(event.target)) return;
    armScrollMinify();
  };

  const onTouchStart = (event: TouchEvent) => {
    if (scrollFromDock(event.target)) return;
    touchDepth += 1;
    armScrollMinify();
  };

  const onTouchEnd = () => {
    touchDepth = Math.max(0, touchDepth - 1);
    if (touchDepth === 0 && dock.dataset.dockScrolling) scheduleScrollRelease();
  };

  const sceneTransition = (target: EventTarget | null) =>
    target instanceof Element && !target.closest('.mx-dock') && Boolean(target.closest('.folio-page'));
  const sceneMoving = () =>
    document.getAnimations().some((animation) => {
      if (!(animation instanceof CSSTransition) || animation.playState !== 'running') return false;
      const source = animation.effect && 'target' in animation.effect ? animation.effect.target : null;
      return source instanceof Element && sceneTransition(source);
    });
  const pumpMotion = () => {
    motionFrame = 0;
    if (!started || cancelled) return;
    refresh();
    if (sceneMoving()) motionFrame = requestAnimationFrame(pumpMotion);
  };
  const onTransitionRun = (event: Event) => {
    if (!sceneTransition(event.target) || !started || motionFrame) return;
    motionFrame = requestAnimationFrame(pumpMotion);
  };

  const onResize = () => {
    const size = `${Math.round(dock.offsetWidth)}x${Math.round(dock.offsetHeight)}`;
    if (!lastSize) {
      lastSize = size;
      return;
    }
    if (size === lastSize) return;
    lastSize = size;
    
    if (scrollShape || dock.dataset.dockScrolling) return;
    fitRim();
    dock.dataset.dockMoving = 'true';
    const canvas = window.__liquidGLRenderer__?.canvas;
    if (canvas) {
      canvas.style.transition = 'none';
      canvas.style.opacity = '0';
    }
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      delete dock.dataset.dockMoving;
      void refresh();
    }, 120);
  };

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(dock);
  const content = document.querySelector('.ContentContainer');
  const contentObserver = content ? new MutationObserver(() => schedule(400)) : null;
  if (content) contentObserver?.observe(content, { attributes: true, attributeFilter: ['style'] });
  const page = dock.closest('.folio-page');
  const watchMasonry = () => {
    const masonry = page?.querySelector('.folio-masonry');
    if (!masonry || masonryObserver) return;
    masonryObserver = new MutationObserver(() => {
      schedule(360);
      if (orbitLive()) followOrbit();
    });
    masonryObserver.observe(masonry, { attributes: true, attributeFilter: ['class'] });
  };
  const pageObserver = page
    ? new MutationObserver(() => {
        watchMasonry();
                // The about timeline is HTML, which this photograph cannot paint.
        const about = page instanceof HTMLElement && page.dataset.folioView === 'about';
        if (about) {
          dock.dataset.dockPaging = 'true';
          const canvas = window.__liquidGLRenderer__?.canvas;
          if (canvas) canvas.style.opacity = '0';
        } else if (dock.dataset.dockPaging) {
          delete dock.dataset.dockPaging;
          if (started) refresh();
        }
        schedule(360);
      })
    : null;
  if (page) pageObserver?.observe(page, { attributes: true, attributeFilter: ['class', 'data-folio-view'], childList: true });
  watchMasonry();
  document.addEventListener('scroll', onScroll, { passive: true, capture: true });
  document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
  document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
  document.addEventListener('touchcancel', onTouchEnd, { passive: true, capture: true });
  document.addEventListener('transitionrun', onTransitionRun, true);
  const onPlaying = (event: Event) => {
    if (!started || mediaFrame || !(event.target instanceof HTMLVideoElement)) return;
    refresh();
  };
  document.addEventListener('playing', onPlaying, true);

  const begin = () => {
    if (cancelled || started) return;
    if (dock.offsetWidth < 1 || dock.offsetHeight < 1) {
      requestAnimationFrame(begin);
      return;
    }
    started = true;
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
          ...PAGE_GLASS_OPTS,
          on: {
            init() {
              if (cancelled) return;
              liftCanvas();
              fitRim();
            },
          },
        });
        const renderer = window.__liquidGLRenderer__ as CapturedRenderer | undefined;
        if (renderer) {
          renderer.snapshotTarget = plate;
          renderer.captureSnapshot = capture;
          bindFolioLensPose(renderer);
          liftCanvas();
        }
        capture();
      } catch (error) {
        console.warn('Dock glass capture failed', error);
        restorePill();
      }
    })();
  };

  const cluster = dock.closest('.dockCluster');
  const folioDock = dock.closest('.folio-dock');
  let settleWait = 0;
  const dockSettled = () => {
    if (!cluster) return true;
    const transform = getComputedStyle(cluster).transform;
    return transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)';
  };
  const queueBegin = () => {
    window.clearTimeout(settleWait);
    settleWait = window.setTimeout(() => {
      if (cancelled) return;
      if (dockSettled()) begin();
      else queueBegin();
    }, 40);
  };
  const onIntroEnd = () => queueBegin();
  cluster?.addEventListener('animationend', onIntroEnd);
  const introObserver =
    folioDock && !folioDock.classList.contains('is-in')
      ? new MutationObserver(() => {
          if (folioDock.classList.contains('is-in')) queueBegin();
        })
      : null;
  introObserver?.observe(folioDock!, { attributes: true, attributeFilter: ['class'] });
  if (!folioDock || folioDock.classList.contains('is-in')) queueBegin();

  
  const unbindViewport = bindFolioVisualViewport(scheduleLensPose);

  return () => {
    cancelled = true;
    if (pageGlassRefresh) pageGlassRefresh = null;
    if (pageGlassLift === liftCanvas) pageGlassLift = null;
    window.clearTimeout(settleWait);
    window.clearTimeout(resizeTimer);
    window.clearTimeout(settleTimer);
    window.clearTimeout(scrollTimer);
    if (motionFrame) cancelAnimationFrame(motionFrame);
    if (mediaFrame) cancelAnimationFrame(mediaFrame);
    if (orbitFrame) cancelAnimationFrame(orbitFrame);
    if (poseFrame) cancelAnimationFrame(poseFrame);
    document.removeEventListener('transitionrun', onTransitionRun, true);
    document.removeEventListener('playing', onPlaying, true);
    cluster?.removeEventListener('animationend', onIntroEnd);
    introObserver?.disconnect();
    resizeObserver.disconnect();
    contentObserver?.disconnect();
    pageObserver?.disconnect();
    masonryObserver?.disconnect();
    document.removeEventListener('scroll', onScroll, { capture: true });
    document.removeEventListener('touchstart', onTouchStart, { capture: true });
    document.removeEventListener('touchend', onTouchEnd, { capture: true });
    document.removeEventListener('touchcancel', onTouchEnd, { capture: true });
    unbindViewport();
    undoRenderLens?.();
    undoOverscroll?.();
    plate.remove();
    const renderer = window.__liquidGLRenderer__ as CapturedRenderer | undefined;
    if (renderer?.captureSnapshot === capture) renderer.captureSnapshot = () => {};
    if (renderer) renderer.lenses = renderer.lenses.filter((lens) => lens.el !== dock);
    const canvas = renderer?.canvas;
    if (canvas) {
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    }
    delete dock.dataset.dockCapture;
    delete dock.dataset.dockGlass;
    delete dock.dataset.dockMoving;
    delete dock.dataset.dockScrolling;
    delete dock.dataset.dockExpanding;
    delete dock.dataset.dockPaging;
    dock.closest('.mx-dock')?.removeAttribute('data-liquid-ignore');
    restorePill();
  };
}

function mountCapturedGlass(dock: HTMLElement) {
  if (!dock.closest('.dock-demo-stage')) return mountPageGlass(dock);
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
      const snapshotScale = 2;
      const next = await snapdom.toCanvas(clone, {
        scale: snapshotScale,
        dpr: 1,
        backgroundColor: getComputedStyle(stage ?? scroller).backgroundColor,
      });
      const contentHeight = scroller.scrollHeight;
      if (!cancelled && contentHeight > 0) {
        blurPhoto(next, 4 * snapshotScale);
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

  const applyCover = () => {
    const canvas = (window.__liquidGLRenderer__ as CapturedRenderer | undefined)?.canvas;
        // Glassworks leaves transition:none on the pill, which cancels the grow.
    dock.style.removeProperty('transition');
    if (resizing) {
      dock.dataset.dockMoving = 'true';
      delete dock.dataset.dockVeil;
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
                        // Glassworks appends the canvas to body at z-index 0, and the stage overflow traps the dock.
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

// CriOS is WebKit, so iOS Chrome falls through with Safari and Firefox.
function usesSvgBackdropLens(userAgent: string) {
  return /Chrome|Chromium|Edg\//.test(userAgent);
}

function mountSvgLens(
  dock: HTMLElement,
  backdrop: HTMLElement,
  mapRef: { current: SVGFEImageElement | null },
  displacementRefs: { current: (SVGFEDisplacementMapElement | null)[] },
) {
    // The backdrop is display:none until this is set, so the map can be measured.
  dock.dataset.dockNative = 'true';
  let settleTimer = 0;
  let generation = 0;
  let coverStarted = false;
  let closingAtStart = false;
  let builtSize = '';
  let pendingSize = '';

  // Backdrop-filter on the panel would hide the lens — keep the panel unfiltered.
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
    // New map is blank for a frame — wait or the channel split flashes turquoise.
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
}

export function DockGlass() {
  const id = useId().replace(/:/g, '');
  const ref = useRef<HTMLSpanElement>(null);
  const mapRef = useRef<SVGFEImageElement>(null);
  const displacementRefs = useRef<(SVGFEDisplacementMapElement | null)[]>([]);

  useEffect(() => {
    const backdrop = ref.current;
    const dock = backdrop?.parentElement;
    if (!backdrop || !dock) return;
    if (usesSvgBackdropLens(navigator.userAgent)) {
      return mountSvgLens(dock, backdrop, mapRef, displacementRefs);
    }
    return mountCapturedGlass(dock);
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
