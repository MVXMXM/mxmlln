'use client';

import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Stage } from './Stage';

const vertexShader = /* glsl */ `
  uniform float u_time;

  varying vec2 vUv;

  void main() {
    vUv = uv;

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    modelPosition.y += sin(modelPosition.x * 4.0 + u_time * 2.0) * 0.2;

    // Uncomment for a second wave on z
    // modelPosition.y += sin(modelPosition.z * 6.0 + u_time * 2.0) * 0.1;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;
  }
`;

const fragmentShader = /* glsl */ `
  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
`;

const MovingPlane = () => {
  const mesh = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>>(null);

  const uniforms = useMemo(
    () => ({
      u_time: {
        value: 0.0,
      },
    }),
    [],
  );

  useFrame((state) => {
    const material = mesh.current?.material;
    if (!material) return;
    material.uniforms.u_time.value = state.clock.getElapsedTime();
  });

  return (
    <mesh
      ref={mesh}
      position={[0, 0, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={1.5}
    >
      <planeGeometry args={[1, 1, 32, 32]} />
      <shaderMaterial
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        uniforms={uniforms}
        wireframe
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export default function PlaneScene() {
  return (
    <Stage camera={{ position: [1.0, 1.5, 1.0] }}>
      <MovingPlane />
      <axesHelper />
      <OrbitControls />
    </Stage>
  );
}
