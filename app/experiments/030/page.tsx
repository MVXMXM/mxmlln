'use client';

import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import { Planet } from '../shaders/PlanetScene';
import { BG, Stage } from '../shaders/Stage';
import { FlowerField } from './FlowerField';

export default function Page() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: BG,
      }}
    >
      <Stage
        camera={{ position: [0.0, 0.45, 9.2], fov: 42 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={0.03} />
        <directionalLight position={[0.3, 0.15, 0.0]} intensity={2} />
        <Planet />
        <Suspense fallback={null}>
          <FlowerField />
        </Suspense>
        <OrbitControls
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.28}
          minDistance={5.4}
          maxDistance={16}
        />
      </Stage>
    </div>
  );
}
