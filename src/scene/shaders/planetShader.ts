import { NOISE_GLSL } from './noiseGlsl'

/**
 * One shader covers every planet archetype; `uMode` selects the surface
 * pattern. Lit by a single sun position with soft wrap lighting, night side
 * falls to near-black, plus a sun-lit fresnel atmosphere rim.
 *
 * Modes: 0 gas giant · 1 lava · 2 ice · 3 terrestrial wet · 4 terrestrial dry
 * · 5 barren
 */
export const planetVertex = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vLocalPos;

void main() {
  vLocalPos = position;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
  #include <logdepthbuf_vertex>
}
`

export const planetFragment = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>

uniform float uTime;
uniform vec3 uSunPosition;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform vec3 uAtmosphereColor;
uniform vec3 uEmissiveColor;
uniform float uEmissiveStrength;
uniform float uNoiseScale;
uniform float uSeed;
uniform int uMode;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vLocalPos;

${NOISE_GLSL}

void main() {
  #include <logdepthbuf_fragment>

  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uSunPosition - vWorldPos);
  vec3 p = normalize(vLocalPos) * uNoiseScale + vec3(uSeed * 17.31);

  vec3 surface = vec3(0.0);
  vec3 emissive = vec3(0.0);
  float oceanMask = 0.0;

  if (uMode == 0) {
    // Gas giant: crisp turbulent latitude bands with storm streaks
    float lat = normalize(vLocalPos).y;
    float turb = fbm(p * 1.6 + vec3(0.0, uTime * 0.008, 0.0)) * 0.55;
    float streaks = fbm(vec3(p.x * 3.0, lat * 24.0, p.z * 3.0)) * 0.3;
    float bands = sin((lat + turb * 0.28 + streaks * 0.1) * 14.0 + uSeed);
    float crisp = smoothstep(-0.6, 0.6, bands);
    float bands2 = sin((lat + turb * 0.45) * 5.0 - uSeed * 2.0);
    vec3 base = mix(uColorA, uColorB, crisp);
    surface = mix(base, uColorC, smoothstep(0.3, 0.95, bands2) * 0.55);
    // Pale storm ovals
    float storm = smoothstep(0.55, 0.8, fbm(p * 2.6 + vec3(uSeed * 5.0)));
    surface = mix(surface, uColorA * 1.25, storm * 0.5);
    surface += turb * 0.1;
  } else if (uMode == 1) {
    // Lava: dark crust with glowing ridged cracks
    float crust = fbm(p * 1.8);
    float cracks = pow(ridgedFbm(p * 2.6 + vec3(uTime * 0.004)), 3.2);
    surface = mix(uColorA, uColorB, crust * 0.5 + 0.5) * 0.55;
    emissive = uEmissiveColor * cracks * uEmissiveStrength;
  } else if (uMode == 2) {
    // Ice: pale marbled sheets with frozen fissures
    float sheets = fbm(p * 2.2);
    float fissures = smoothstep(0.55, 0.85, ridgedFbm(p * 3.5));
    surface = mix(uColorA, uColorB, sheets * 0.5 + 0.5);
    surface = mix(surface, uColorC, fissures * 0.6);
  } else if (uMode == 3) {
    // Terrestrial wet: oceans, continents, polar caps
    float continents = fbm(p * 1.5);
    float detail = fbm(p * 6.0) * 0.15;
    float landMask = smoothstep(0.02, 0.12, continents + detail);
    oceanMask = 1.0 - landMask;
    // Shallows brighten toward the coastline
    vec3 ocean = mix(uColorA * 0.6, uColorA * 1.25, smoothstep(-0.35, 0.1, continents + detail));
    vec3 land = mix(uColorB, uColorC, smoothstep(0.15, 0.5, continents + detail));
    surface = mix(ocean, land, landMask);
    float polar = smoothstep(0.72, 0.85, abs(normalize(vLocalPos).y) + detail);
    surface = mix(surface, vec3(0.93, 0.96, 1.0), polar);
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

  // Soft wrap lighting with a gentle terminator; punchy day side
  float ndl = dot(N, L);
  float dayside = smoothstep(-0.18, 0.35, ndl);
  vec3 lit = surface * mix(0.015, 1.35, dayside);
  // Mild saturation lift
  float luma = dot(lit, vec3(0.299, 0.587, 0.114));
  lit = mix(vec3(luma), lit, 1.18);

  // Sun glint on open water
  if (oceanMask > 0.0) {
    vec3 R = reflect(-L, N);
    float spec = pow(max(dot(R, V), 0.0), 110.0);
    lit += vec3(1.0, 0.95, 0.85) * spec * oceanMask * dayside * 1.4;
  }

  // Sun-side atmosphere rim
  float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
  lit += uAtmosphereColor * fresnel * (0.25 + 0.75 * dayside);

  lit += emissive;

  gl_FragColor = vec4(lit, 1.0);
  #include <colorspace_fragment>
}
`
