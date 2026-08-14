import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  DoubleSide,
  Mesh,
  NormalBlending,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three'
import { shipRig } from '../state/shipRig'
import { warpBurning } from '../physics/warp'

/**
 * THE DRIVE PLUME v3 — A REAL VOLUME (docs/the-plume.md pass 3).
 *
 * Tirtha's ruling: no flipbooks, no sprites — build our own flame, and
 * make it actually 3D. So this is a RAYMARCHED VOLUMETRIC EMITTER: the
 * fragment shader walks the camera ray through a box at the bell,
 * sampling a procedural density field and accumulating emission with
 * Beer-Lambert absorption. Consequences, each answering a rejection:
 *
 *  - genuinely 3D: real parallax, correct from every orbit angle, and
 *    no quad edges to catch the light (there is no quad).
 *  - self-occluding: the near flame dims the far flame, which is the
 *    cue that reads as VOLUME rather than a glowing decal.
 *  - can't blow out: absorption saturates the accumulation, so the
 *    core lands just under the bloom threshold instead of becoming a
 *    "mini star".
 *
 * The field: an envelope that emerges at the bell and tapers; noise
 * ADVECTED along the axis (structure born at the throat, dying at the
 * tip) and stretched lengthwise so it reads as a high-speed jet rather
 * than a campfire; domain warping for licking tongues; a laminar →
 * turbulent gradient; shock diamonds near the throat; and a
 * temperature ramp white → cyan → deep blue (a fusion torch never
 * burns orange).
 */

const LOG_VERT_PARS = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
`
const LOG_FRAG_PARS = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
`

/** cruise → burn, in ship units */
const LEN_CRUISE = 1.15
const LEN_BURN = 3.2
const DIA_CRUISE = 1.8
const DIA_BURN = 2.5

function makeRadialTexture(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.3, 'rgba(180,220,255,0.7)')
  grad.addColorStop(1, 'rgba(60,120,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return new CanvasTexture(c)
}

const _camLocal = new Vector3()

