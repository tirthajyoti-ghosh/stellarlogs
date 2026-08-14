import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  RepeatWrapping,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  TextureLoader,
} from 'three'
import { shipRig } from '../state/shipRig'
import { warpBurning } from '../physics/warp'

/**
 * THE DRIVE PLUME v2 (docs/the-plume.md pass 2 — his flame-bench pick:
 * option B, FIRE 01). Real animated fire, Epstein blue:
 *
 *   MOUTH — the bell lens shader (kept from v1: annulus, dark ring,
 *           turbine swirl, throat core that grows at burn).
 *   FLAME — para's CC0 FIRE 01 flipbook (64 frames @ 30 fps,
 *           hue-shifted blue offline), riding two crossed aft-aligned
 *           quads. COMPACT: cruise ≈ one bell-length; max burn ≈ 3×.
 *           Nothing streams behind the ship — the beam is dead.
 *   CORONA — a whisper of rim bleed only; the ship stays visible from
 *           the chase camera at all stages (his hard rule).
 */

const FLIP_URL = '/fx/flame-fire01-blue.png'
const FLIP_COLS = 8
const FLIP_FRAMES = 64
const FLIP_FPS = 30

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
  const flameARef = useRef<Mesh>(null)
  const flameBRef = useRef<Mesh>(null)
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
            float annulus = smoothstep(0.98, 0.8, r) * smoothstep(0.3, 0.62, r);
            float swirl = 0.8 + 0.2 * sin(theta * 9.0 + r * 13.0 - uTime * 5.5);
            float darkring = 1.0 - 0.5 * exp(-pow((r - 0.42) / 0.11, 2.0)) * (1.0 - burn);
            float coreR = 0.12 + 0.08 * cruise + 0.6 * burn;
            float core = exp(-pow(r / max(coreR, 0.02), 2.0));
            float ember = 0.1;
            float lvl = (ember + 0.85 * cruise + 1.2 * burn) * uFlicker;
            vec3 blue = vec3(0.42, 0.68, 1.0);
            vec3 white = vec3(1.15, 1.32, 1.5);
            vec3 col =
              annulus * swirl * darkring * blue * (0.55 + 0.55 * cruise + 0.6 * burn) +
              core * white * (0.9 + 2.0 * burn);
            gl_FragColor = vec4(col * lvl * 2.0, 1.0);
          }`,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
    [],
  )

  const flameTex = useMemo(() => {
    const tex = new TextureLoader().load(FLIP_URL)
    tex.wrapS = RepeatWrapping
    tex.wrapT = RepeatWrapping
    tex.repeat.set(1 / FLIP_COLS, 1 / FLIP_COLS)
    return tex
  }, [])

  const flameMat = useMemo(() => {
    const m = new MeshBasicMaterial({
      map: flameTex,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    })
    m.color.setRGB(1.5, 1.8, 2.4)
    return m
  }, [flameTex])

  const coronaMat = useMemo(
    () =>
      new SpriteMaterial({
        map: makeRadialTexture(),
        color: '#9fc8ff',
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0,
      }),
    [],
  )

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

    // flipbook frame advance
    const frame = Math.floor(now * FLIP_FPS) % FLIP_FRAMES
    flameTex.offset.set(
      (frame % FLIP_COLS) / FLIP_COLS,
      1 - (Math.floor(frame / FLIP_COLS) + 1) / FLIP_COLS,
    )

    // COMPACT flame: cruise ≈ one bell-length, burn ≈ 3× (his spec)
    const len = 0.001 + cruise * 0.95 + burnK * 1.95
    const width = 0.62 + 0.3 * burnK
    const level = cruise * 0.85 + burnK * 0.5
    flameMat.opacity = Math.min(1, level) * flicker
    for (const ref of [flameARef, flameBRef]) {
      const m = ref.current
      if (!m) continue
      m.scale.set(width, len, 1)
      m.position.y = 0.06 - len / 2
    }

    // the corona is a WHISPER — never veils the hull
    coronaMat.opacity = (cruise * 0.1 + burnK * 0.14) * flicker
    const corona = coronaRef.current
    if (corona) {
      const s = 0.7 + cruise * 0.4 + burnK * 0.8
      corona.scale.set(s, s, 1)
    }
  })

  // Model frame here: +y = nose, −y = stern; the flame hangs down −y.
  return (
    <group>
      {/* the bell lens, facing aft */}
      <mesh material={mouthMat} position={[0, 0.12, 0]} rotation-x={Math.PI / 2}>
        <circleGeometry args={[0.36, 40]} />
      </mesh>
      {/* the flame: two crossed quads, flipbook fire, upside-down so it
          burns aft (the sheet's flames point up) */}
      <mesh ref={flameARef} material={flameMat} rotation={[0, 0, Math.PI]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh ref={flameBRef} material={flameMat} rotation={[0, Math.PI / 2, Math.PI]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {/* rim bleed only */}
      <sprite ref={coronaRef} material={coronaMat} position={[0, 0, 0]} scale={[0.7, 0.7, 1]} />
    </group>
  )
}
