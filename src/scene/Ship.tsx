import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import {
  AdditiveBlending,
  Group,
  LatheGeometry,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  Quaternion,
  Vector2,
  Vector3,
} from 'three'
import { createShipState, shipQuaternion, stepShip } from '../physics/integrator'
import { warp, warpTurn, stepWarp } from '../physics/warp'
import { shipInput } from '../physics/shipInput'
import type { ShipInput } from '../physics/shipInput'
import { shipRig } from '../state/shipRig'
import { SPAWN_POSITION, SPAWN_YAW } from '../config/universe'
import { FONT_BOLD } from './boards/font'
import { makeHexTextures, makeLoftGeometry, makePanelTextures, makeShingleTextures } from './shipGeometry'

function makeEngineBell(): LatheGeometry {
  const profile = [
    new Vector2(0.24, 0.0),
    new Vector2(0.34, -0.28),
    new Vector2(0.5, -0.66),
    new Vector2(0.64, -0.98),
  ]
  return new LatheGeometry(profile, 20)
}

function makeSmallBell(): LatheGeometry {
  const profile = [
    new Vector2(0.1, 0.0),
    new Vector2(0.15, -0.14),
    new Vector2(0.22, -0.34),
  ]
  return new LatheGeometry(profile, 12)
}

const PANEL = { color: '#3a3f47', metalness: 0.6, roughness: 0.55, flatShading: true }
const DARK = { color: '#181c23', metalness: 0.7, roughness: 0.45, flatShading: true }
const ACCENT = { color: '#7a2f22', metalness: 0.4, roughness: 0.6, flatShading: true }

/**
 * RCS pods (local frame: +Y forward, +Z up, +X starboard) on the slab hull.
 * Exhaust opposite the wanted motion; bow/stern couples for rotation.
 */
interface RcsPod {
  pos: [number, number, number]
  dir: [number, number, number]
  fire: (input: ShipInput) => number
}
const RCS_PODS: RcsPod[] = [
  // Yaw couple: bow pods + stern drum pods
  { pos: [0.58, 2.1, 0], dir: [1, 0, 0], fire: (i) => Math.max(0, i.yaw) },
  { pos: [-0.82, -1.8, 0], dir: [-1, 0, 0], fire: (i) => Math.max(0, i.yaw) },
  { pos: [-0.58, 2.1, 0], dir: [-1, 0, 0], fire: (i) => Math.max(0, -i.yaw) },
  { pos: [0.82, -1.8, 0], dir: [1, 0, 0], fire: (i) => Math.max(0, -i.yaw) },
  // Pitch couple
  { pos: [0, 2.1, -0.24], dir: [0, 0, -1], fire: (i) => Math.max(0, i.pitch) },
  { pos: [0, -1.8, 0.82], dir: [0, 0, 1], fire: (i) => Math.max(0, i.pitch) },
  { pos: [0, 2.1, 0.24], dir: [0, 0, 1], fire: (i) => Math.max(0, -i.pitch) },
  { pos: [0, -1.8, -0.82], dir: [0, 0, -1], fire: (i) => Math.max(0, -i.pitch) },
  // Lateral strafe pairs
  { pos: [-0.74, 0.9, 0], dir: [-1, 0, 0], fire: (i) => Math.max(0, i.strafeX) },
  { pos: [-0.8, -0.9, 0], dir: [-1, 0, 0], fire: (i) => Math.max(0, i.strafeX) },
  { pos: [0.74, 0.9, 0], dir: [1, 0, 0], fire: (i) => Math.max(0, -i.strafeX) },
  { pos: [0.8, -0.9, 0], dir: [1, 0, 0], fire: (i) => Math.max(0, -i.strafeX) },
  // Retro burn nozzles at the bow tip
  { pos: [0.3, 2.95, 0], dir: [0, 1, 0], fire: (i) => i.reverse },
  { pos: [-0.3, 2.95, 0], dir: [0, 1, 0], fire: (i) => i.reverse },
]
const _podUp = new Vector3(0, 1, 0)
const RCS_QUATS = RCS_PODS.map((pod) => {
  const q = new Quaternion()
  q.setFromUnitVectors(_podUp, new Vector3(...pod.dir).normalize())
  return q
})