export function DrivePlume() {
  const { camera } = useThree()
  const stageRef = useRef(0)
  const volRef = useRef<Mesh>(null)
  const coronaRef = useRef<Sprite>(null)

  const volMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uStage: { value: 0 },
          uFlicker: { value: 1 },
          uCamLocal: { value: new Vector3() },
          uAxial: { value: 2.6 },
          uRadial: { value: 6.2 },
          uEmission: { value: 3.6 },
        },
        vertexShader: /* glsl */ `
          ${LOG_VERT_PARS}
          varying vec3 vLocal;
          void main() {
            vLocal = position;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            #include <logdepthbuf_vertex>
          }`,
        fragmentShader: /* glsl */ `
          ${LOG_FRAG_PARS}
          uniform float uTime, uStage, uFlicker, uAxial, uRadial, uEmission;
          uniform vec3 uCamLocal;
          varying vec3 vLocal;

          float hash(vec3 p){
            p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
            p *= 17.0;
            return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
          }
          float vnoise(vec3 x){
            vec3 i = floor(x), f = fract(x);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(mix(hash(i + vec3(0.0,0.0,0.0)), hash(i + vec3(1.0,0.0,0.0)), f.x),
                           mix(hash(i + vec3(0.0,1.0,0.0)), hash(i + vec3(1.0,1.0,0.0)), f.x), f.y),
                       mix(mix(hash(i + vec3(0.0,0.0,1.0)), hash(i + vec3(1.0,0.0,1.0)), f.x),
                           mix(hash(i + vec3(0.0,1.0,1.0)), hash(i + vec3(1.0,1.0,1.0)), f.x), f.y), f.z);
          }
          float fbm(vec3 p){
            float v = 0.0, a = 0.5;
            for (int i = 0; i < 3; i++){ v += a * vnoise(p); p *= 2.03; a *= 0.5; }
            return v / 0.875;
          }

          // local box is [-0.5, 0.5]^3; the flame flows toward -y
          float density(vec3 p, out float s){
            s = clamp(0.5 - p.y, 0.0, 1.0);
            float q = length(p.xz) * 2.0;

            float R = (0.48 + 0.22 * s) * pow(max(1.0 - s, 0.0), 0.45);
            float radial = exp(-pow(q / max(R, 1e-3), 3.2) * 1.1);
            if (radial < 0.002) return 0.0;

            float burn = clamp(uStage - 1.0, 0.0, 1.0);

            // turbine swirl, growing downstream
            float sw = (1.5 + 1.2 * burn) * s + uTime * (2.5 + 3.0 * burn);
            float ca = cos(sw), sa = sin(sw);
            vec2 pr = mat2(ca, -sa, sa, ca) * p.xz;

            // advection — fine detail across the jet, long streaks along it
            float flow = 16.0 + 52.0 * burn;
            vec3 np = vec3(pr * uRadial, s * uAxial - uTime * flow);

            float w = fbm(np * 0.7);
            vec3 wp = np + (w - 0.5) * vec3(1.5, 1.5, 0.5);
            float n = fbm(wp);

            float turb = smoothstep(0.02, 0.42, s);
            float tongues = smoothstep(0.40, 0.68, n);
            float d = radial * mix(1.0, 0.40 + 0.60 * tongues, turb);

            // the collimated incandescent root
            d += exp(-pow(q / 0.44, 2.0) * 2.6) * exp(-s * 5.0) * 1.05;

            // shock diamonds near the throat
            d *= max(1.0 + 0.42 * sin(s * (10.0 + 6.0 * burn)) * exp(-s * 4.5), 0.0);

            d *= smoothstep(1.0, 0.72, s);
            return d;
          }

          vec3 flameColor(float d, float s){
            float t = clamp(d * (1.25 - 0.75 * s), 0.0, 1.0);
            vec3 cold = vec3(0.05, 0.17, 0.62);
            vec3 mid  = vec3(0.16, 0.58, 1.15);
            vec3 hot  = vec3(0.85, 1.00, 1.22);
            vec3 c = mix(cold, mid, smoothstep(0.10, 0.55, t));
            return mix(c, hot, smoothstep(0.55, 0.95, t));
          }

          void main(){
            #include <logdepthbuf_fragment>
            vec3 ro = uCamLocal;
            vec3 rd = normalize(vLocal - uCamLocal);

            vec3 inv = 1.0 / rd;
            vec3 a = (vec3(-0.5) - ro) * inv, b = (vec3(0.5) - ro) * inv;
            vec3 lo = min(a, b), hi = max(a, b);
            float t0 = max(max(max(lo.x, lo.y), lo.z), 0.0);
            float t1 = min(min(hi.x, hi.y), hi.z);
            if (t1 <= t0) discard;

            const int STEPS = 26;
            float stepLen = (t1 - t0) / float(STEPS);
            float dith = hash(vec3(gl_FragCoord.xy, uTime * 60.0));
            vec3 p = ro + rd * (t0 + stepLen * dith);

            vec3 acc = vec3(0.0);
            float T = 1.0;
            for (int i = 0; i < STEPS; i++){
              float s;
              float d = density(p, s);
              if (d > 0.004){
                acc += T * flameColor(d, s) * d * stepLen * uEmission * uFlicker;
                T *= exp(-d * 3.4 * stepLen);
                if (T < 0.012) break;
              }
              p += rd * stepLen;
            }
            float alpha = 1.0 - T;
            if (alpha < 0.003) discard;
            gl_FragColor = vec4(acc, alpha);
          }`,
        transparent: true,
        blending: NormalBlending,
        premultipliedAlpha: true,
        depthWrite: false,
        side: BackSide,
      }),
    [],
  )

  /** the bell's own lens: the annulus you see looking up the nozzle */
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
          uniform float uTime, uStage, uFlicker;
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
            float swirl = 0.8 + 0.2 * sin(theta * 9.0 + r * 13.0 - uTime * 9.0);
            float lvl = (0.08 + 0.5 * cruise + 0.35 * burn) * uFlicker;
            vec3 col = annulus * swirl * vec3(0.30, 0.62, 1.0);
            gl_FragColor = vec4(col * lvl, 1.0);
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
        color: '#8fbcff',
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
    stageRef.current += (target - stageRef.current) * (1 - Math.exp(-7 * dt))
    const stage = stageRef.current
    const now = performance.now() / 1000
    const flicker = 1 + 0.05 * Math.sin(now * 43) + 0.035 * Math.sin(now * 97)
    const cruise = Math.min(stage, 1)
    const burnK = Math.max(0, stage - 1)

    const vol = volRef.current
    if (vol) {
      // idle costs nothing: the volume isn't drawn at all
      vol.visible = stage > 0.02
      if (vol.visible) {
        const L = LEN_CRUISE * cruise + (LEN_BURN - LEN_CRUISE) * burnK
        const D = DIA_CRUISE * cruise + (DIA_BURN - DIA_CRUISE) * burnK
        vol.scale.set(D, L, D)
        vol.position.y = -L / 2
        vol.updateMatrixWorld()
        // the camera in the box's own space — the ray origin for the march
        _camLocal.copy(camera.position)
        vol.worldToLocal(_camLocal)
        volMat.uniforms.uCamLocal.value.copy(_camLocal)
        volMat.uniforms.uTime.value = now
        volMat.uniforms.uStage.value = stage
        volMat.uniforms.uFlicker.value = flicker
        // keep noise features world-constant as the box stretches
        volMat.uniforms.uAxial.value = L * 2.3
        volMat.uniforms.uRadial.value = D * 6.4
      }
    }

    mouthMat.uniforms.uTime.value = now
    mouthMat.uniforms.uStage.value = stage
    mouthMat.uniforms.uFlicker.value = flicker

    coronaMat.opacity = (cruise * 0.08 + burnK * 0.1) * flicker
    const corona = coronaRef.current
    if (corona) {
      const s = 0.6 + cruise * 0.3 + burnK * 0.5
      corona.scale.set(s, s, 1)
    }
  })

  // ship frame: +y = nose, −y = stern; the flame flows down −y
  return (
    <group>
      <mesh material={mouthMat} position={[0, 0.12, 0]} rotation-x={Math.PI / 2}>
        <circleGeometry args={[0.50, 40]} />
      </mesh>
      <mesh ref={volRef} material={volMat} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <sprite ref={coronaRef} material={coronaMat} position={[0, 0, 0]} scale={[0.6, 0.6, 1]} />
    </group>
  )
}
