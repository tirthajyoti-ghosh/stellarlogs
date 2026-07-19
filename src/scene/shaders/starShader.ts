import { NOISE_GLSL } from './noiseGlsl'

/**
 * Star surface: animated fbm granulation, white-hot core color blending to
 * the system tint at the limb. Outputs HDR values (>1) so bloom picks it up.
 */
export const starVertex = /* glsl */ `
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

export const starFragment = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>

uniform float uTime;
uniform vec3 uColor;
uniform float uSeed;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vLocalPos;

${NOISE_GLSL}

void main() {
  #include <logdepthbuf_fragment>

  vec3 p = normalize(vLocalPos) * 3.0 + vec3(uSeed * 7.7);
  float granules = fbm(p * 2.5 + vec3(uTime * 0.03));
  float flares = ridgedFbm(p * 1.4 - vec3(uTime * 0.015));

  vec3 hot = vec3(1.0, 0.98, 0.92);
  vec3 base = mix(uColor, hot, 0.3 + granules * 0.22);

  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float facing = clamp(dot(N, V), 0.0, 1.0);
  // White-hot disc center falling off to the tinted limb
  base = mix(base, hot, pow(facing, 2.0) * 0.55);
  float limb = pow(1.0 - facing, 1.4);
  base = mix(base, uColor, limb * 0.85);

  // HDR output: core burns >1 for the bloom pass
  vec3 color = base * (1.35 + granules * 0.25 + flares * 0.18);

  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
`

/** Additive back-side shell that reads as the star's corona glow. */
export const coronaVertex = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>

varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
  #include <logdepthbuf_vertex>
}
`

export const coronaFragment = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>

uniform vec3 uColor;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  #include <logdepthbuf_fragment>

  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  // Back side faces the camera; glow strongest at the silhouette edge
  float rim = pow(clamp(dot(N, V) * -1.0, 0.0, 1.0), 2.4);
  gl_FragColor = vec4(uColor * rim * 1.6, rim);
  #include <colorspace_fragment>
}
`
