import { NOISE_GLSL } from './noiseGlsl'

/**
 * One-time equirect surface bake. Renders a planet's procedural surface into
 * a render target so the live material becomes a cheap texture lookup — the
 * expensive per-pixel fbm runs exactly once per planet instead of every frame.
 *
 * Output: rgb = unlit surface albedo, a = mode-specific mask
 * (mode 1 lava → glowing-crack mask, mode 3 wet → ocean mask, else 0).
 *
 * The uv→direction mapping matches THREE.SphereGeometry's uv layout so the
 * live shader can sample with the sphere's own uvs (no seam artifacts).
 */
export const bakeVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const planetBakeFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uNoiseScale;
uniform float uSeed;
uniform int uMode;

varying vec2 vUv;

${NOISE_GLSL}

void main() {
  // Invert SphereGeometry's uv convention back to a unit direction
  float phi = vUv.x * 6.28318530718;
  float theta = (1.0 - vUv.y) * 3.14159265359;
  vec3 dir = vec3(-cos(phi) * sin(theta), cos(theta), sin(phi) * sin(theta));
  vec3 p = dir * uNoiseScale + vec3(uSeed * 17.31);

  vec3 surface = vec3(0.0);
  float mask = 0.0;

  if (uMode == 0) {
    // Gas giant: crisp turbulent latitude bands with storm streaks
    float lat = dir.y;
    float turb = fbm(p * 1.6) * 0.55;
    float streaks = fbm(vec3(p.x * 3.0, lat * 24.0, p.z * 3.0)) * 0.3;
    float bands = sin((lat + turb * 0.28 + streaks * 0.1) * 14.0 + uSeed);
    float crisp = smoothstep(-0.6, 0.6, bands);
    float bands2 = sin((lat + turb * 0.45) * 5.0 - uSeed * 2.0);
    vec3 base = mix(uColorA, uColorB, crisp);
    surface = mix(base, uColorC, smoothstep(0.3, 0.95, bands2) * 0.55);
    float storm = smoothstep(0.55, 0.8, fbm(p * 2.6 + vec3(uSeed * 5.0)));
    surface = mix(surface, uColorA * 1.25, storm * 0.5);
    surface += turb * 0.1;
  } else if (uMode == 1) {
    // Lava: dark crust; crack mask goes to alpha for live emissive
    float crust = fbm(p * 1.8);
    float cracks = pow(ridgedFbm(p * 2.6), 3.2);
    surface = mix(uColorA, uColorB, crust * 0.5 + 0.5) * 0.55;
    mask = cracks;
  } else if (uMode == 2) {
    // Ice: pale marbled sheets with frozen fissures
    float sheets = fbm(p * 2.2);
    float fissures = smoothstep(0.55, 0.85, ridgedFbm(p * 3.5));
    surface = mix(uColorA, uColorB, sheets * 0.5 + 0.5);
    surface = mix(surface, uColorC, fissures * 0.6);
  } else if (uMode == 3) {
    // Terrestrial wet: oceans, continents, polar caps; ocean mask to alpha
    float continents = fbm(p * 1.5);
    float detail = fbm(p * 6.0) * 0.15;
    float landMask = smoothstep(0.02, 0.12, continents + detail);
    mask = 1.0 - landMask;
    vec3 ocean = mix(uColorA * 0.6, uColorA * 1.25, smoothstep(-0.35, 0.1, continents + detail));
    vec3 land = mix(uColorB, uColorC, smoothstep(0.15, 0.5, continents + detail));
    surface = mix(ocean, land, landMask);
    float polar = smoothstep(0.72, 0.85, abs(dir.y) + detail);
    surface = mix(surface, vec3(0.93, 0.96, 1.0), polar);
    mask *= 1.0 - polar;
  } else if (uMode == 4) {
    // Terrestrial dry: dunes and canyons
    float dunes = fbm(p * 2.0);
    float canyons = ridgedFbm(p * 3.2);
    surface = mix(uColorA, uColorB, dunes * 0.5 + 0.5);
    surface = mix(surface, uColorC, smoothstep(0.6, 0.9, canyons) * 0.5);
  } else {
    // Barren: cratered gray rock
    float rock = fbm(p * 2.4);
    float craters = smoothstep(0.45, 0.75, ridgedFbm(p * 4.0));
    surface = mix(uColorA, uColorB, rock * 0.5 + 0.5);
    surface *= 1.0 - craters * 0.35;
  }

  gl_FragColor = vec4(surface, mask);
}
`

export const cloudBakeFragment = /* glsl */ `
uniform float uSeed;

varying vec2 vUv;

${NOISE_GLSL}

void main() {
  float phi = vUv.x * 6.28318530718;
  float theta = (1.0 - vUv.y) * 3.14159265359;
  vec3 dir = vec3(-cos(phi) * sin(theta), cos(theta), sin(phi) * sin(theta));
  vec3 p = dir * 3.4 + vec3(uSeed * 11.0);

  float cover = fbm(p);
  float wisps = fbm(p * 2.8) * 0.4;
  float alpha = smoothstep(0.08, 0.55, cover + wisps);

  gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
}
`
