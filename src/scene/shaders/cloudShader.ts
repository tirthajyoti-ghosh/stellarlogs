/**
 * Thin cloud shell for terrestrial planets. Coverage is pre-baked into an
 * equirect alpha texture; the live shader samples it with a slow longitude
 * drift (clouds move relative to the surface) and lights it by the sun.
 */
export const cloudVertex = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
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

uniform sampler2D uMap;
uniform float uTime;
uniform vec3 uSunPosition;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  #include <logdepthbuf_fragment>

  float alpha = texture2D(uMap, vec2(vUv.x + uTime * 0.0016, vUv.y)).a;

  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uSunPosition - vWorldPos);
  float dayside = smoothstep(-0.18, 0.35, dot(N, L));

  vec3 color = vec3(1.0) * mix(0.02, 1.1, dayside);
  gl_FragColor = vec4(color, alpha * 0.85);
  #include <colorspace_fragment>
}
`
