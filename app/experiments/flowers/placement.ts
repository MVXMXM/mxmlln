import * as THREE from 'three';

export const PLANET_RADIUS = 3;
export const SEED = 4177;
export const WIND = 0.82;
export const DENSITY = 0.74;
export const FLOWER_CANDIDATES = 5600;
export const GRASS_CANDIDATES = 5200;
export const SIZE = 0.34;

export const PETAL_COUNTS = [8, 5, 5, 6, 8, 5, 9, 5];

const Y_UP = new THREE.Vector3(0, 1, 0);

export function hashU32(x: number) {
  let n = x >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return (n ^ (n >>> 16)) >>> 0;
}

export function hash01(x: number) {
  return hashU32(x) / 4294967296;
}

export function speciesFor(id: number) {
  const selector = hash01(id * 73 + SEED * 7);
  if (selector < 0.25) return 0;
  if (selector < 0.41) return 1;
  if (selector < 0.45) return 2;
  if (selector < 0.56) return 3;
  if (selector < 0.74) return 4;
  if (selector < 0.89) return 5;
  if (selector < 0.93) return 6;
  return 7;
}

export function variantFor(id: number) {
  return hashU32(id * 83 + SEED * 11) % 5;
}

function flowerScale(id: number, species: number) {
  const random = hash01(id * 97 + SEED);
  const range =
    species === 1 ? [0.68, 1.18] :
    species === 2 ? [0.7, 1.24] :
    species === 3 ? [0.66, 1.18] :
    species === 4 ? [0.42, 0.76] :
    species === 5 ? [0.46, 0.84] :
    species === 6 ? [0.52, 0.94] :
    species === 7 ? [0.48, 0.88] :
    [0.72, 1.28];
  return THREE.MathUtils.lerp(range[0], range[1], random);
}

function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function noise3(x: number, y: number, z: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const fz = fade(z - iz);
  const h = (i: number, j: number, k: number) =>
    hash01((i * 157 + j * 313 + k * 571 + SEED) >>> 0);
  const x0 = THREE.MathUtils.lerp(h(ix, iy, iz), h(ix + 1, iy, iz), fx);
  const x1 = THREE.MathUtils.lerp(h(ix, iy + 1, iz), h(ix + 1, iy + 1, iz), fx);
  const x2 = THREE.MathUtils.lerp(h(ix, iy, iz + 1), h(ix + 1, iy, iz + 1), fx);
  const x3 = THREE.MathUtils.lerp(h(ix, iy + 1, iz + 1), h(ix + 1, iy + 1, iz + 1), fx);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(x0, x1, fy),
    THREE.MathUtils.lerp(x2, x3, fy),
    fz,
  );
}

function ecology(p: THREE.Vector3) {
  let value = 0;
  let amp = 0.55;
  let freq = 1.65;
  let angle = 0.73;
  let x = p.x;
  let y = p.y;
  let z = p.z;
  for (let i = 0; i < 4; i++) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const rx = x * c - z * s;
    const rz = x * s + z * c;
    value += amp * noise3(rx * freq, y * freq, rz * freq);
    freq *= 2.13;
    amp *= 0.48;
    angle += 1.07;
    x = rx;
    z = rz;
  }
  return THREE.MathUtils.clamp(value * 0.92, 0, 1);
}

function fibonacci(count: number) {
  const points: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(count - 1, 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    points.push(new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius));
  }
  return points;
}

export type FlowerPlacement = {
  dir: THREE.Vector3;
  species: number;
  variant: number;
  scale: number;
  height: number;
  lean: number;
  curve: number;
  angle: number;
  phase: number;
  stemMatrix: THREE.Matrix4;
  headMatrix: THREE.Matrix4;
};

export type GrassPlacement = {
  matrix: THREE.Matrix4;
  phase: number;
};

function radialBasis(dir: THREE.Vector3) {
  const quat = new THREE.Quaternion().setFromUnitVectors(Y_UP, dir);
  return quat;
}

export function placeFlowers(): FlowerPlacement[] {
  const dummy = new THREE.Object3D();
  const tip = new THREE.Vector3();
  const almost = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const flowers: FlowerPlacement[] = [];

  fibonacci(FLOWER_CANDIDATES).forEach((dir, id) => {
    const patch = ecology(dir);
    const jitter = hash01(id * 131 + SEED);
    if (patch + jitter * 0.14 < 1 - DENSITY) return;

    const species = speciesFor(id);
    const scale = flowerScale(id, species);
    const vigor = THREE.MathUtils.lerp(0.68, 1, hash01(id * 101 + SEED));
    const terminal = species === 4 || species === 5 ? 0.84 : 1;
    const height = THREE.MathUtils.lerp(1.12, 1.48, vigor) * terminal * scale * SIZE;
    const lean =
      THREE.MathUtils.lerp(0.12, 0.62, hash01(id * 103 + SEED) ** 0.72) *
      THREE.MathUtils.lerp(0.72, 1.05, vigor) *
      scale *
      SIZE;
    const curve = THREE.MathUtils.lerp(1.72, 2.48, hash01(id * 107 + SEED));
    const angle = hash01(id * 109 + SEED) * Math.PI * 2;
    const phase = hash01(id * 113 + SEED) * Math.PI * 2;
    const quat = radialBasis(dir);

    dummy.position.copy(dir).multiplyScalar(PLANET_RADIUS);
    dummy.quaternion.copy(quat);
    dummy.scale.set(1, height, 1);
    dummy.updateMatrix();
    const stemMatrix = dummy.matrix.clone();

    const leanX = Math.cos(angle) * lean;
    const leanZ = Math.sin(angle) * lean;
    const alongHead = 0.96;
    tip.set(leanX * alongHead ** curve, height * alongHead, leanZ * alongHead ** curve);
    almost.set(
      leanX * 0.88 ** curve,
      height * 0.88,
      leanZ * 0.88 ** curve,
    );
    tip.applyQuaternion(quat);
    almost.applyQuaternion(quat);
    tangent.copy(tip).sub(almost).normalize();
    dummy.position.copy(dir).multiplyScalar(PLANET_RADIUS).add(tip);
    dummy.quaternion.setFromUnitVectors(Y_UP, tangent);
    dummy.rotateY(hash01(id * 127 + SEED) * Math.PI * 2);
    dummy.scale.setScalar(scale * SIZE);
    dummy.updateMatrix();

    flowers.push({
      dir,
      species,
      variant: variantFor(id),
      scale,
      height,
      lean,
      curve,
      angle,
      phase,
      stemMatrix,
      headMatrix: dummy.matrix.clone(),
    });
  });

  return flowers;
}

export function placeGrass(): GrassPlacement[] {
  const dummy = new THREE.Object3D();
  const blades: GrassPlacement[] = [];

  fibonacci(GRASS_CANDIDATES).forEach((dir, id) => {
    const patch = ecology(dir);
    if (patch < 0.28) return;
    const scale = THREE.MathUtils.lerp(0.7, 1.35, hash01(id * 151 + SEED));
    const height = THREE.MathUtils.lerp(0.035, 0.08, hash01(id * 157 + SEED)) * scale;
    dummy.position.copy(dir).multiplyScalar(PLANET_RADIUS);
    dummy.quaternion.setFromUnitVectors(Y_UP, dir);
    dummy.rotateY(hash01(id * 163 + SEED) * Math.PI * 2);
    dummy.scale.set(scale * 0.85, height, scale * 0.85);
    dummy.updateMatrix();
    blades.push({
      matrix: dummy.matrix.clone(),
      phase: hash01(id * 167 + SEED) * Math.PI * 2,
    });
  });

  return blades;
}
