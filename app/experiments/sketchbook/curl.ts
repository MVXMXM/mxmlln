export const PAPER = '#eeede9';

export const FLIP = {
  flickVelocity: 0.11,
  segments: [64, 32] as const,
  rollRadius: 0.16,
  ambient: 0.78,
  specular: 0.035,
  airShowThrough: 0.26,
  shadow: 0.32,
};

export const CURL_VERTEX = /* glsl */ `
uniform vec2 uAxisA;
uniform vec2 uAxisM;
uniform float uRadius;
uniform float uFlip;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vLift;

const float PI = 3.141592653589793;

vec3 deform(vec2 p) {
  float d = dot(p - uAxisA, uAxisM);
  float r = uRadius;
  vec3 q;

  if (d <= 0.0) {
    q = vec3(p, 0.0);
  } else if (r < 1.0) {
    q = vec3(p - uAxisM * (2.0 * d), 2.0 * r);
  } else if (d < PI * r) {
    float phi = d / r;
    q = vec3(p - uAxisM * d + uAxisM * (r * sin(phi)), r * (1.0 - cos(phi)));
  } else {
    q = vec3(p - uAxisM * (2.0 * d - PI * r), 2.0 * r);
  }

  return vec3(uFlip * q.x, q.y, q.z);
}

void main() {
  vUv = uv;
  const float EPS = 0.75;
  vec3 p0 = deform(position.xy);
  vLift = p0.z;
  vec3 px = deform(position.xy + vec2(EPS, 0.0));
  vec3 py = deform(position.xy + vec2(0.0, EPS));
  vNormal = normalize(cross(px - p0, py - p0));
  vec4 world = modelMatrix * vec4(p0, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const CURL_FRAGMENT = /* glsl */ `
uniform sampler2D uFrontMap;
uniform sampler2D uBackMap;
uniform sampler2D uFrontFlat;
uniform sampler2D uBackFlat;
uniform vec3 uLightDir;
uniform vec3 uCamPos;
uniform float uAmbient;
uniform float uSpecular;
uniform float uShowThrough;
uniform float uCurl;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vLift;

const float LIFT_LO = 2.0;
const float LIFT_HI = 115.0;

vec3 softSample(sampler2D map, vec2 uv) {
  vec2 o = vec2(0.007);
  vec3 c = texture2D(map, uv).rgb * 0.25;
  c += texture2D(map, uv + vec2( o.x, 0.0)).rgb * 0.125;
  c += texture2D(map, uv + vec2(-o.x, 0.0)).rgb * 0.125;
  c += texture2D(map, uv + vec2(0.0,  o.y)).rgb * 0.125;
  c += texture2D(map, uv + vec2(0.0, -o.y)).rgb * 0.125;
  c += texture2D(map, uv + o * vec2( 0.7,  0.7)).rgb * 0.0625;
  c += texture2D(map, uv + o * vec2(-0.7,  0.7)).rgb * 0.0625;
  c += texture2D(map, uv + o * vec2( 0.7, -0.7)).rgb * 0.0625;
  c += texture2D(map, uv + o * vec2(-0.7, -0.7)).rgb * 0.0625;
  return c;
}

void main() {
  vec3 n = normalize(vNormal);
  bool showFront = gl_FrontFacing;
  vec2 uv;
  vec4 tex;
  vec4 texFlat;
  vec3 otherRgb;

  if (showFront) {
    uv = vUv;
    tex = texture2D(uFrontMap, uv);
    texFlat = texture2D(uFrontFlat, uv);
    otherRgb = softSample(uBackMap, vec2(1.0 - uv.x, uv.y));
  } else {
    uv = vec2(1.0 - vUv.x, vUv.y);
    tex = texture2D(uBackMap, uv);
    texFlat = texture2D(uBackFlat, uv);
    otherRgb = softSample(uFrontMap, vec2(1.0 - uv.x, uv.y));
  }
  if (!gl_FrontFacing) n = -n;

  float fadeBaked = uCurl * uCurl * smoothstep(0.0, 0.18, vUv.x);
  tex = mix(tex, texFlat, fadeBaked);

  float liftGate = smoothstep(LIFT_LO, LIFT_HI, vLift);
  tex.rgb *= mix(vec3(1.0), otherRgb, uShowThrough * liftGate);

  float lam = dot(n, uLightDir) * 0.5 + 0.5;
  float flatRef = uLightDir.z * 0.5 + 0.5;
  float shade = (uAmbient + (1.0 - uAmbient) * lam) /
                (uAmbient + (1.0 - uAmbient) * flatRef);
  shade = mix(1.0, shade, 0.4);

  vec3 viewDir = normalize(uCamPos - vWorldPos);
  vec3 halfDir = normalize(uLightDir + viewDir);
  float sheen = uSpecular * uCurl * pow(max(dot(n, halfDir), 0.0), 64.0);

  gl_FragColor = vec4(tex.rgb * shade + vec3(sheen), 1.0);
  #include <colorspace_fragment>
}
`;

export const SHADOW_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const SHADOW_FRAGMENT = /* glsl */ `
uniform float uStrength;
uniform float uRho;
uniform float uFlip;
varying vec2 vUv;

void main() {
  float x = vUv.x - 0.5;
  float side = uFlip * cos(uRho);
  float center = side * 0.12;
  float dist = abs(x - center);
  float lobe = exp(-dist * dist * 55.0);
  lobe *= smoothstep(-0.02, 0.02, x * side);
  float vfade = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
  gl_FragColor = vec4(vec3(0.0), uStrength * lobe * vfade);
}
`;

export function damp(current: number, target: number, smoothTime: number, dt: number) {
  const lambda = 1 - Math.exp(-dt / Math.max(smoothTime, 1e-4));
  return current + (target - current) * lambda;
}

export function flipProgress(pageW: number, fx: number) {
  return Math.max(0, Math.min(1, (pageW - fx) / (2 * pageW)));
}

export function pointerToFlip(
  dir: 'fwd' | 'back',
  spineX: number,
  bottomY: number,
  pageW: number,
  pageH: number,
  clientX: number,
  clientY: number,
) {
  const originX = window.innerWidth / 2 + spineX;
  const originY = window.innerHeight / 2 - bottomY;
  const fxRaw = dir === 'fwd' ? clientX - originX : originX - clientX;
  const fyRaw = originY - clientY;
  return {
    fx: Math.max(-pageW * 1.05, Math.min(pageW * 1.05, fxRaw)),
    fy: Math.max(0, Math.min(pageH, fyRaw)),
  };
}

export function flickVelocity(samples: { x: number; t: number }[]) {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  let first = last;
  for (let i = samples.length - 2; i >= 0; i--) {
    if (last.t - samples[i].t > 100) break;
    first = samples[i];
  }
  const dt = last.t - first.t;
  return dt > 0 ? (last.x - first.x) / dt : 0;
}
