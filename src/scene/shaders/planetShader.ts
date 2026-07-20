/**
 * Live planet material. The expensive procedural surface is pre-baked into an
 * equirect texture (see planetBakeShader.ts) — this shader only samples it and
 * applies lighting: sun wrap lighting, ocean glint (mask in map alpha, mode 3),
 * lava emissive (mask in map alpha, mode 1), and the sun-side atmosphere rim.
 *
 * Modes: 0 gas giant · 1 lava · 2 ice · 3 terrestrial wet · 4 terrestrial dry
 * · 5 barren
 */
export const planetVertex = /* glsl */ `
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

export const planetFragment = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>

uniform sampler2D uMap;
uniform vec3 uSunPosition;
uniform vec3 uAtmosphereColor;
uniform vec3 uEmissiveColor;
uniform float uEmissiveStrength;
uniform int uMode;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  #include <logdepthbuf_fragment>

  vec4 baked = texture2D(uMap, vUv);
  vec3 surface = baked.rgb;
  float mask = baked.a;

  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uSunPosition - vWorldPos);

  // Soft wrap lighting with a gentle terminator; punchy day side
  float ndl = dot(N, L);
  float dayside = smoothstep(-0.18, 0.35, ndl);
  vec3 lit = surface * mix(0.015, 1.35, dayside);
  // Mild saturation lift
  float luma = dot(lit, vec3(0.299, 0.587, 0.114));
  lit = mix(vec3(luma), lit, 1.18);

  // Sun glint on open water
  if (uMode == 3 && mask > 0.0) {
    vec3 R = reflect(-L, N);
    float spec = pow(max(dot(R, V), 0.0), 110.0);
    lit += vec3(1.0, 0.95, 0.85) * spec * mask * dayside * 1.4;
  }

  // Glowing lava cracks
  if (uMode == 1) {
    lit += uEmissiveColor * mask * uEmissiveStrength;
  }

  // Sun-side atmosphere rim
  float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
  lit += uAtmosphereColor * fresnel * (0.25 + 0.75 * dayside);

  gl_FragColor = vec4(lit, 1.0);
  #include <colorspace_fragment>
}
`
