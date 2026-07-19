import { NOISE_GLSL } from './noiseGlsl'

/**
 * Planetary rings: concentric noise bands on a flat annulus, lit by the sun,
 * fading at inner/outer edges. Geometry is a RingGeometry in the XZ plane.
 */
export const ringsVertex = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>

varying vec3 vLocalPos;
varying vec3 vWorldPos;

void main() {
  vLocalPos = position;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
  #include <logdepthbuf_vertex>
}
`

export const ringsFragment = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>

uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uSunPosition;
uniform float uInnerRadius;
uniform float uOuterRadius;
uniform float uSeed;

varying vec3 vLocalPos;
varying vec3 vWorldPos;

${NOISE_GLSL}

void main() {
  #include <logdepthbuf_fragment>

  float r = length(vLocalPos.xy);
  float t = (r - uInnerRadius) / (uOuterRadius - uInnerRadius);

  // Concentric bands from 1D noise over radius
  float bands = fbm(vec3(r * 0.55, uSeed, uSeed * 2.0));
  float fine = snoise(vec3(r * 2.2, uSeed * 3.0, 0.0));
  float density = smoothstep(-0.55, 0.6, bands + fine * 0.25);

  // Edge fades + a Cassini-like gap
  density *= smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.86, 1.0, t));
  density *= 1.0 - smoothstep(0.62, 0.66, t) * (1.0 - smoothstep(0.70, 0.74, t));

  vec3 color = mix(uColorA, uColorB, bands * 0.5 + 0.5);

  // Approximate sun lighting (rings are thin dust — mostly ambient + sun tint)
  vec3 L = normalize(uSunPosition - vWorldPos);
  float facing = abs(L.y) * 0.4 + 0.6;
  color *= facing;

  gl_FragColor = vec4(color, density * 0.85);
  #include <colorspace_fragment>
}
`
