'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  CURL_FRAGMENT,
  CURL_VERTEX,
  FLIP,
  SHADOW_FRAGMENT,
  SHADOW_VERTEX,
  damp,
  flipProgress,
} from './curl';

export type FlipDir = 'fwd' | 'back';

export type FlipSession = {
  id: number;
  dir: FlipDir;
  frontTex: THREE.Texture;
  backTex: THREE.Texture;
  frontFlatTex: THREE.Texture;
  backFlatTex: THREE.Texture;
  spineX: number;
  bottomY: number;
  pageW: number;
  pageH: number;
  motion: {
    fx: number;
    fy: number;
    fxTarget: number;
    fyTarget: number;
    dragging: boolean;
    smoothTime: number;
    done: boolean;
  };
};

const LIGHT = new THREE.Vector3(-0.22, 0.3, 1).normalize();

function PixelCamera() {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    camera.fov = 20;
    camera.aspect = size.width / Math.max(1, size.height);
    camera.near = 1;
    camera.far = 20000;
    camera.position.set(0, 0, size.height / 2 / Math.tan(THREE.MathUtils.degToRad(10)));
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function CurlLeaf({
  session,
  onFirstPaint,
  onSettled,
}: {
  session: FlipSession;
  onFirstPaint: () => void;
  onSettled: (committed: boolean) => void;
}) {
  const painted = useRef(false);
  const settled = useRef(false);
  const camera = useThree((s) => s.camera);
  const flip = session.dir === 'fwd' ? 1 : -1;

  const pageGeo = useMemo(() => {
    const [wSeg, hSeg] = FLIP.segments;
    const geo = new THREE.PlaneGeometry(session.pageW, session.pageH, wSeg, hSeg);
    geo.translate(session.pageW / 2, session.pageH / 2, 0);
    return geo;
  }, [session.pageW, session.pageH]);

  const shadowGeo = useMemo(
    () => new THREE.PlaneGeometry(session.pageW * 2, session.pageH),
    [session.pageW, session.pageH],
  );

  const curlUniforms = useMemo(
    () => ({
      uAxisA: { value: new THREE.Vector2(session.pageW, 0) },
      uAxisM: { value: new THREE.Vector2(1, 0) },
      uRadius: { value: 0 },
      uFlip: { value: flip },
      uFrontMap: { value: session.frontTex },
      uBackMap: { value: session.backTex },
      uFrontFlat: { value: session.frontFlatTex },
      uBackFlat: { value: session.backFlatTex },
      uLightDir: { value: LIGHT.clone() },
      uCamPos: { value: new THREE.Vector3() },
      uAmbient: { value: FLIP.ambient },
      uSpecular: { value: FLIP.specular },
      uShowThrough: { value: FLIP.airShowThrough },
      uCurl: { value: 0 },
    }),
    [session, flip],
  );

  const shadowUniforms = useMemo(
    () => ({
      uStrength: { value: 0 },
      uRho: { value: 0 },
      uFlip: { value: flip },
    }),
    [session.id, flip],
  );

  const curlMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: CURL_VERTEX,
        fragmentShader: CURL_FRAGMENT,
        uniforms: curlUniforms,
        side: THREE.DoubleSide,
      }),
    [curlUniforms],
  );

  const shadowMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SHADOW_VERTEX,
        fragmentShader: SHADOW_FRAGMENT,
        uniforms: shadowUniforms,
        transparent: true,
        depthTest: true,
        depthWrite: false,
      }),
    [shadowUniforms],
  );

  useEffect(
    () => () => {
      pageGeo.dispose();
      shadowGeo.dispose();
      curlMat.dispose();
      shadowMat.dispose();
    },
    [pageGeo, shadowGeo, curlMat, shadowMat],
  );

  useFrame((_, delta) => {
    const motion = session.motion;
    const dt = Math.min(delta, 0.05);
    const dist = Math.hypot(motion.fx - motion.fxTarget, motion.fy - motion.fyTarget);
    const atRest = motion.fxTarget === session.pageW || motion.fxTarget === -session.pageW;
    const smooth = motion.dragging || (atRest && dist < 30) ? 0.05 : motion.smoothTime;
    motion.fx = damp(motion.fx, motion.fxTarget, smooth, dt);
    motion.fy = damp(motion.fy, motion.fyTarget, smooth, dt);

    if (
      !settled.current &&
      !motion.dragging &&
      atRest &&
      Math.abs(motion.fx - motion.fxTarget) < 1.2 &&
      Math.abs(motion.fy - motion.fyTarget) < 1.2
    ) {
      settled.current = true;
      motion.fx = motion.fxTarget;
      motion.fy = motion.fyTarget;
      motion.done = true;
      const committed = motion.fxTarget === -session.pageW;
      requestAnimationFrame(() => onSettled(committed));
    }

    const pageW = session.pageW;
    const pageH = session.pageH;
    const progress = flipProgress(pageW, motion.fx);
    let dx = pageW - motion.fx;
    let dy = 0 - motion.fy;
    const len = Math.hypot(dx, dy);
    let ax = 1;
    let ay = 0;
    if (len > 0.001) {
      ax = dx / len;
      ay = dy / len;
    }
    if (ax < 0.025) {
      ax = 0.025;
      const n = Math.hypot(ax, ay);
      ax /= n;
      ay /= n;
    }

    let radius = Math.min(FLIP.rollRadius * pageW, len * 0.3);
    radius *= 1 - THREE.MathUtils.smoothstep(progress, 0.78, 1);
    let along = (len + Math.PI * radius) / 2;
    along = Math.min(along, pageW * ax, pageW * ax - pageH * ay);
    along = Math.max(along, 0);

    curlUniforms.uAxisA.value.set(pageW - ax * along, 0 - ay * along);
    curlUniforms.uAxisM.value.set(ax, ay);
    curlUniforms.uRadius.value = radius;
    curlUniforms.uCurl.value = Math.sin(progress * Math.PI);
    curlUniforms.uCamPos.value.copy(camera.position);
    shadowUniforms.uStrength.value = Math.sin(progress * Math.PI) * FLIP.shadow;
    shadowUniforms.uRho.value = progress * Math.PI;
  });

  return (
    <group position={[session.spineX, session.bottomY, 0]}>
      <mesh
        geometry={shadowGeo}
        material={shadowMat}
        position={[0, session.pageH / 2, -2]}
        renderOrder={0}
      />
      <mesh
        geometry={pageGeo}
        material={curlMat}
        renderOrder={1}
        frustumCulled={false}
        onAfterRender={() => {
          if (painted.current) return;
          painted.current = true;
          requestAnimationFrame(onFirstPaint);
        }}
      />
    </group>
  );
}

export default function FlipOverlay({
  session,
  onFirstPaint,
  onSettled,
}: {
  session: FlipSession | null;
  onFirstPaint: () => void;
  onSettled: (committed: boolean) => void;
}) {
  return (
    <div className={`sk-flip ${session ? 'is-active' : ''}`} aria-hidden>
      <Canvas
        frameloop={session ? 'always' : 'demand'}
        dpr={Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)}
        gl={{ alpha: true, antialias: true }}
        camera={{ fov: 20, near: 1, far: 20000, position: [0, 0, 800] }}
        style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
      >
        <PixelCamera />
        {session && (
          <CurlLeaf
            key={session.id}
            session={session}
            onFirstPaint={onFirstPaint}
            onSettled={onSettled}
          />
        )}
      </Canvas>
    </div>
  );
}
