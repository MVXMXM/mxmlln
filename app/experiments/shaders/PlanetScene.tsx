'use client';

import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';
import type CustomShaderMaterialType from 'three-custom-shader-material/vanilla';
import { Stage } from './Stage';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float u_time;
  uniform float u_lacunarity;
  uniform float u_gain;
  uniform vec3 u_colorA;
  uniform vec3 u_colorB;
  uniform vec3 u_cloudTint;
  uniform vec3 u_depthA;
  uniform vec3 u_depthB;
  uniform float u_depthAlpha;
  uniform float u_depthNear;
  uniform float u_depthFar;
  uniform vec3 u_fresnelColor;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
  }

  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }

  vec2 fade(vec2 t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  }

  float cnoise(vec2 P) {
    vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
    vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
    Pi = mod289(Pi);
    vec4 ix = Pi.xzxz;
    vec4 iy = Pi.yyww;
    vec4 fx = Pf.xzxz;
    vec4 fy = Pf.yyww;

    vec4 i = permute(permute(ix) + iy);

    vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
    vec4 gy = abs(gx) - 0.5;
    vec4 tx = floor(gx + 0.5);
    gx = gx - tx;

    vec2 g00 = vec2(gx.x, gy.x);
    vec2 g10 = vec2(gx.y, gy.y);
    vec2 g01 = vec2(gx.z, gy.z);
    vec2 g11 = vec2(gx.w, gy.w);

    vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
    g00 *= norm.x;
    g01 *= norm.y;
    g10 *= norm.z;
    g11 *= norm.w;

    float n00 = dot(g00, vec2(fx.x, fy.x));
    float n10 = dot(g10, vec2(fx.y, fy.y));
    float n01 = dot(g01, vec2(fx.z, fy.z));
    float n11 = dot(g11, vec2(fx.w, fy.w));

    vec2 fade_xy = fade(Pf.xy);
    vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
    float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
    return 2.3 * n_xy;
  }

  float fbm(vec2 st) {
    const int OCTAVES = 5;
    float value = 0.0;
    float amplitude = 0.6;
    for (int i = 0; i < OCTAVES; i++) {
      value += amplitude * abs(cnoise(st));
      st *= u_lacunarity;
      amplitude *= u_gain;
    }
    return value;
  }

  void main() {
    vec2 st = vUv * 0.250;
    float f_time = u_time * 0.1;

    vec2 q = vec2(0.0);
    q.x = fbm(st + 0.00 * f_time);
    q.y = fbm(st + vec2(1.0));

    vec2 r = vec2(0.0);
    r.x = fbm(st + 1.0 * q + vec2(1.7, 9.2) + 0.15 * f_time);
    r.y = fbm(st + 1.0 * q + vec2(8.3, 2.8) + 0.126 * f_time);

    float f = fbm(st + r);

    vec3 color = mix(u_colorA, u_colorB, clamp((f * f) * 4.0, 0.0, 1.0));
    color = mix(color, u_cloudTint, clamp(length(q), 0.0, 1.0));
    color *= mix(color, u_colorA, clamp(length(r.x), 0.0, 1.0));

    float dist = length(vWorldPosition);
    float depth = (dist - u_depthNear) / (u_depthFar - u_depthNear);
    vec3 depthColor = mix(u_depthB, u_depthA, 1.0 - clamp(depth, 0.0, 1.0));
    color += depthColor * u_depthAlpha;

    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(normalize(vWorldNormal), viewDir), 0.0), 2.0);
    color += fresnel * u_fresnelColor;

    csm_DiffuseColor = vec4(color, 1.0);
  }
`;

export function Planet() {
  const materialRef = useRef<CustomShaderMaterialType<typeof THREE.MeshLambertMaterial>>(null);

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_lacunarity: { value: 2.3 },
      u_gain: { value: 0.5 },
      u_colorA: { value: new THREE.Color('#124dd8') },
      u_colorB: { value: new THREE.Color('#2bffe7') },
      u_cloudTint: { value: new THREE.Color('#001741') },
      u_depthA: { value: new THREE.Color('blue') },
      u_depthB: { value: new THREE.Color('aqua') },
      u_depthAlpha: { value: 0.9 },
      u_depthNear: { value: 2 },
      u_depthFar: { value: 10 },
      u_fresnelColor: { value: new THREE.Color('#FEB3D9') },
    }),
    [],
  );

  useFrame((state) => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.u_time.value = state.clock.getElapsedTime();
  });

  return (
    <mesh position={[0, 0, 0]} rotation={[0, Math.PI, 0]} scale={1.5}>
      <icosahedronGeometry args={[2, 11]} />
      <CustomShaderMaterial
        ref={materialRef}
        baseMaterial={THREE.MeshLambertMaterial}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export default function PlanetScene() {
  return (
    <Stage camera={{ position: [0.0, 0.0, 8.0] }}>
      <ambientLight intensity={0.03} />
      <directionalLight position={[0.3, 0.15, 0.0]} intensity={2} />
      <Planet />
      <OrbitControls />
    </Stage>
  );
}
