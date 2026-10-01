'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Stage } from './Stage';

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    gl_FragColor = vec4(vUv, 0.0, 1.0);
  }
`;

const Cube = () => {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += delta * 0.45;
    mesh.current.rotation.x += delta * 0.2;
  });

  return (
    <mesh ref={mesh}>
      <boxGeometry args={[1, 1, 1]} />
      <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} />
    </mesh>
  );
};

export default function CubeScene() {
  return (
    <Stage camera={{ position: [1.75, 1.25, 2.25], fov: 50 }}>
      <Cube />
    </Stage>
  );
}
