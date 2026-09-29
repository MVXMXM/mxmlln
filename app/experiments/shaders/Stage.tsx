'use client';

import { Canvas, type CanvasProps } from '@react-three/fiber';
import type { ReactNode } from 'react';
import * as THREE from 'three';

export const BG = '#0f172b';

export function Stage({
  children,
  camera,
  gl,
}: {
  children: ReactNode;
  camera: CanvasProps['camera'];
  gl?: CanvasProps['gl'];
}) {
  return (
    <Canvas
      camera={camera}
      gl={{ alpha: false, antialias: true, ...gl }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(BG, 1);
        scene.background = new THREE.Color(BG);
      }}
      style={{ width: '100%', height: '100%', display: 'block', background: BG }}
    >
      {children}
    </Canvas>
  );
}
