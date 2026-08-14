import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
} from 'three'
import { shipRig } from '../state/shipRig'
import { warpBurning } from '../physics/warp'

/**
 * THE DRIVE PLUME (docs/the-plume.md — built frame-by-frame against
 * docs/ref/expanse-plume-*.png). Four layers, one STAGE value
 * (0 idle → 1 cruise → 2 max burn):
 *
 *   MOUTH  — the bell is a LENS: bright annulus at the wall, dark
 *            inner ring, rotating turbine swirl, white core at the
 *            throat that SWALLOWS the disc at max burn.
 *   TONGUE — the short ragged flame off the mouth: white-hot at the
 *            bell fading to blue, hash-noise feathered edges.
 *   BEAM   — the long faint parallel shaft (the far read).
 *   CORONA — a radial-gradient sprite that blooms past the rim and,
 *            at burn, engulfs the stern.
 *
 * The plume is EMITTED light, so painting it is honest; the real
 * pointLight in Ship.tsx keeps casting computed light on nearby hulls.
 * All shaders carry the log-depth chunks (house law).
 */

const LOG_VERT_PARS = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
`
const LOG_FRAG_PARS = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
`

function makeRadialTexture(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(190,225,255,0.85)')
  grad.addColorStop(0.55, 'rgba(110,170,255,0.35)')
  grad.addColorStop(1, 'rgba(60,120,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return new CanvasTexture(c)
}

export function DrivePlume() {
  const stageRef = useRef(0)
  const mouthRef = useRef<Mesh>(null)
  const tongueRef = useRef<Mesh>(null)
  const beamRef = useRef<Mesh>(null)
  const coronaRef = useRef<Sprite>(null)

  const mouthMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uStage: { value: 0 }, uFlicker: { value: 1 } },
        vertexShader: /* glsl */ `
          ${LOG_VERT_PARS}
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            #include <logdepthbuf_vertex>
          }`,
        fragmentShader: /* glsl */ `
          ${LOG_FRAG_PARS}
          uniform float uTime;
          uniform float uStage;
          uniform float uFlicker;
          varying vec2 vUv;
          void main() {
            #include <logdepthbuf_fragment>
            vec2 p = vUv * 2.0 - 1.0;
            float r = length(p);
            if (r > 1.0) discard;
            float theta = atan(p.y, p.x);
            float cruise = clamp(uStage, 0.0, 1.0);
            float burn = clamp(uStage - 1.0, 0.0, 1.0);
            // the annulus at the bell wall, with rotating vane swirl
            float annulus = smoothstep(0.98, 0.8, r) * smoothstep(0.3, 0.62, r);
            float swirl = 0.8 + 0.2 * sin(theta * 9.0 + r * 13.0 - uTime * 5.5);
            // the darker ring between annulus and core
            float darkring = 1.0 - 0.5 * exp(-pow((r - 0.42) / 0.11, 2.0)) * (1.0 - burn);
            // the throat core — swallows the disc at max burn
            float coreR = 0.12 + 0.08 * cruise + 0.75 * burn;
            float core = exp(-pow(r / max(coreR, 0.02), 2.0));
            float ember = 0.1;
            float lvl = (ember + 0.85 * cruise + 1.5 * burn) * uFlicker;
            vec3 blue = vec3(0.42, 0.68, 1.0);
            vec3 white = vec3(1.15, 1.32, 1.5);
            vec3 col =
              annulus * swirl * darkring * blue * (0.55 + 0.55 * cruise + 0.7 * burn) +
              core * white * (0.9 + 2.6 * burn);
            gl_FragColor = vec4(col * lvl * 2.0, 1.0);
          }`,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
    [],
  )

  const tongueMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uLevel: { value: 0 }, uFlicker: { value: 1 } },
        vertexShader: /* glsl */ `
          ${LOG_VERT_PARS}
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            #include <logdepthbuf_vertex>
          }`,
        fragmentShader: /* glsl */ `
          ${LOG_FRAG_PARS}
          uniform float uTime;
          uniform float uLevel;
          uniform float uFlicker;
          varying vec2 vUv;
          float hash(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
          float vnoise(vec2 q) {
            vec2 i = floor(q);
            vec2 f = fract(q);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(hash(i), hash(i + vec2(1, 0)), f.x),
              mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x),
              f.y
            );
          }
          void main() {
            #include <logdepthbuf_fragment>
            // cone UV: v runs base→apex? verified visually; axial = 1 - vUv.y
            float axial = 1.0 - vUv.y;
            float fall = pow(1.0 - axial, 1.7);
            // wispy feathered edge — the raggedness of the reference tongue
            float n = vnoise(vec2(vUv.x * 7.0, axial * 3.5 - uTime * 3.2));
            float body = smoothstep(0.12, 0.6, fall * (0.7 + 0.55 * n));
            vec3 hot = vec3(1.1, 1.28, 1.5);
            vec3 cold = vec3(0.28, 0.52, 1.0);
            vec3 col = mix(cold, hot, pow(1.0 - axial, 3.0));
            gl_FragColor = vec4(col * body * uLevel * uFlicker, 1.0);
          }`,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
    [],
  )

  const beamMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uLevel: { value: 0 } },
        vertexShader: /* glsl */ `
          ${LOG_VERT_PARS}
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            #include <logdepthbuf_vertex>
          }`,
        fragmentShader: /* glsl */ `
          ${LOG_FRAG_PARS}
          uniform float uLevel;
          varying vec2 vUv;
          void main() {
            #include <logdepthbuf_fragment>
            float axial = 1.0 - vUv.y;
            float fall = pow(1.0 - axial, 2.2);
            vec3 col = vec3(0.4, 0.62, 1.0) * fall * uLevel * 0.35;
            gl_FragColor = vec4(col, 1.0);
          }`,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
    [],
  )

  const coronaMat = useMemo(
    () =>
      new SpriteMaterial({
        map: makeRadialTexture(),
        color: '#bfe0ff',
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0,
      }),
    [],
  )

  const rootRef = useRef<Group>(null)

  useFrame((_, dt) => {
    const burning = warpBurning()
    const thrust = shipRig.thrusting || burning
    const boost = (shipRig.boosting || burning) && thrust
    const target = thrust ? (boost ? 2 : 1) : 0
    const k = 1 - Math.exp(-7 * dt)
    stageRef.current += (target - stageRef.current) * k
    const stage = stageRef.current
    const now = performance.now() / 1000
    const flicker = 1 + 0.05 * Math.sin(now * 43) + 0.035 * Math.sin(now * 97)

    mouthMat.uniforms.uTime.value = now
    mouthMat.uniforms.uStage.value = stage
    mouthMat.uniforms.uFlicker.value = flicker

    const cruise = Math.min(stage, 1)
    const burnK = Math.max(0, stage - 1)

    tongueMat.uniforms.uTime.value = now
    tongueMat.uniforms.uLevel.value = cruise * 0.9 + burnK * 0.9
    tongueMat.uniforms.uFlicker.value = flicker
    const tongue = tongueRef.current
    if (tongue) {
      const len = 0.001 + cruise * 1.6 + burnK * 2.6
      const width = 1 + 0.45 * burnK
      tongue.scale.set(width, len, width)
      tongue.position.y = 0.1 - len / 2 // keep the base seated in the bell
    }

    beamMat.uniforms.uLevel.value = cruise * 0.6 + burnK * 0.9
    const beam = beamRef.current
    if (beam) {
      const len = 0.001 + cruise * 4.5 + burnK * 8.5
      const width = 1 + 0.35 * burnK
      beam.scale.set(width, len, width)
      beam.position.y = 0.1 - len / 2
    }

    coronaMat.opacity = (cruise * 0.35 + burnK * 0.6) * flicker
    const corona = coronaRef.current
    if (corona) {
      const s = 0.8 + cruise * 0.8 + burnK * 2.6
      corona.scale.set(s, s, 1)
    }
  })

  // Model frame here: +y = nose, −y = stern; the plume points down −y.
  return (
    <group ref={rootRef}>
      {/* the mouth lens, facing aft */}
      <mesh ref={mouthRef} material={mouthMat} position={[0, 0.12, 0]} rotation-x={Math.PI / 2}>
        <circleGeometry args={[0.36, 40]} />
      </mesh>
      {/* the ragged tongue — unit cone scaled per frame, apex aft */}
      <mesh ref={tongueRef} material={tongueMat} position={[0, 0.1, 0]} rotation-x={Math.PI}>
        <coneGeometry args={[0.3, 1, 20, 6, true]} />
      </mesh>
      {/* the long faint beam */}
      <mesh ref={beamRef} material={beamMat} position={[0, 0.1, 0]} rotation-x={Math.PI}>
        <coneGeometry args={[0.13, 1, 12, 1, true]} />
      </mesh>
      {/* the corona that engulfs the stern at burn */}
      <sprite ref={coronaRef} material={coronaMat} position={[0, -0.05, 0]} scale={[0.8, 0.8, 1]} />
    </group>
  )
}
