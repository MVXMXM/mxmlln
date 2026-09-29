'use client';

import { ContactShadows } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { PAPER, damp } from './curl';

export type CoverPhase = 'closed' | 'opening' | 'open' | 'closing';

const REST_Y = 0.82;
const REST_X = -0.46;
const REST_Z = 0.08;
const FOLLOW_Y = 0.08;
const FOLLOW_X = 0.04;
const CLOSED_SCALE = 0.85;

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2;
}

function measureRightPage(pageW: number) {
  const el = document.querySelector('.sk-page--right');
  if (!el) return { x: pageW / 2, y: 0 };
  const r = el.getBoundingClientRect();
  return {
    x: r.left + r.width / 2 - window.innerWidth / 2,
    y: window.innerHeight / 2 - (r.top + r.height / 2),
  };
}

function cssFamily(varName: string, fallback: string) {
  const probe = document.createElement('span');
  probe.style.fontFamily = `var(${varName})`;
  probe.style.position = 'fixed';
  probe.style.visibility = 'hidden';
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily || fallback;
  probe.remove();
  return family;
}

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  start: number,
  min: number,
  maxWidth: number,
) {
  let size = start;
  ctx.font = font(size);
  while (ctx.measureText(text).width > maxWidth && size > min) {
    size *= 0.96;
    ctx.font = font(size);
  }
  return size;
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

function makeCoverTexture(w: number, h: number, handwritten: string, sans: string) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * 2);
  canvas.height = Math.round(h * 2);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(2, 2);

  const g = ctx.createLinearGradient(0, 0, w * 0.15, h);
  g.addColorStop(0, '#2a2826');
  g.addColorStop(0.48, '#1c1b19');
  g.addColorStop(1, '#121110');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const pad = w * 0.12;
  const maxW = w - pad * 2;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = 'rgba(243,242,239,0.58)';
  const eyeSize = fitFont(
    ctx,
    'taste is a function of tinkering',
    (s) => `400 ${s}px ${handwritten}`,
    h * 0.038,
    h * 0.024,
    maxW,
  );
  ctx.font = `400 ${eyeSize}px ${handwritten}`;
  ctx.fillText('taste is a function of tinkering', pad, h * 0.18);

  ctx.fillStyle = 'rgba(243,242,239,0.92)';
  const titleSize = fitFont(
    ctx,
    'Interaction',
    (s) => `800 ${s}px ${sans}`,
    h * 0.078,
    h * 0.05,
    maxW,
  );
  ctx.font = `800 ${titleSize}px ${sans}`;
  ctx.fillText('Interaction', pad, h * 0.34);
  ctx.fillText('Sketchbook', pad, h * 0.34 + titleSize * 1.05);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  grain(ctx, canvas.width, canvas.height, 16);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function makeSpineTexture(h: number, sans: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = Math.round(h * 2);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, '#1c1b19');
  g.addColorStop(0.5, '#141312');
  g.addColorStop(1, '#1c1b19');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, canvas.height);
  ctx.save();
  ctx.translate(128, canvas.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(243,242,239,0.78)';
  ctx.font = `600 ${Math.round(h * 0.026)}px ${sans}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('INTERACTION SKETCHBOOK', 0, 0);
  ctx.restore();
  grain(ctx, canvas.width, canvas.height, 12);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function makePageEdgeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#e8e1d4';
  ctx.fillRect(0, 0, 64, 512);
  for (let y = 0; y < 512; y += 2) {
    const shade = 210 + ((y * 17) % 9);
    ctx.fillStyle = `rgba(92, 78, 62, ${0.04 + (y % 5) * 0.008})`;
    ctx.fillRect(0, y, 64, 1);
    if (y % 6 === 0) {
      ctx.fillStyle = `rgb(${shade},${shade - 8},${shade - 18})`;
      ctx.fillRect(0, y, 64, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function Cloth({
  map,
  color,
  roughness = 0.8,
  side,
}: {
  map?: THREE.CanvasTexture | null;
  color: string;
  roughness?: number;
  side?: THREE.Side;
}) {
  return (
    <meshPhysicalMaterial
      key={map?.uuid ?? color}
      map={map ?? undefined}
      color={map ? '#ffffff' : color}
      roughness={roughness}
      metalness={0}
      sheen={0.42}
      sheenRoughness={0.62}
      sheenColor="#c9bba8"
      envMapIntensity={0.35}
      emissive={map ? '#ffffff' : '#000000'}
      emissiveMap={map ?? undefined}
      emissiveIntensity={map ? 0.1 : 0}
      side={side}
    />
  );
}

function makeJacketGeometry(w: number, h: number, r: number, board: number) {
  const ri = Math.max(r - board, r * 0.45);
  const segs = 32;
  const ring: [number, number][] = [];
  ring.push([w, r]);
  ring.push([0, r]);
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const a = -t * Math.PI;
    ring.push([r * Math.sin(a), r * Math.cos(a)]);
  }
  ring.push([w, -r]);
  ring.push([w, -ri]);
  ring.push([0, -ri]);
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const a = -Math.PI + t * Math.PI;
    ring.push([ri * Math.sin(a), ri * Math.cos(a)]);
  }
  ring.push([w, ri]);

  const n = ring.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const y0 = -h / 2;
  const y1 = h / 2;

  for (let level = 0; level < 2; level++) {
    const y = level === 0 ? y0 : y1;
    for (let i = 0; i < n; i++) {
      const [x, z] = ring[i];
      positions.push(x, y, z);
      const onFront = z > r * 0.9 && x >= -0.01;
      uvs.push(onFront ? x / w : 0.03, (y - y0) / h);
    }
  }

  for (let i = 0; i < n; i++) {
    const a = i;
    const b = (i + 1) % n;
    const c = a + n;
    const d = b + n;
    indices.push(a, c, b, b, c, d);
  }

  const contour = ring.map(([x, z]) => new THREE.Vector2(x, z));
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  for (const [a, b, c] of tris) {
    indices.push(a, c, b);
    indices.push(a + n, b + n, c + n);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function Book({
  pageW,
  pageH,
  progress,
  pointer,
  orbit,
}: {
  pageW: number;
  pageH: number;
  progress: React.MutableRefObject<number>;
  pointer: React.MutableRefObject<{ x: number; y: number }>;
  orbit: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const root = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const cover = useRef<THREE.Group>(null);
  const jacket = useRef<THREE.Mesh>(null);
  const block = useRef<THREE.Mesh>(null);
  const spine = useRef<THREE.Mesh>(null);
  const shadows = useRef<THREE.Group>(null);
  const board = pageH * 0.015;
  const pages = pageH * 0.084;
  const radius = pages / 2 + board;
  const coverH = pageH + board * 2.5;
  const coverW = pageW + board * 0.55;
  const pageWInner = pageW * 0.97;
  const pageHInner = pageH * 0.968;
  const pageD = Math.max(pages * 0.9, (radius - board) * 1.85);
  const [coverTex, setCoverTex] = useState<THREE.CanvasTexture | null>(null);
  const [spineTex, setSpineTex] = useState<THREE.CanvasTexture | null>(null);
  const [edgeTex] = useState(makePageEdgeTexture);

  useEffect(() => {
    let cancelled = false;
    let nextCover: THREE.CanvasTexture | null = null;
    let nextSpine: THREE.CanvasTexture | null = null;
    const paint = async () => {
      const handwritten = cssFamily('--font-handwritten', '"Homemade Apple", cursive');
      const sans = cssFamily('--font-sans', 'Archivo, sans-serif');
      nextCover = makeCoverTexture(pageW, pageH, handwritten, sans);
      nextSpine = makeSpineTexture(pageH, sans);
      setCoverTex(nextCover);
      setSpineTex(nextSpine);
      await document.fonts.ready;
      await Promise.all([
        document.fonts.load(`400 ${Math.round(pageH * 0.038)}px ${handwritten}`),
        document.fonts.load(`800 ${Math.round(pageH * 0.078)}px ${sans}`),
      ]).catch(() => {});
      if (cancelled) return;
      const drawnCover = makeCoverTexture(pageW, pageH, handwritten, sans);
      const drawnSpine = makeSpineTexture(pageH, sans);
      nextCover?.dispose();
      nextSpine?.dispose();
      nextCover = drawnCover;
      nextSpine = drawnSpine;
      setCoverTex(drawnCover);
      setSpineTex(drawnSpine);
    };
    paint();
    return () => {
      cancelled = true;
      nextCover?.dispose();
      nextSpine?.dispose();
    };
  }, [pageW, pageH]);

  useEffect(() => () => edgeTex?.dispose(), [edgeTex]);

  const qClosed = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(REST_X, REST_Y, REST_Z, 'YXZ')),
    [],
  );
  const qFlat = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    if (!root.current || !spin.current || !cover.current) return;
    const p = progress.current;
    const settle = Math.min(1, p / 0.6);
    const coverT = easeInOut(Math.min(1, Math.max(0, (p - 0.05) / 0.55)));
    const s = THREE.MathUtils.lerp(CLOSED_SCALE, 1, settle);
    const zSquash = THREE.MathUtils.lerp(1, 0.05, THREE.MathUtils.smoothstep(settle, 0.85, 1));
    const flat = measureRightPage(pageW);
    const idle = 1 - settle;
    root.current.position.set(
      THREE.MathUtils.lerp(0, flat.x, settle),
      THREE.MathUtils.lerp(0, flat.y, settle),
      THREE.MathUtils.lerp(0, (-pageD / 2) * zSquash, settle),
    );
    root.current.scale.set(s, s, s * zSquash);
    spin.current.quaternion.slerpQuaternions(qClosed, qFlat, settle);
    if (idle > 0.001) {
      spin.current.rotateY(
        orbit.current.y * idle + pointer.current.x * FOLLOW_Y * idle,
      );
      spin.current.rotateX(
        orbit.current.x * idle - pointer.current.y * FOLLOW_X * idle,
      );
    }
    cover.current.rotation.y = -Math.PI * coverT;
    if (jacket.current) jacket.current.visible = coverT < 0.04;
    if (shadows.current) shadows.current.visible = coverT < 0.35;
  });
  const jacketGeo = useMemo(
    () => makeJacketGeometry(coverW, coverH, radius, board),
    [coverW, coverH, radius, board],
  );

  useEffect(() => () => jacketGeo.dispose(), [jacketGeo]);

  return (
    <group ref={root} scale={CLOSED_SCALE}>
      <group ref={spin} rotation={[REST_X, REST_Y, REST_Z]}>
        <group position={[-pageW / 2, 0, 0]}>
          <mesh ref={jacket} geometry={jacketGeo} castShadow>
            <meshPhysicalMaterial
              key={coverTex?.uuid ?? 'jacket'}
              map={coverTex ?? undefined}
              color={coverTex ? '#ffffff' : '#161513'}
              roughness={0.8}
              metalness={0}
              sheen={0.42}
              sheenRoughness={0.62}
              sheenColor="#c9bba8"
              emissive={coverTex ? '#ffffff' : '#000000'}
              emissiveMap={coverTex ?? undefined}
              emissiveIntensity={coverTex ? 0.1 : 0}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh ref={block} position={[pageWInner / 2 + board * 0.8, 0, 0]} castShadow>
            <boxGeometry args={[pageWInner, pageHInner, pageD]} />
            <meshStandardMaterial attach="material-0" map={edgeTex ?? undefined} color="#e8e1d4" roughness={0.92} metalness={0} />
            <meshStandardMaterial attach="material-1" color="#d4cdc0" roughness={0.94} metalness={0} />
            <meshStandardMaterial attach="material-2" map={edgeTex ?? undefined} color="#e4ddd0" roughness={0.9} metalness={0} />
            <meshStandardMaterial attach="material-3" map={edgeTex ?? undefined} color="#e4ddd0" roughness={0.9} metalness={0} />
            <meshStandardMaterial attach="material-4" color={PAPER} roughness={0.64} metalness={0} />
            <meshStandardMaterial attach="material-5" color={PAPER} roughness={0.64} metalness={0} />
          </mesh>
          <mesh ref={spine}>
            <cylinderGeometry
              args={[radius + 0.45, radius + 0.45, coverH * 0.62, 24, 1, true, -Math.PI * 0.68, Math.PI * 0.36]}
            />
            <Cloth map={spineTex} color="#161513" roughness={0.86} side={THREE.DoubleSide} />
          </mesh>
          <group ref={cover} position={[0, 0, radius]}>
            <mesh position={[coverW / 2, 0, 0.2]} castShadow>
              <planeGeometry args={[coverW, coverH]} />
              <meshPhysicalMaterial
                key={coverTex?.uuid ?? 'cover'}
                map={coverTex ?? undefined}
                color={coverTex ? '#ffffff' : '#1b1a18'}
                roughness={0.78}
                metalness={0}
                sheen={0.4}
                sheenRoughness={0.64}
                sheenColor="#c9bba8"
                polygonOffset
                polygonOffsetFactor={-1}
                emissive={coverTex ? '#ffffff' : '#000000'}
                emissiveMap={coverTex ?? undefined}
                emissiveIntensity={coverTex ? 0.1 : 0}
              />
            </mesh>
            <mesh position={[coverW / 2, 0, -0.25]}>
              <planeGeometry args={[pageWInner, pageHInner]} />
              <meshBasicMaterial color={PAPER} side={THREE.BackSide} />
            </mesh>
          </group>
        </group>
      </group>
      <group ref={shadows}>
        <ContactShadows
          position={[0, -pageH / 2 - 2, 0]}
          opacity={0.34}
          scale={pageW * 2.8}
          blur={2.8}
          far={pageH * 0.5}
          color="#1a1814"
          frames={Infinity}
        />
      </group>
    </group>
  );
}

function CoverInner({
  pageW,
  pageH,
  progress,
  pointer,
  orbit,
  target,
  wrap,
}: {
  pageW: number;
  pageH: number;
  progress: React.MutableRefObject<number>;
  pointer: React.MutableRefObject<{ x: number; y: number }>;
  orbit: React.MutableRefObject<{ x: number; y: number }>;
  target: number;
  wrap: React.RefObject<HTMLDivElement | null>;
}) {
  const { camera, size, gl } = useThree();

  useFrame((_, delta) => {
    gl.setClearColor(0x000000, 0);
    progress.current = damp(progress.current, target, target >= 1 ? 0.5 : 0.26, delta);
    const p = progress.current;
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 20;
      camera.aspect = size.width / Math.max(1, size.height);
      const z = size.height / 2 / Math.tan(THREE.MathUtils.degToRad(10));
      camera.position.set(0, 0, z);
      camera.near = z * 0.1;
      camera.far = z * 3;
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
    if (wrap.current) {
      const wash = wrap.current.querySelector('.sk-intro-wash') as HTMLElement | null;
      if (wash) wash.style.opacity = String(1 - THREE.MathUtils.smoothstep(p, 0.6, 0.74));
      wrap.current.style.opacity = String(1 - THREE.MathUtils.smoothstep(p, 0.68, 0.86));
      wrap.current.style.pointerEvents = p > 0.5 ? 'none' : 'auto';
    }
  });

  return (
    <>
      <hemisphereLight args={['#f4efe6', '#8c867c', 0.85]} />
      <directionalLight position={[120, 280, 420]} intensity={1.55} color="#fff6ea" />
      <directionalLight position={[-420, 60, 160]} intensity={0.7} color="#ffe7c4" />
      <directionalLight position={[-80, 40, 380]} intensity={0.28} color="#d7e0ea" />
      <Book pageW={pageW} pageH={pageH} progress={progress} pointer={pointer} orbit={orbit} />
    </>
  );
}

export default function CoverScene({
  phase,
  pageW,
  pageH,
  onOpen,
}: {
  phase: CoverPhase;
  pageW: number;
  pageH: number;
  onOpen: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const progress = useRef(phase === 'open' || phase === 'opening' ? 1 : 0);
  const pointer = useRef({ x: 0, y: 0 });
  const orbit = useRef({ x: 0, y: 0 });
  const grab = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const [grabbing, setGrabbing] = useState(false);
  const target = phase === 'opening' || phase === 'open' ? 1 : 0;
  const closed = phase === 'closed';

  return (
    <div
      ref={wrap}
      className={`sk-intro ${grabbing ? 'is-grabbing' : ''}`}
      role={closed ? 'button' : undefined}
      tabIndex={closed ? 0 : -1}
      aria-label={closed ? 'Interaction Sketchbook — open the book' : undefined}
      onKeyDown={
        closed
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      onPointerDown={(e) => {
        if (!closed) return;
        grab.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
        setGrabbing(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* already captured */
        }
      }}
      onPointerMove={(e) => {
        if (!closed) return;
        pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
        const g = grab.current;
        if (!g || g.id !== e.pointerId) return;
        if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 8) g.moved = true;
        if (g.moved) {
          orbit.current.y = THREE.MathUtils.clamp(
            orbit.current.y + (e.movementX / window.innerWidth) * 2.4,
            -0.9,
            0.9,
          );
          orbit.current.x = THREE.MathUtils.clamp(
            orbit.current.x + (e.movementY / window.innerHeight) * 1.5,
            -0.5,
            0.5,
          );
        }
      }}
      onPointerUp={(e) => {
        const g = grab.current;
        if (!g || g.id !== e.pointerId) return;
        grab.current = null;
        setGrabbing(false);
        if (closed && !g.moved) onOpen();
      }}
      onPointerCancel={() => {
        grab.current = null;
        setGrabbing(false);
      }}
      onPointerLeave={() => {
        pointer.current.x = 0;
        pointer.current.y = 0;
      }}
    >
      <div className="sk-intro-wash" aria-hidden />
      <div className="sk-intro-canvas">
        <Canvas
          dpr={Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)}
          gl={{ alpha: true, antialias: true }}
          camera={{ fov: 20, near: 1, far: 20000, position: [0, 80, 900] }}
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <CoverInner
            pageW={pageW}
            pageH={pageH}
            progress={progress}
            pointer={pointer}
            orbit={orbit}
            target={target}
            wrap={wrap}
          />
        </Canvas>
      </div>
    </div>
  );
}
