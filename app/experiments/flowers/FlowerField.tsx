'use client';

import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';
import { makeBladeGeometry, makeHeadGeometry, makeStemGeometry } from './geometry';
import {
  PETAL_COUNTS,
  WIND,
  placeFlowers,
  placeGrass,
  type FlowerPlacement,
} from './placement';

// Painted petal atlas & species mix follow Inkwell's MIT flower field.
// Lambert is the planet's lighting model — CSM keeps the meadow on those same scene lights.

const WIND_GLSL = /* glsl */ `
vec3 windOffset(float phase, float along, float amount) {
  vec3 axisX = normalize(instanceMatrix[0].xyz);
  vec3 axisY = normalize(instanceMatrix[1].xyz);
  vec3 axisZ = normalize(instanceMatrix[2].xyz);
  vec3 windWorld = vec3(0.72, 0.0, 0.18);
  vec3 tangentWind = normalize(windWorld - axisY * dot(windWorld, axisY));
  float gust = sin(uTime * 1.1 + phase) + sin(uTime * 0.63 + phase * 0.4) * 0.32;
  return vec3(dot(tangentWind, axisX), 0.0, dot(tangentWind, axisZ)) * gust * uWind * amount * along * along;
}
`;

const STEM_VERT = /* glsl */ `
  attribute float aPhase;
  attribute float aLean;
  attribute float aCurve;
  attribute float aAngle;

  uniform float uTime;
  uniform float uWind;

  varying float vAlong;

  ${WIND_GLSL}

  void main() {
    vAlong = position.y;
    float leanAmt = aLean * pow(max(vAlong, 0.0), aCurve);
    vec3 local = position + vec3(cos(aAngle) * leanAmt, 0.0, sin(aAngle) * leanAmt);
    csm_Position = local + windOffset(aPhase, vAlong, 0.12);
  }
`;

const STEM_FRAG = /* glsl */ `
  varying float vAlong;

  void main() {
    vec3 albedo = vec3(0.22, 0.41, 0.08) * mix(0.7, 0.88, vAlong);
    csm_DiffuseColor = vec4(albedo, 1.0);
  }
`;

const HEAD_VERT = /* glsl */ `
  attribute float aPhase;
  attribute float aVariant;
  attribute float aSpecies;
  attribute float aPart;

  uniform float uTime;
  uniform float uWind;

  varying vec2 vUv;
  varying float vPart;
  varying float vVariant;
  varying float vSpecies;

  ${WIND_GLSL}

  void main() {
    vUv = uv;
    vPart = aPart;
    vVariant = aVariant;
    vSpecies = aSpecies;
    csm_Position = position + windOffset(aPhase, 1.0, 0.12);
  }
`;

const HEAD_FRAG = /* glsl */ `
  uniform sampler2D uAtlas;

  varying vec2 vUv;
  varying float vPart;
  varying float vVariant;
  varying float vSpecies;

  void main() {
    if (vPart > 0.5) {
      csm_DiffuseColor = vec4(0.72, 0.43, 0.055, 1.0);
      return;
    }
    float pad = 0.07;
    vec2 local = vec2(pad + vUv.x * (1.0 - 2.0 * pad), pad + vUv.y * (1.0 - 2.0 * pad));
    vec2 atlasUv = vec2(
      (vSpecies + local.x) / 8.0,
      (4.0 - vVariant + local.y) / 5.0
    );
    vec4 petal = texture2D(uAtlas, atlasUv);
    if (petal.a < 0.18) discard;
    csm_DiffuseColor = vec4(petal.rgb, 1.0);
  }
`;

const GRASS_VERT = /* glsl */ `
  attribute float aPhase;
  uniform float uTime;
  uniform float uWind;
  varying float vAlong;

  ${WIND_GLSL}

  void main() {
    vAlong = uv.y;
    csm_Position = position + windOffset(aPhase, vAlong, 0.1);
  }
`;

const GRASS_FRAG = /* glsl */ `
  varying float vAlong;

  void main() {
    vec3 albedo = mix(vec3(0.16, 0.34, 0.05), vec3(0.28, 0.5, 0.12), vAlong);
    csm_DiffuseColor = vec4(albedo, 1.0);
  }
`;

function setInstanceAttr(geo: THREE.BufferGeometry, name: string, data: Float32Array) {
  geo.setAttribute(name, new THREE.InstancedBufferAttribute(data, 1));
}

