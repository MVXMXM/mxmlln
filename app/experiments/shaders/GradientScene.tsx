'use client';

import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Stage } from './Stage';

const vertexShader = /* glsl */ `
  uniform float u_time;

  varying float vZ;

  void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    modelPosition.y += sin(modelPosition.x * 5.0 + u_time * 3.0) * 0.1;
    modelPosition.y += sin(modelPosition.z * 6.0 + u_time * 2.0) * 0.1;

    vZ = modelPosition.y;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 u_colorA;
  uniform vec3 u_colorB;
  varying float vZ;

  void main() {
    vec3 color = mix(u_colorA, u_colorB, vZ * 2.0 + 0.5);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const MovingPlane = () => {
  const mesh = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>>(null);

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0.0 },
      u_colorA: { value: new THREE.Color('#FFE486') },
      u_colorB: { value: new THREE.Color('#FEB3D9') },
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
      <planeGeometry args={[1, 1, 16, 16]} />
      <shaderMaterial
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export default function GradientScene() {
  return (
    <Stage camera={{ position: [1.0, 1.0, 1.0] }}>
      <MovingPlane />
      <OrbitControls />
    </Stage>
  );
}
