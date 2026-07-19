import { NOISE_GLSL } from './noiseGlsl'

/**
 * Thin cloud shell for terrestrial planets: drifting fbm coverage, lit by the
 * sun, transparent elsewhere.
 */
export const cloudVertex = /* glsl */ `
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

export const cloudFragment = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>

uniform float uTime;
uniform vec3 uSunPosition;
uniform float uSeed;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vLocalPos;

${NOISE_GLSL}

void main() {
  #include <logdepthbuf_fragment>

  vec3 p = normalize(vLocalPos) * 3.4 + vec3(uSeed * 11.0);
  float cover = fbm(p + vec3(uTime * 0.006, 0.0, uTime * 0.004));
  float wisps = fbm(p * 2.8 - vec3(uTime * 0.01, 0.0, 0.0)) * 0.4;
  float alpha = smoothstep(0.08, 0.55, cover + wisps);

  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uSunPosition - vWorldPos);
  float dayside = smoothstep(-0.18, 0.35, dot(N, L));

  vec3 color = vec3(1.0) * mix(0.02, 1.1, dayside);
  gl_FragColor = vec4(color, alpha * 0.85);
  #include <colorspace_fragment>
}
`
