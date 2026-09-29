import { snapdom } from '@zumer/snapdom';
import * as THREE from 'three';

const faces = new Map<string, HTMLElement>();
const cache = new Map<string, { tex: THREE.CanvasTexture; size: string }>();
const inflight = new Map<string, Promise<THREE.CanvasTexture>>();
const CACHE_LIMIT = 24;

export function registerFace(id: string, el: HTMLElement | null) {
  if (el) faces.set(id, el);
  else faces.delete(id);
}

function sizeKey(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  return `${Math.round(r.width)}x${Math.round(r.height)}@${dpr}`;
}

function textureFromCanvas(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

async function stampIframes(
  root: HTMLElement,
  dest: HTMLCanvasElement,
  only?: HTMLIFrameElement,
) {
  const iframes = only ? [only] : [...root.querySelectorAll('iframe')];
  if (!iframes.length) return;
  const ctx = dest.getContext('2d');
  if (!ctx) return;
  const rootRect = root.getBoundingClientRect();
  const scaleX = dest.width / Math.max(1, rootRect.width);
  const scaleY = dest.height / Math.max(1, rootRect.height);
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  for (const iframe of iframes) {
    if (!only && getComputedStyle(iframe).opacity === '0') continue;
    const destRect = iframe.getBoundingClientRect();
    const dx = (destRect.left - rootRect.left) * scaleX;
    const dy = (destRect.top - rootRect.top) * scaleY;
    const dw = destRect.width * scaleX;
    const dh = destRect.height * scaleY;
    try {
      const doc = iframe.contentDocument;
      if (!doc) continue;
      const win = iframe.contentWindow;
      const iw = win?.innerWidth || iframe.clientWidth;
      const ih = win?.innerHeight || iframe.clientHeight;
      const canvases = doc.querySelectorAll('canvas');
      if (canvases.length) {
        canvases.forEach((src) => {
          const sr = src.getBoundingClientRect();
          ctx.drawImage(
            src,
            dx + (sr.left / iw) * dw,
            dy + (sr.top / ih) * dh,
            (sr.width / iw) * dw,
            (sr.height / ih) * dh,
          );
        });
        continue;
      }
      const inner = await snapdom.toCanvas(doc.documentElement, { scale: dpr, embedFonts: true });
      ctx.drawImage(inner, dx, dy, dw, dh);
    } catch {
      ctx.fillStyle = '#eeede9';
      ctx.fillRect(dx, dy, dw, dh);
    }
  }
}

async function captureIframePage(iframe: HTMLIFrameElement): Promise<THREE.CanvasTexture> {
  const page = iframe.closest('.sk-page');
  if (!(page instanceof HTMLElement)) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const canvas = document.createElement('canvas');
    const r = iframe.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    await stampIframes(iframe.parentElement ?? iframe, canvas, iframe);
    return textureFromCanvas(canvas);
  }
  await document.fonts.ready;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const canvas = await snapdom.toCanvas(page, {
    scale: dpr,
    embedFonts: true,
    exclude: ['iframe', '.sk-frame'],
  });
  await stampIframes(page, canvas, iframe);
  return textureFromCanvas(canvas);
}

export async function captureElement(el: HTMLElement): Promise<THREE.CanvasTexture> {
  await document.fonts.ready;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const canvas = await snapdom.toCanvas(el, {
    scale: dpr,
    embedFonts: true,
    exclude: ['iframe', '.sk-frame'],
  });
  await stampIframes(el, canvas);
  return textureFromCanvas(canvas);
}

export async function captureFace(id: string): Promise<THREE.CanvasTexture> {
  const el = faces.get(id);
  if (!el) throw new Error(`No capture face "${id}"`);
  if (el instanceof HTMLIFrameElement) return captureIframePage(el);
  const size = sizeKey(el);
  const hit = cache.get(id);
  if (hit && hit.size === size && !el.querySelector('iframe, canvas')) {
    cache.delete(id);
    cache.set(id, hit);
    return hit.tex;
  }
  const pending = inflight.get(id);
  if (pending) return pending;

  const job = (async () => {
    const tex = await captureElement(el);
    cache.get(id)?.tex.dispose();
    cache.delete(id);
    cache.set(id, { tex, size });
    while (cache.size > CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      if (!oldest) break;
      cache.get(oldest)?.tex.dispose();
      cache.delete(oldest);
    }
    return tex;
  })().finally(() => inflight.delete(id));

  inflight.set(id, job);
  return job;
}

export function precacheFaces(ids: string[]) {
  const schedule =
    'requestIdleCallback' in window
      ? (fn: () => void) => window.requestIdleCallback(fn, { timeout: 1500 })
      : (fn: () => void) => window.setTimeout(fn, 120);
  ids.forEach((id) => {
    schedule(() => {
      if (faces.has(id)) captureFace(id).catch(() => {});
    });
  });
}

export function disposeTexture(...textures: (THREE.Texture | null | undefined)[]) {
  const seen = new Set<THREE.Texture>();
  textures.forEach((tex) => {
    if (!tex || seen.has(tex)) return;
    seen.add(tex);
    tex.dispose();
  });
}