/** Lit portholes: shoulder flanks (two rows) + a few on the drive drum. */
const WINDOWS: [number, number, number][] = [
  [0.79, 0.3, 0.2],
  [0.8, -0.1, 0.2],
  [0.8, -0.5, 0.2],
  [0.8, -0.9, 0.2],
  [-0.79, 0.15, 0.16],
  [-0.8, -0.25, 0.16],
  [-0.8, -0.65, 0.16],
  [0.8, -0.3, -0.16],
  [-0.8, -0.55, -0.16],
  [0.72, 1.4, 0.1],
  [-0.72, 1.55, 0.08],
  [0.78, -1.7, 0.24],
  [-0.78, -2.1, 0.24],
]

/** PDC turret: low dome + twin stub barrels. */
function Pdc({ position, up = 1, yaw = 0 }: { position: [number, number, number]; up?: 1 | -1; yaw?: number }) {
  return (
    <group position={position} rotation-y={yaw}>
      <mesh scale={[1, 1, up]} rotation-x={Math.PI / 2}>
        <sphereGeometry args={[0.14, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial {...DARK} />
      </mesh>
      {[0.045, -0.045].map((x) => (
        <mesh key={x} position={[x, 0.1, up * 0.12]} rotation-x={up * -0.9}>
          <cylinderGeometry args={[0.018, 0.018, 0.26, 6]} />
          <meshStandardMaterial {...DARK} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Owns the physics step (runs first each frame via negative priority) and
 * renders the ship — a Rocinante-inspired corvette: tapered slab hull with
 * armored-plating textures, drive block with a main bell and four corner
 * bells, PDC turrets, torpedo doors, RCS couples, running lights.
 * Local frame inside the -90° X group: +Y = nose, +Z = up.
 */
export function Ship() {
  const rigRef = useRef<Group>(null)
  const glowRef = useRef<PointLight>(null)
  const plumeCoreRef = useRef<Mesh>(null)
  const plumeOuterRef = useRef<Mesh>(null)
  const rcsRefs = useRef<(Mesh | null)[]>([])
  const strobeRef = useRef<Mesh>(null)
  const portLightRef = useRef<Mesh>(null)
  const starboardLightRef = useRef<Mesh>(null)
  const state = useMemo(() => createShipState(new Vector3(...SPAWN_POSITION), SPAWN_YAW), [])

  // Dev-only teleport for visual inspection / automation
  if (import.meta.env.DEV) {
    ;(window as unknown as Record<string, unknown>).__teleport = (
      x: number,
      y: number,
      z: number,
      yaw = 0,
      pitch = 0,
    ) => {
      state.position.set(x, y, z)
      state.prevPosition.set(x, y, z)
      state.velocity.set(0, 0, 0)
      state.yaw = state.prevYaw = yaw
      state.pitch = state.prevPitch = pitch
    }
  }

  // Shoulder hump lofting down into the broad chisel bow — the Roci profile
  const hull = useMemo(
    () =>
      makeLoftGeometry([
        { y: -1.3, w: 1.52, h: 1.06, z: 0.08 },
        { y: -0.35, w: 1.58, h: 1.1, z: 0.1 },
        { y: 0.55, w: 1.46, h: 0.68, z: 0.05 },
        { y: 1.55, w: 1.34, h: 0.5, z: 0.06 },
        { y: 2.45, w: 1.1, h: 0.34, z: 0.08 },
        { y: 3.05, w: 0.72, h: 0.17, z: 0.1 },
      ]),
    [],
  )
  const bell = useMemo(() => makeEngineBell(), [])
  const smallBell = useMemo(() => makeSmallBell(), [])
  const hullMaterial = useMemo(() => {
    const tex = makePanelTextures()
    tex.map.repeat.set(2, 2)
    tex.bumpMap.repeat.set(2, 2)
    tex.roughnessMap.repeat.set(2, 2)
    return new MeshStandardMaterial({
      color: '#d2d7dd',
      map: tex.map,
      bumpMap: tex.bumpMap,
      bumpScale: 1.6,
      roughnessMap: tex.roughnessMap,
      roughness: 1,
      metalness: 0.28,
      flatShading: true,
    })
  }, [])
  const plateMaterial = useMemo(() => {
    const tex = makePanelTextures()
    tex.map.repeat.set(1.2, 1.2)
    tex.bumpMap.repeat.set(1.2, 1.2)
    tex.roughnessMap.repeat.set(1.2, 1.2)
    return new MeshStandardMaterial({
      color: '#90959d',
      map: tex.map,
      bumpMap: tex.bumpMap,
      bumpScale: 1.2,
      roughnessMap: tex.roughnessMap,
      roughness: 1,
      metalness: 0.3,
      flatShading: true,
    })
  }, [])
  const hexMaterial = useMemo(() => {
    const tex = makeHexTextures()
    tex.map.repeat.set(1.6, 1.6)
    tex.bumpMap.repeat.set(1.6, 1.6)
    tex.roughnessMap.repeat.set(1.6, 1.6)
    return new MeshStandardMaterial({
      color: '#b8c2ce',
      map: tex.map,
      bumpMap: tex.bumpMap,
      bumpScale: 2.2,
      roughnessMap: tex.roughnessMap,
      roughness: 1,
      metalness: 0.32,
      flatShading: true,
    })
  }, [])
  const shingleMaterial = useMemo(() => {
    const tex = makeShingleTextures()
    tex.map.repeat.set(2.4, 2.4)
    tex.bumpMap.repeat.set(2.4, 2.4)
    tex.roughnessMap.repeat.set(2.4, 2.4)
    return new MeshStandardMaterial({
      color: '#a8adb4',
      map: tex.map,
      bumpMap: tex.bumpMap,
      bumpScale: 1.8,
      roughnessMap: tex.roughnessMap,
      roughness: 1,
      metalness: 0.25,
      flatShading: true,
    })
  }, [])

  useFrame((_, dt) => {
    let alpha: number
    if (warp.phase === 'idle') {
      alpha = stepShip(state, shipInput, dt)
    } else {
      stepWarp(state, Math.min(dt, 0.05))
      alpha = 1
    }
    const rig = rigRef.current
    if (!rig) return

    rig.position.lerpVectors(state.prevPosition, state.position, alpha)
    const yaw = MathUtils.lerp(state.prevYaw, state.yaw, alpha)
    const pitch = MathUtils.lerp(state.prevPitch, state.pitch, alpha)
    shipQuaternion(yaw, pitch, rig.quaternion)

    // Epstein-style drive exhaust: layered core + glow, flicker under thrust,
    // stretched white-hot afterburner while boosting, violet lance in warp
    const now = performance.now() / 1000
    const flicker = 1 + 0.05 * Math.sin(now * 43) + 0.035 * Math.sin(now * 97)
    const jumping = warp.phase === 'jump'
    const coreTarget = jumping ? 5.2 : state.thrusting ? (state.boosting ? 3.4 : 1) : 0
    const outerTarget = jumping ? 3.6 : state.thrusting ? (state.boosting ? 2.5 : 1) : 0
    const coreWidth = jumping ? 1.9 : state.boosting ? 1.15 : 1
    const outerWidth = jumping ? 2.4 : state.boosting ? 1.3 : 1
    const core = plumeCoreRef.current
    if (core) {
      const s = MathUtils.lerp(core.scale.y, coreTarget, 0.12) * flicker
      core.scale.set(coreWidth, Math.max(0.001, s), coreWidth)
      const mat = core.material as MeshBasicMaterial
      mat.opacity = 0.95 * Math.min(1, s)
      if (jumping) {
        mat.color.setRGB(4.6, 3.2, 6.4)
      } else {
        mat.color.setRGB(
          state.boosting ? 3.2 : 1.6,
          state.boosting ? 4.4 : 2.6,
          state.boosting ? 5.2 : 3.6,
        )
      }
    }
    const outer = plumeOuterRef.current
    if (outer) {
      const s = MathUtils.lerp(outer.scale.y, outerTarget, 0.12) * flicker
      outer.scale.set(outerWidth, Math.max(0.001, s), outerWidth)
      const mat = outer.material as MeshBasicMaterial
      mat.opacity = (jumping ? 0.6 : 0.45) * Math.min(1, s)
      if (jumping) mat.color.setRGB(2.4, 0.9, 3.4)
      else mat.color.setRGB(0.35, 0.66, 0.91)
    }
    if (glowRef.current) {
      const target = jumping ? 80 : state.thrusting ? (state.boosting ? 60 : 16) : 0
      glowRef.current.intensity = MathUtils.lerp(glowRef.current.intensity, target * flicker, 0.2)
      glowRef.current.color.set(jumping ? '#b07aff' : '#7fd4ff')
    }

    // Navigation lights: slow red/green pulse, sharp white strobe
    if (portLightRef.current) {
      const m = portLightRef.current.material as MeshBasicMaterial
      m.color.setRGB(2.4 * (0.55 + 0.45 * Math.sin(now * 2.2)), 0.1, 0.1)
    }
    if (starboardLightRef.current) {
      const m = starboardLightRef.current.material as MeshBasicMaterial
      m.color.setRGB(0.1, 2.2 * (0.55 + 0.45 * Math.sin(now * 2.2 + 1.5)), 0.15)
    }
    if (strobeRef.current) {
      const s = Math.pow(Math.max(0, Math.sin(now * 1.4)), 24)
      const m = strobeRef.current.material as MeshBasicMaterial
      m.color.setRGB(1 + s * 5, 1 + s * 5, 1 + s * 5.5)
    }

    // RCS puffs — during warp alignment the autopilot's rotation drives them
    const podInput =
      warp.phase === 'align'
        ? {
            thrust: 0,
            reverse: 0,
            strafeX: 0,
            yaw: MathUtils.clamp(warpTurn.yaw * 3, -1, 1),
            pitch: MathUtils.clamp(warpTurn.pitch * 3, -1, 1),
            boost: false,
          }
        : shipInput
    RCS_PODS.forEach((pod, i) => {
      const mesh = rcsRefs.current[i]
      if (!mesh) return
      const mat = mesh.material as MeshBasicMaterial
      mat.opacity = MathUtils.lerp(mat.opacity, pod.fire(podInput) * 0.85, 0.3)
    })

    // Publish for camera / HUD / proximity
    shipRig.position.copy(rig.position)
    shipRig.quaternion.copy(rig.quaternion)
    shipRig.speed = state.speed
    shipRig.boosting = state.boosting
    shipRig.thrusting = state.thrusting
    shipRig.boostCharge = state.boostCharge
    shipRig.warping = warp.phase !== 'idle'
    shipRig.yaw = yaw
    shipRig.pitch = pitch
    if (state.speed > 1) {
      shipRig.velocityDir.copy(state.velocity).normalize()
    }
  }, -2)

  return (
    <group ref={rigRef}>
      <group rotation-x={-Math.PI / 2}>
        {/* Shoulder + bow wedge loft with armored plating */}
        <mesh geometry={hull} material={hullMaterial} />

        {/* ---- Stern drive drum ---- */}
        <group position={[0, -2.05, 0.08]}>
          <mesh rotation-y={Math.PI / 16}>
            <cylinderGeometry args={[0.8, 0.84, 1.55, 16]} />
            <meshStandardMaterial {...PANEL} />
          </mesh>
          {/* Drum ribs */}
          {[-0.55, -0.05, 0.45].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation-y={Math.PI / 16}>
              <cylinderGeometry args={[0.84, 0.84, 0.1, 16]} />
              <meshStandardMaterial {...DARK} />
            </mesh>
          ))}
          {/* End cap */}
          <mesh position={[0, -0.8, 0]}>
            <cylinderGeometry args={[0.72, 0.72, 0.08, 16]} />
            <meshStandardMaterial color="#0e1218" metalness={0.8} roughness={0.4} flatShading />
          </mesh>
          {/* Gantry rack on the drum's dorsal side */}
          <group position={[0, 0.1, 0.86]}>
            {[
              [0.32, 0.4],
              [-0.32, 0.4],
              [0.32, -0.45],
              [-0.32, -0.45],
            ].map(([x, y], i) => (
              <mesh key={`post-${i}`} position={[x, y, 0.1]}>
                <boxGeometry args={[0.05, 0.05, 0.26]} />
                <meshStandardMaterial {...DARK} />
              </mesh>
            ))}
            <mesh position={[0, 0.4, 0.24]}>
              <boxGeometry args={[0.72, 0.06, 0.05]} />
              <meshStandardMaterial {...DARK} />
            </mesh>
            <mesh position={[0, -0.45, 0.24]}>
              <boxGeometry args={[0.72, 0.06, 0.05]} />
              <meshStandardMaterial {...DARK} />
            </mesh>
            {[0.32, -0.32].map((x) => (
              <mesh key={`rail-${x}`} position={[x, 0, 0.24]}>
                <boxGeometry args={[0.05, 0.9, 0.05]} />
                <meshStandardMaterial {...DARK} />
              </mesh>
            ))}
          </group>
          {/* Folded manipulator arms */}
          {[0.2, -0.24].map((x, i) => (
            <group key={`arm-${i}`} position={[x, 0.55, 0.9]} rotation-x={-0.25} rotation-z={i ? 0.15 : -0.1}>
              <mesh position={[0, 0.22, 0.06]} rotation-x={0.5}>
                <boxGeometry args={[0.06, 0.5, 0.06]} />
                <meshStandardMaterial {...PANEL} />
              </mesh>
              <mesh position={[0, 0.52, 0.28]} rotation-x={-0.7}>
                <boxGeometry args={[0.05, 0.44, 0.05]} />
                <meshStandardMaterial {...DARK} />
              </mesh>
              {[0.03, -0.03].map((cx) => (
                <mesh key={cx} position={[cx, 0.72, 0.16]} rotation-x={-0.7}>
                  <boxGeometry args={[0.02, 0.12, 0.03]} />
                  <meshStandardMaterial {...DARK} />
                </mesh>
              ))}
            </group>
          ))}
          {/* Drum side modules with red hazard bands */}
          {[0.78, -0.78].map((x) => (
            <group key={`mod-${x}`} position={[x, 0.1, 0.2]}>
              <mesh material={plateMaterial}>
                <boxGeometry args={[0.22, 0.8, 0.42]} />
              </mesh>
              <mesh position={[x > 0 ? 0.115 : -0.115, 0, 0]}>
                <boxGeometry args={[0.012, 0.7, 0.08]} />
                <meshStandardMaterial {...ACCENT} />
              </mesh>
            </group>
          ))}
          {/* Crest decal: white square with four red pips */}
          <group position={[0.82, 0.15, 0.52]} rotation-z={-Math.PI / 2} rotation-y={0.55}>
            <mesh>
              <boxGeometry args={[0.02, 0.26, 0.26]} />
              <meshStandardMaterial color="#d8dce0" metalness={0.2} roughness={0.5} />
            </mesh>
            {[
              [0.07, 0.07],
              [-0.07, 0.07],
              [0.07, -0.07],
              [-0.07, -0.07],
            ].map(([a, b], i) => (
              <mesh key={i} position={[0.012, a, b]}>
                <boxGeometry args={[0.01, 0.07, 0.07]} />
                <meshStandardMaterial {...ACCENT} />
              </mesh>
            ))}
          </group>
        </group>

        {/* ---- Shoulder superstructure ---- */}
        {/* Shingled roof slope down toward the bow deck */}
        <mesh position={[0, 0.68, 0.43]} rotation-x={0.34} material={shingleMaterial}>
          <boxGeometry args={[1.24, 1.05, 0.07]} />
        </mesh>
        {/* Name band above the slope */}
        <group position={[0, 0.28, 0.62]} rotation-x={0.34}>
          <mesh>
            <boxGeometry args={[1.05, 0.3, 0.05]} />
            <meshStandardMaterial color="#d8dce0" metalness={0.2} roughness={0.5} />
          </mesh>
          <Text
            font={FONT_BOLD}
            fontSize={0.125}
            color="#c8352a"
            anchorX="center"
            anchorY="middle"
            position={[0, 0.01, 0.04]}
            rotation-z={Math.PI / 2}
          >
            STELLARLOGS
          </Text>
          <mesh position={[0.38, -0.1, 0.03]}>
            <boxGeometry args={[0.26, 0.045, 0.02]} />
            <meshStandardMaterial {...ACCENT} />
          </mesh>
        </group>
        {/* Ops deck block with inset skylight */}
        <group position={[0, -0.55, 0.68]}>
          <mesh material={plateMaterial}>
            <boxGeometry args={[0.78, 0.9, 0.22]} />
          </mesh>
          <mesh position={[0, 0.1, 0.12]}>
            <boxGeometry args={[0.46, 0.56, 0.05]} />
            <meshStandardMaterial color="#84898f" metalness={0.4} roughness={0.4} flatShading />
          </mesh>
          <mesh position={[0, 0.1, 0.15]}>
            <boxGeometry args={[0.36, 0.46, 0.02]} />
            <meshStandardMaterial
              color="#0a141f"
              metalness={0.5}
              roughness={0.12}
              emissive="#2a5478"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
        {/* Shoulder cheek hex fields with white borders */}
        {[0.74, -0.74].map((x) => (
          <group key={`cheek-${x}`} position={[x, -0.2, 0.28]} rotation-y={x > 0 ? -0.22 : 0.22}>
            <mesh material={hexMaterial}>
              <boxGeometry args={[0.06, 1.5, 0.62]} />
            </mesh>
            <mesh position={[x > 0 ? 0.032 : -0.032, 0, 0.32]}>
              <boxGeometry args={[0.012, 1.5, 0.035]} />
              <meshStandardMaterial color="#d8dce0" metalness={0.2} roughness={0.5} />
            </mesh>
          </group>
        ))}

        {/* ---- Bow wedge dressing ---- */}
        {/* Big hex armor fields on the bow top, bordered white */}
        {[0.32, -0.32].map((x) => (
          <group key={`bowhex-${x}`} position={[x, 1.85, 0.28]} rotation-x={-0.12} rotation-y={x > 0 ? 0.06 : -0.06}>
            <mesh material={hexMaterial}>
              <boxGeometry args={[0.56, 1.6, 0.06]} />
            </mesh>
            <mesh position={[x > 0 ? 0.29 : -0.29, 0, 0.01]}>
              <boxGeometry args={[0.025, 1.6, 0.05]} />
              <meshStandardMaterial color="#d8dce0" metalness={0.2} roughness={0.5} />
            </mesh>
            <mesh position={[0, x > 0 ? 0.5 : -0.3, 0.035]} rotation-z={x > 0 ? 0.5 : -0.4}>
              <boxGeometry args={[0.4, 0.05, 0.015]} />
              <meshStandardMaterial {...ACCENT} />
            </mesh>
          </group>
        ))}
        {/* Center spine stripe on the bow */}
        <mesh position={[0, 1.85, 0.32]} rotation-x={-0.12}>
          <boxGeometry args={[0.05, 1.6, 0.04]} />
          <meshStandardMaterial color="#d8dce0" metalness={0.2} roughness={0.5} />
        </mesh>
        {/* Bow flank hex panels */}
        {[0.62, -0.62].map((x) => (
          <mesh
            key={`bowside-${x}`}
            position={[x, 1.7, 0.02]}
            rotation-y={x > 0 ? -0.1 : 0.1}
            material={hexMaterial}
          >
            <boxGeometry args={[0.05, 1.4, 0.3]} />
          </mesh>
        ))}

        {/* Underside airlock / PDC housings with grey rims */}
        {[0.36, -0.36].map((x) => (
          <group key={`bay-${x}`} position={[x, 1.3, -0.26]}>
            <mesh material={plateMaterial}>
              <boxGeometry args={[0.5, 0.62, 0.24]} />
            </mesh>
            <mesh position={[0, 0.02, -0.13]}>
              <boxGeometry args={[0.4, 0.5, 0.03]} />
              <meshStandardMaterial color="#84898f" metalness={0.4} roughness={0.4} flatShading />
            </mesh>
            <mesh position={[0, 0.02, -0.145]}>
              <boxGeometry args={[0.32, 0.42, 0.015]} />
              <meshStandardMaterial color="#0b0e13" metalness={0.6} roughness={0.5} />
            </mesh>
            {/* Twin-barrel PDC hanging from the bay */}
            <group position={[0, -0.05, -0.24]}>
              <mesh>
                <boxGeometry args={[0.16, 0.2, 0.14]} />
                <meshStandardMaterial {...DARK} />
              </mesh>
              <mesh position={[0, -0.02, 0]}>
                <boxGeometry args={[0.05, 0.06, 0.16]} />
                <meshStandardMaterial {...ACCENT} />
              </mesh>
              {[0.045, -0.045].map((bx) => (
                <mesh key={bx} position={[bx, 0.28, -0.02]}>
                  <cylinderGeometry args={[0.018, 0.018, 0.42, 6]} />
                  <meshStandardMaterial {...DARK} />
                </mesh>
              ))}
            </group>
          </group>
        ))}

        {/* Dorsal PDC turrets */}
        <Pdc position={[0.4, 0.95, 0.35]} />
        <Pdc position={[-0.44, -1.0, 0.62]} yaw={2.2} />

        {/* Bow tip prongs with sensor rails + twin torpedo barrels */}
        {[0.2, -0.2].map((x) => (
          <group key={`prong-${x}`} position={[x, 3.3, 0.1]}>
            <mesh>
              <boxGeometry args={[0.09, 0.55, 0.09]} />
              <meshStandardMaterial {...DARK} />
            </mesh>
            <mesh position={[x > 0 ? 0.07 : -0.07, 0.1, 0.05]}>
              <cylinderGeometry args={[0.015, 0.015, 0.5, 4]} />
              <meshStandardMaterial {...PANEL} />
            </mesh>
          </group>
        ))}
        {[0.09, -0.09].map((x) => (
          <mesh key={`torp-${x}`} position={[x, 3.2, -0.06]}>
            <cylinderGeometry args={[0.032, 0.032, 0.62, 6]} />
            <meshStandardMaterial {...DARK} />
          </mesh>
        ))}

        {/* Red accent stripes along the shoulder flanks */}
        {[0.8, -0.8].map((x) => (
          <mesh key={`redline-${x}`} position={[x, -0.15, 0.44]}>
            <boxGeometry args={[0.02, 1.4, 0.06]} />
            <meshStandardMaterial {...ACCENT} />
          </mesh>
        ))}

        {/* Strobe mast on the shoulder */}
        <group position={[0, -1.0, 0.72]}>
          <mesh>
            <cylinderGeometry args={[0.014, 0.014, 0.4, 6]} />
            <meshStandardMaterial {...DARK} />
          </mesh>
          <mesh ref={strobeRef} position={[0, 0.24, 0]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color={[1, 1, 1]} toneMapped={false} />
          </mesh>
        </group>
        {/* Whip antennas near the gantry */}
        <mesh position={[0.4, -1.5, 0.95]} rotation-x={0.25}>
          <cylinderGeometry args={[0.008, 0.003, 0.6, 4]} />
          <meshStandardMaterial {...DARK} />
        </mesh>

        {/* Navigation lights */}
        <mesh ref={starboardLightRef} position={[0.8, 0.55, 0.22]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color={[0.1, 2.2, 0.15]} toneMapped={false} />
        </mesh>
        <mesh ref={portLightRef} position={[-0.8, 0.55, 0.22]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color={[2.4, 0.1, 0.1]} toneMapped={false} />
        </mesh>

        {/* Forward docking lights on the prongs */}
        {[0.2, -0.2].map((x) => (
          <mesh key={`dock-${x}`} position={[x, 3.55, 0.1]}>
            <sphereGeometry args={[0.028, 6, 6]} />
            <meshBasicMaterial color={[3, 3, 2.8]} toneMapped={false} />
          </mesh>
        ))}

        {/* Portholes */}
        {WINDOWS.map((w, i) => (
          <mesh key={`win-${i}`} position={w}>
            <boxGeometry args={[0.025, 0.08, 0.05]} />
            <meshBasicMaterial color={[2.4, 2.0, 1.4]} toneMapped={false} />
          </mesh>
        ))}
        {/* Running-light strips under the shoulder */}
        {[0.79, -0.79].map((x) => (
          <mesh key={`strip-${x}`} position={[x, -0.3, -0.38]}>
            <boxGeometry args={[0.015, 1.6, 0.03]} />
            <meshBasicMaterial color={[0.5, 1.1, 1.5]} toneMapped={false} />
          </mesh>
        ))}

        {/* Registry markings on the shoulder flanks */}
        <Text
          font={FONT_BOLD}
          fontSize={0.26}
          color="#c8d2dd"
          anchorX="center"
          anchorY="middle"
          position={[0.82, -0.45, -0.08]}
          rotation={[Math.PI / 2, Math.PI / 2, 0]}
        >
          SL-01
        </Text>
        <Text
          font={FONT_BOLD}
          fontSize={0.26}
          color="#c8d2dd"
          anchorX="center"
          anchorY="middle"
          position={[-0.82, -0.45, -0.08]}
          rotation={[Math.PI / 2, -Math.PI / 2, 0]}
        >
          SL-01
        </Text>

        {/* RCS pods + puff cones */}
        {RCS_PODS.map((pod, i) => (
          <group key={i} position={pod.pos}>
            <mesh>
              <boxGeometry args={[0.13, 0.18, 0.13]} />
              <meshStandardMaterial {...DARK} />
            </mesh>
            <mesh
              ref={(m) => {
                rcsRefs.current[i] = m
              }}
              position={[pod.dir[0] * 0.2, pod.dir[1] * 0.2, pod.dir[2] * 0.2]}
              quaternion={RCS_QUATS[i]}
            >
              <coneGeometry args={[0.07, 0.42, 8, 1, true]} />
              <meshBasicMaterial
                color="#cfe8ff"
                transparent
                opacity={0}
                blending={AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
        ))}

        {/* Main drive + corner bells behind the drum cap */}
        <group position={[0, -2.9, 0.08]}>
          <group>
            <mesh geometry={bell}>
              <meshStandardMaterial color="#10151c" metalness={0.9} roughness={0.3} side={2} />
            </mesh>
            <mesh position={[0, -0.12, 0]} rotation-x={Math.PI / 2}>
              <circleGeometry args={[0.22, 16]} />
              <meshBasicMaterial color={[0.5, 4.0, 6.0]} toneMapped={false} />
            </mesh>
            <mesh ref={plumeCoreRef} position={[0, -1.75, 0]} rotation-x={Math.PI} scale={[1, 0.001, 1]}>
              <coneGeometry args={[0.16, 2.9, 12, 1, true]} />
              <meshBasicMaterial
                color="#bfe8ff"
                transparent
                opacity={0}
                blending={AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            <mesh ref={plumeOuterRef} position={[0, -1.5, 0]} rotation-x={Math.PI} scale={[1, 0.001, 1]}>
              <coneGeometry args={[0.38, 2.3, 12, 1, true]} />
              <meshBasicMaterial
                color="#5aa8e8"
                transparent
                opacity={0}
                blending={AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
          {[
            [0.44, 0.24],
            [-0.44, 0.24],
            [0.44, -0.24],
            [-0.44, -0.24],
          ].map(([x, z], i) => (
            <group key={`aux-${i}`} position={[x, 0.02, z]}>
              <mesh geometry={smallBell}>
                <meshStandardMaterial color="#181c23" metalness={0.85} roughness={0.35} side={2} />
              </mesh>
              <mesh position={[0, -0.02, 0]} rotation-x={Math.PI / 2}>
                <circleGeometry args={[0.075, 10]} />
                <meshBasicMaterial color={[0.3, 1.6, 2.4]} toneMapped={false} />
              </mesh>
            </group>
          ))}
        </group>

        {/* Hull floodlights — the ship illuminates itself */}
        <pointLight position={[0, 1.6, 1.5]} color="#e8f0ff" intensity={4} distance={6} decay={2} />
        <pointLight position={[1.3, 2.6, -0.8]} color="#fff2dd" intensity={3} distance={5.5} decay={2} />
        <pointLight position={[-1.4, -1.4, 1.1]} color="#dde8ff" intensity={3.2} distance={6.5} decay={2} />
      </group>
      <pointLight ref={glowRef} position={[0, 0, 3.6]} color="#7fd4ff" intensity={0} distance={45} decay={2} />
    </group>
  )
}
