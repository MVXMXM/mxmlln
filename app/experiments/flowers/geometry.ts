import * as THREE from 'three';

const PROFILE_A = [
  [0.37, 0.105, 0.005, 0.055],
  [0.35, 0.16, 0.13, 0.055],
  [0.34, 0.15, -0.015, 0.07],
  [0.42, 0.13, 0.015, 0.04],
  [0.37, 0.105, 0.005, 0.055],
  [0.34, 0.15, -0.015, 0.07],
  [0.36, 0.09, 0.06, 0.045],
  [0.35, 0.16, 0.13, 0.055],
] as const;

export function makeStemGeometry() {
  const geo = new THREE.CylinderGeometry(0.007, 0.013, 1, 5, 6, false);
  geo.translate(0, 0.5, 0);
  return geo;
}

export function makeBladeGeometry() {
  const geo = new THREE.PlaneGeometry(0.028, 1, 1, 4);
  geo.translate(0, 0.5, 0);
  return geo;
}

export function makeHeadGeometry(species: number, petalCount: number) {
  const a = PROFILE_A[species] ?? PROFILE_A[0];
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const parts: number[] = [];

  const radialSeg = 3;
  const lateralSeg = 2;

  for (let slot = 0; slot < petalCount; slot++) {
    const yaw = (slot / petalCount) * Math.PI * 2;
    const axisX = Math.cos(yaw);
    const axisZ = Math.sin(yaw);
    const tanX = -axisZ;
    const tanZ = axisX;

    for (let r = 0; r < radialSeg; r++) {
      for (let l = 0; l < lateralSeg; l++) {
        const quad = [
          [r, l],
          [r + 1, l],
          [r, l + 1],
          [r + 1, l],
          [r + 1, l + 1],
          [r, l + 1],
        ];
        for (const [ri, li] of quad) {
          const along = ri / radialSeg;
          const across = li / lateralSeg * 2 - 1;
          const radius = 0.01 + along * a[0] * 0.92;
          const width = a[1] * 1.28 * (1 - along * 0.18);
          const lift = Math.max(
            -0.03 * along ** 1.5,
            a[2] * along ** 1.55 + a[3] * Math.sin(Math.PI * along),
          );
          const cup = (1 - across * across) * 0.012 * Math.sin(Math.PI * along);
          positions.push(
            axisX * radius + tanX * across * width,
            lift + cup,
            axisZ * radius + tanZ * across * width,
          );
          normals.push(axisX * 0.2, 1, axisZ * 0.2);
          uvs.push((across + 1) * 0.5, along);
          parts.push(0);
        }
      }
    }
  }

  const diskR = 0.048;
  const diskSeg = 12;
  for (let i = 0; i < diskSeg; i++) {
    const a0 = (i / diskSeg) * Math.PI * 2;
    const a1 = ((i + 1) / diskSeg) * Math.PI * 2;
    positions.push(0, 0.01, 0, Math.cos(a0) * diskR, 0.01, Math.sin(a0) * diskR, Math.cos(a1) * diskR, 0.01, Math.sin(a1) * diskR);
    normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
    uvs.push(0.5, 0.5, 0.5, 0.5, 0.5, 0.5);
    parts.push(1, 1, 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aPart', new THREE.Float32BufferAttribute(parts, 1));
  geo.computeVertexNormals();
  return geo;
}
