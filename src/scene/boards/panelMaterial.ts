import { Color, ShaderMaterial, Vector2, Vector3 } from 'three'
import { getPlateMaps } from './panelTexture'

/**
 * The board face, lit the way light actually works — by its own three lamps.
 *
 * The painted approach failed twice: painted light blows out, painted shadow
 * reads as dirt (Tirtha, on the second attempt: "it does not look like
 * anything"). The reason both failed is that the two cues a brain uses to
 * decide "light is falling on that" cannot be painted, because both change
 * per frame:
 *
 *   · GRAZING RESPONSE — lamps at the top edge hit the plate at a shallow
 *     angle, so every rivet, seam and dent throws its own micro-shading.
 *     That needs a normal map and a real N·L per pixel.
 *   · MOVING SHEEN — a semi-gloss plate shows a broad specular bloom under
 *     each lamp that slides across the surface as the viewer moves. That
 *     needs the view vector, which a texture does not have.
 *
 * So this material computes three little spot lights analytically, per pixel,
 * in the shader — diffuse with inverse-square falloff, a soft cone, Blinn
 * specular — for lamps whose positions are FIXED in the board's local frame.
 * No scene lights are involved: the 102-point-light catastrophe this replaced
 * (18.4 ms/frame) stays dead, and the whole face is one draw call where the
 * painted version needed three.
 *
 * Deliberately not there: shadows (nothing stands between the lamps and the
 * plate) and volumetric beams (vacuum — nothing to scatter in; you see
 * fixtures and lit metal, not cones).
 *
 * Cost: 3 unrolled lamp evaluations, two texture reads. All boards share one
 * program; only the uniforms differ.
 */

const vertexShader = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>

  uniform vec3 uLamp0;
  uniform vec3 uLamp1;
  uniform vec3 uLamp2;
  uniform vec3 uLampAxis;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vN;
  varying vec3 vT;
  varying vec3 vB;
  varying vec3 vL0;
  varying vec3 vL1;
  varying vec3 vL2;
  varying vec3 vAxisW;

  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;

    // The face is a plane in local XY facing +Z, so its tangent frame is the
    // model axes — normalize strips the parent's reveal scaling.
    vN = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
    vT = normalize(mat3(modelMatrix) * vec3(1.0, 0.0, 0.0));
    vB = normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0));

    // Lamp positions ride the board: local -> world once per vertex, constant
    // across the face, so the fragment shader never needs the model matrix.
    vL0 = (modelMatrix * vec4(uLamp0, 1.0)).xyz;
    vL1 = (modelMatrix * vec4(uLamp1, 1.0)).xyz;
    vL2 = (modelMatrix * vec4(uLamp2, 1.0)).xyz;
    vAxisW = normalize(mat3(modelMatrix) * uLampAxis);

    gl_Position = projectionMatrix * viewMatrix * wp;
    #include <logdepthbuf_vertex>
  }
`

const fragmentShader = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>

  uniform sampler2D uMap;
  uniform sampler2D uNormalMap;
  uniform vec2 uRepeat;
  uniform vec3 uAmbient;
  uniform vec3 uLampColor;
  uniform float uFalloff;
  uniform float uSpec;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vN;
  varying vec3 vT;
  varying vec3 vB;
  varying vec3 vL0;
  varying vec3 vL1;
  varying vec3 vL2;
  varying vec3 vAxisW;

  vec3 lamp(vec3 lampPos, float intensity, vec3 N, vec3 V, vec3 albedo, float gloss) {
    vec3 Ld = lampPos - vWorldPos;
    float d2 = dot(Ld, Ld);
    vec3 L = Ld * inversesqrt(d2);
    // inverse-square, scaled to the board so the bottom sits near 15% of the top
    float atten = 1.0 / (1.0 + uFalloff * d2);
    // the lamp's own beam spread — a wide floodlight cone, soft-edged
    float spot = smoothstep(0.28, 0.72, dot(-L, vAxisW));
    float ndl = max(dot(N, L), 0.0);
    // Blinn specular: the sheen that slides over the plate as you fly past
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 34.0) * uSpec * gloss;
    return uLampColor * (intensity * atten * spot) * (albedo * ndl + vec3(spec));
  }

  void main() {
    #include <logdepthbuf_fragment>
    vec2 uv = vUv * uRepeat;
    vec3 albedo = texture2D(uMap, uv).rgb;
    vec3 nm = texture2D(uNormalMap, uv).xyz * 2.0 - 1.0;
    vec3 N = normalize(vT * nm.x + vB * nm.y + vN * nm.z);
    vec3 V = normalize(cameraPosition - vWorldPos);
    // grime is matte, bare metal is glossier — cheap read off the albedo
    float gloss = 0.35 + 0.9 * albedo.b;

    vec3 col = uAmbient * albedo;
    col += lamp(vL0, 2.1, N, V, albedo, gloss);
    col += lamp(vL1, 2.5, N, V, albedo, gloss);
    col += lamp(vL2, 1.9, N, V, albedo, gloss);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/** Lamp geometry shared with the visible rig in Billboard.tsx — one source of
 *  truth for where the light comes from, so fixtures and shading agree. */
export function lampLayout(width: number, height: number) {
  const y = height / 2 + 2.6
  const z = 3.5
  return {
    positions: [
      new Vector3(-width * 0.34, y, z),
      new Vector3(0, y, z),
      new Vector3(width * 0.34, y, z),
    ] as const,
    /** aim: from the lamps toward a point just below mid-face */
    axis: new Vector3(0, -(height * 0.6 + 2.6), -3.1).normalize(),
    /** rotation-x that points a +Z-facing lamp head along that axis */
    tilt: Math.atan2(height * 0.6 + 2.6, -3.1),
  }
}

export function createPanelMaterial(width: number, height: number): ShaderMaterial {
  const { map, normalMap } = getPlateMaps()
  const lamps = lampLayout(width, height)
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uMap: { value: map },
      uNormalMap: { value: normalMap },
      // plate cells stay a constant physical size regardless of board size
      uRepeat: { value: new Vector2(width / 76, height / 76) },
      uLamp0: { value: lamps.positions[0] },
      uLamp1: { value: lamps.positions[1] },
      uLamp2: { value: lamps.positions[2] },
      uLampAxis: { value: lamps.axis },
      // bottom of the board lands near 15% of the light at the top
      uFalloff: { value: 5.5 / (height * height + 1) },
      uLampColor: { value: new Color(1.0, 0.93, 0.8) },
      // starlight + nebula: unlit is dark, never void
      uAmbient: { value: new Color(0.035, 0.045, 0.07) },
      uSpec: { value: 0.5 },
    },
  })
}