function fillStemAttributes(mesh: THREE.InstancedMesh, flowers: FlowerPlacement[]) {
  const phase = new Float32Array(flowers.length);
  const lean = new Float32Array(flowers.length);
  const curve = new Float32Array(flowers.length);
  const angle = new Float32Array(flowers.length);
  flowers.forEach((flower, i) => {
    mesh.setMatrixAt(i, flower.stemMatrix);
    phase[i] = flower.phase;
    lean[i] = flower.lean;
    curve[i] = flower.curve;
    angle[i] = flower.angle;
  });
  mesh.instanceMatrix.needsUpdate = true;
  setInstanceAttr(mesh.geometry, 'aPhase', phase);
  setInstanceAttr(mesh.geometry, 'aLean', lean);
  setInstanceAttr(mesh.geometry, 'aCurve', curve);
  setInstanceAttr(mesh.geometry, 'aAngle', angle);
}

function FlowerHeads({
  flowers,
  uniforms,
}: {
  flowers: FlowerPlacement[];
  uniforms: { uTime: { value: number }; uWind: { value: number } };
}) {
  const atlas = useTexture('/experiments/flowers/petals.webp');
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 8;
  atlas.needsUpdate = true;

  const groups = useMemo(() => {
    const buckets: FlowerPlacement[][] = Array.from({ length: 8 }, () => []);
    flowers.forEach((flower) => buckets[flower.species].push(flower));
    return buckets;
  }, [flowers]);

  return (
    <>
      {groups.map((group, species) =>
        group.length === 0 ? null : (
          <SpeciesHeads
            key={species}
            species={species}
            flowers={group}
            atlas={atlas}
            uniforms={uniforms}
          />
        ),
      )}
    </>
  );
}

function SpeciesHeads({
  species,
  flowers,
  atlas,
  uniforms,
}: {
  species: number;
  flowers: FlowerPlacement[];
  atlas: THREE.Texture;
  uniforms: { uTime: { value: number }; uWind: { value: number } };
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(
    () => makeHeadGeometry(species, PETAL_COUNTS[species] ?? 8),
    [species],
  );

  const headUniforms = useMemo(
    () => ({
      uTime: uniforms.uTime,
      uWind: uniforms.uWind,
      uAtlas: { value: atlas },
    }),
    [atlas, uniforms],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const phase = new Float32Array(flowers.length);
    const variant = new Float32Array(flowers.length);
    const speciesAttr = new Float32Array(flowers.length);
    flowers.forEach((flower, i) => {
      mesh.setMatrixAt(i, flower.headMatrix);
      phase[i] = flower.phase;
      variant[i] = flower.variant;
      speciesAttr[i] = flower.species;
    });
    mesh.instanceMatrix.needsUpdate = true;
    setInstanceAttr(mesh.geometry, 'aPhase', phase);
    setInstanceAttr(mesh.geometry, 'aVariant', variant);
    setInstanceAttr(mesh.geometry, 'aSpecies', speciesAttr);
  }, [flowers]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, undefined, flowers.length]}
      frustumCulled={false}
    >
      <CustomShaderMaterial
        baseMaterial={THREE.MeshLambertMaterial}
        vertexShader={HEAD_VERT}
        fragmentShader={HEAD_FRAG}
        uniforms={headUniforms}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

export function FlowerField() {
  const stemRef = useRef<THREE.InstancedMesh>(null);
  const grassRef = useRef<THREE.InstancedMesh>(null);
  const flowers = useMemo(() => placeFlowers(), []);
  const grass = useMemo(() => placeGrass(), []);
  const stemGeo = useMemo(() => makeStemGeometry(), []);
  const bladeGeo = useMemo(() => makeBladeGeometry(), []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWind: { value: WIND },
    }),
    [],
  );

  useLayoutEffect(() => {
    const mesh = stemRef.current;
    if (!mesh) return;
    fillStemAttributes(mesh, flowers);
  }, [flowers]);

  useLayoutEffect(() => {
    const mesh = grassRef.current;
    if (!mesh) return;
    const phase = new Float32Array(grass.length);
    grass.forEach((blade, i) => {
      mesh.setMatrixAt(i, blade.matrix);
      phase[i] = blade.phase;
    });
    mesh.instanceMatrix.needsUpdate = true;
    setInstanceAttr(mesh.geometry, 'aPhase', phase);
  }, [grass]);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.getElapsedTime();
  });

  return (
    <group>
      <instancedMesh
        ref={stemRef}
        args={[stemGeo, undefined, flowers.length]}
        frustumCulled={false}
      >
        <CustomShaderMaterial
          baseMaterial={THREE.MeshLambertMaterial}
          vertexShader={STEM_VERT}
          fragmentShader={STEM_FRAG}
          uniforms={uniforms}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
      <instancedMesh
        ref={grassRef}
        args={[bladeGeo, undefined, grass.length]}
        frustumCulled={false}
      >
        <CustomShaderMaterial
          baseMaterial={THREE.MeshLambertMaterial}
          vertexShader={GRASS_VERT}
          fragmentShader={GRASS_FRAG}
          uniforms={uniforms}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
      <FlowerHeads flowers={flowers} uniforms={uniforms} />
    </group>
  );
}
