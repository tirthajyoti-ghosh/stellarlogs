import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Group,
  LatheGeometry,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Quaternion,
  Vector2,
  Vector3,
} from 'three'
import { createShipState, shipQuaternion, stepShip } from '../physics/integrator'
import { warp, stepWarp } from '../physics/warp'
import { shipInput } from '../physics/shipInput'
import { shipRig } from '../state/shipRig'
import { SPAWN_POSITION, SPAWN_YAW } from '../config/universe'

// Octagonal cross-section, rotated so a flat face sits on top
const OCT = Math.PI / 8

function makeEngineBell(): LatheGeometry {
  const profile = [
    new Vector2(0.2, 0.0),
    new Vector2(0.28, -0.24),
    new Vector2(0.42, -0.56),
    new Vector2(0.54, -0.82),
  ]
  return new LatheGeometry(profile, 20)
}

// Dark military palette — the ship carries its own lights
const HULL = { color: '#3d444d', metalness: 0.7, roughness: 0.38, flatShading: true }
const PANEL = { color: '#262c35', metalness: 0.65, roughness: 0.5, flatShading: true }
const DARK = { color: '#141922', metalness: 0.75, roughness: 0.42, flatShading: true }
const ACCENT = { color: '#b8451f', metalness: 0.4, roughness: 0.55, flatShading: true }

/**
 * RCS pods (local frame: +Y forward, +Z up, +X starboard). Each pod's puff
 * cone points along its exhaust direction; `fire` maps input to intensity —
 * exhaust opposite the wanted motion, fore/aft pairs for pure translation.
 */
import type { ShipInput } from '../physics/shipInput'
interface RcsPod {
  pos: [number, number, number]
  dir: [number, number, number]
  fire: (input: ShipInput) => number
}
const RCS_PODS: RcsPod[] = [
  // Yaw couple at the bow
  { pos: [0.56, 1.6, 0], dir: [1, 0, 0], fire: (i) => Math.max(0, i.yaw) },
  { pos: [-0.56, 1.6, 0], dir: [-1, 0, 0], fire: (i) => Math.max(0, -i.yaw) },
  // Lateral strafe pairs (exhaust opposite motion)
  { pos: [-0.58, 1.2, 0], dir: [-1, 0, 0], fire: (i) => Math.max(0, i.strafeX) },
  { pos: [-0.72, -1.4, 0], dir: [-1, 0, 0], fire: (i) => Math.max(0, i.strafeX) },
  { pos: [0.58, 1.2, 0], dir: [1, 0, 0], fire: (i) => Math.max(0, -i.strafeX) },
  { pos: [0.72, -1.4, 0], dir: [1, 0, 0], fire: (i) => Math.max(0, -i.strafeX) },
  // Vertical strafe pairs
  { pos: [0, 1.2, -0.58], dir: [0, 0, -1], fire: (i) => Math.max(0, i.strafeY) },
  { pos: [0, -1.4, -0.72], dir: [0, 0, -1], fire: (i) => Math.max(0, i.strafeY) },
  { pos: [0, 1.2, 0.58], dir: [0, 0, 1], fire: (i) => Math.max(0, -i.strafeY) },
  { pos: [0, -1.4, 0.72], dir: [0, 0, 1], fire: (i) => Math.max(0, -i.strafeY) },
  // Retro burn nozzles at the bow (exhaust forward = braking/reversing)
  { pos: [0.34, 2.7, 0], dir: [0, 1, 0], fire: (i) => i.reverse },
  { pos: [-0.34, 2.7, 0], dir: [0, 1, 0], fire: (i) => i.reverse },
]
const _podUp = new Vector3(0, 1, 0)
const RCS_QUATS = RCS_PODS.map((pod) => {
  const q = new Quaternion()
  q.setFromUnitVectors(_podUp, new Vector3(...pod.dir).normalize())
  return q
})

/** Lit portholes along the forward hull flanks. */
const WINDOWS: [number, number, number][] = [
  [0.54, 1.55, 0.12],
  [0.54, 1.25, 0.12],
  [0.55, 0.65, -0.1],
  [0.55, 0.25, 0.05],
  [-0.54, 1.4, 0.1],
  [-0.54, 1.0, -0.08],
  [-0.55, 0.4, 0.08],
  [-0.55, 0.05, -0.05],
]

/**
 * Owns the physics step (runs first each frame via negative priority) and
 * renders the ship — a dark Expanse-style corvette: blunt angular bow,
 * flat-shaded octagonal hull, layered plating, running lights and hull
 * floodlights that pick the shape out of the black. Local frame inside the
 * -90° X group: +Y = nose direction, +Z = up.
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

  const bell = useMemo(() => makeEngineBell(), [])

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
    // stretched white-hot afterburner while boosting
    const now = performance.now() / 1000
    const flicker = 1 + 0.05 * Math.sin(now * 43) + 0.035 * Math.sin(now * 97)
    const coreTarget = state.thrusting ? (state.boosting ? 3.4 : 1) : 0
    const outerTarget = state.thrusting ? (state.boosting ? 2.5 : 1) : 0
    const core = plumeCoreRef.current
    if (core) {
      const s = MathUtils.lerp(core.scale.y, coreTarget, 0.12) * flicker
      core.scale.set(state.boosting ? 1.15 : 1, Math.max(0.001, s), state.boosting ? 1.15 : 1)
      const mat = core.material as MeshBasicMaterial
      mat.opacity = 0.95 * Math.min(1, s)
      mat.color.setRGB(
        state.boosting ? 3.2 : 1.6,
        state.boosting ? 4.4 : 2.6,
        state.boosting ? 5.2 : 3.6,
      )
    }
    const outer = plumeOuterRef.current
    if (outer) {
      const s = MathUtils.lerp(outer.scale.y, outerTarget, 0.12) * flicker
      outer.scale.set(state.boosting ? 1.3 : 1, Math.max(0.001, s), state.boosting ? 1.3 : 1)
      ;(outer.material as MeshBasicMaterial).opacity = 0.45 * Math.min(1, s)
    }
    if (glowRef.current) {
      const target = state.thrusting ? (state.boosting ? 60 : 16) : 0
      glowRef.current.intensity = MathUtils.lerp(glowRef.current.intensity, target * flicker, 0.2)
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

    // RCS puffs fire opposite the wanted motion, like a real spacecraft
    RCS_PODS.forEach((pod, i) => {
      const mesh = rcsRefs.current[i]
      if (!mesh) return
      const mat = mesh.material as MeshBasicMaterial
      mat.opacity = MathUtils.lerp(mat.opacity, pod.fire(shipInput) * 0.85, 0.3)
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
  }, -2)

  return (
    <group ref={rigRef}>
      <group>
        <group rotation-x={-Math.PI / 2}>
          {/* Blunt angular bow with bridge visor */}
          <mesh position={[0, 2.78, 0]} rotation-y={OCT}>
            <cylinderGeometry args={[0.34, 0.38, 0.12, 8]} />
            <meshStandardMaterial {...DARK} />
          </mesh>
          <mesh position={[0, 2.4, 0]} rotation-y={OCT}>
            <cylinderGeometry args={[0.38, 0.52, 0.7, 8]} />
            <meshStandardMaterial {...HULL} />
          </mesh>
          <mesh position={[0, 2.8, 0.14]}>
            <boxGeometry args={[0.4, 0.06, 0.1]} />
            <meshBasicMaterial color={[1.6, 2.2, 2.8]} toneMapped={false} />
          </mesh>
          {/* Forward hull */}
          <mesh position={[0, 1.05, 0]} rotation-y={OCT}>
            <cylinderGeometry args={[0.52, 0.56, 2.0, 8]} />
            <meshStandardMaterial {...HULL} />
          </mesh>
          {/* Mid section */}
          <mesh position={[0, -0.5, 0]} rotation-y={OCT}>
            <cylinderGeometry args={[0.56, 0.68, 0.9, 8]} />
            <meshStandardMaterial {...PANEL} />
          </mesh>
          {/* Drive section */}
          <mesh position={[0, -1.6, 0]} rotation-y={OCT}>
            <cylinderGeometry args={[0.68, 0.76, 1.3, 8]} />
            <meshStandardMaterial {...HULL} />
          </mesh>
          {/* Burnt-orange hull stripes */}
          <mesh position={[0, 1.95, 0]} rotation-y={OCT}>
            <cylinderGeometry args={[0.523, 0.53, 0.2, 8]} />
            <meshStandardMaterial {...ACCENT} />
          </mesh>
          <mesh position={[0, -1.04, 0]} rotation-y={OCT}>
            <cylinderGeometry args={[0.687, 0.692, 0.24, 8]} />
            <meshStandardMaterial {...ACCENT} />
          </mesh>
          {/* Dorsal superstructure (bridge block) */}
          <group position={[0, 0.85, 0.6]}>
            <mesh>
              <boxGeometry args={[0.46, 0.95, 0.24]} />
              <meshStandardMaterial {...HULL} />
            </mesh>
            <mesh position={[0, 0.12, 0.16]}>
              <boxGeometry args={[0.34, 0.5, 0.1]} />
              <meshStandardMaterial {...PANEL} />
            </mesh>
            <mesh position={[0, 0.3, 0.13]}>
              <boxGeometry args={[0.26, 0.06, 0.06]} />
              <meshBasicMaterial color={[1.8, 2.2, 2.6]} toneMapped={false} />
            </mesh>
          </group>
          {/* Flank auxiliary drive pods */}
          {[0.74, -0.74].map((x) => (
            <group key={`pod-${x}`} position={[x, -0.85, 0]}>
              <mesh>
                <boxGeometry args={[0.3, 1.35, 0.44]} />
                <meshStandardMaterial {...PANEL} />
              </mesh>
              <mesh position={[0, -0.75, 0]}>
                <coneGeometry args={[0.12, 0.22, 10, 1, true]} />
                <meshStandardMaterial color="#10151c" metalness={0.9} roughness={0.3} side={2} />
              </mesh>
              <mesh position={[x > 0 ? 0.16 : -0.16, 0.4, 0]}>
                <boxGeometry args={[0.02, 0.3, 0.08]} />
                <meshBasicMaterial color={[2.4, 2.0, 1.4]} toneMapped={false} />
              </mesh>
            </group>
          ))}
          {/* Hull ribs at section joins */}
          {[
            { y: 2.02, r: 0.535 },
            { y: -0.06, r: 0.575 },
            { y: -0.96, r: 0.695 },
          ].map((rib) => (
            <mesh key={`rib-${rib.y}`} position={[0, rib.y, 0]} rotation-y={OCT}>
              <cylinderGeometry args={[rib.r, rib.r, 0.07, 8]} />
              <meshStandardMaterial {...PANEL} />
            </mesh>
          ))}
          {/* Docking hatch on the starboard flank */}
          <group position={[0.565, 0.25, 0]} rotation-z={-Math.PI / 2}>
            <mesh>
              <cylinderGeometry args={[0.16, 0.16, 0.05, 16]} />
              <meshStandardMaterial {...DARK} />
            </mesh>
            <mesh position={[0, 0.03, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.02, 16]} />
              <meshStandardMaterial {...PANEL} />
            </mesh>
          </group>
          {/* Sensor pod, port bow */}
          <group position={[-0.55, 1.75, 0.2]}>
            <mesh>
              <boxGeometry args={[0.12, 0.3, 0.12]} />
              <meshStandardMaterial {...DARK} />
            </mesh>
            <mesh position={[-0.09, 0.05, 0]} rotation-z={Math.PI / 2}>
              <coneGeometry args={[0.09, 0.1, 12]} />
              <meshStandardMaterial color="#5a636e" metalness={0.5} roughness={0.4} />
            </mesh>
          </group>
          {/* PDC turrets, dorsal and ventral */}
          {[
            { pos: [0.2, 1.75, 0.56] as const, up: 1 },
            { pos: [-0.25, 0.5, -0.6] as const, up: -1 },
          ].map((t, i) => (
            <group key={`pdc-${i}`} position={[t.pos[0], t.pos[1], t.pos[2]]}>
              <mesh>
                <boxGeometry args={[0.2, 0.26, 0.14]} />
                <meshStandardMaterial {...DARK} />
              </mesh>
              <mesh position={[0, 0.22, t.up * 0.02]} rotation-x={t.up * -0.35}>
                <cylinderGeometry args={[0.025, 0.025, 0.34, 6]} />
                <meshStandardMaterial {...DARK} />
              </mesh>
            </group>
          ))}
          {/* Lit portholes — sell the scale */}
          {WINDOWS.map((w, i) => (
            <mesh key={`win-${i}`} position={w}>
              <boxGeometry args={[0.025, 0.09, 0.055]} />
              <meshBasicMaterial color={[2.4, 2.0, 1.4]} toneMapped={false} />
            </mesh>
          ))}
          {/* Running-light strips along the hull */}
          {[0.555, -0.555].map((x) => (
            <mesh key={`strip-${x}`} position={[x, 0.85, -0.32]}>
              <boxGeometry args={[0.015, 1.7, 0.03]} />
              <meshBasicMaterial color={[0.5, 1.1, 1.5]} toneMapped={false} />
            </mesh>
          ))}
          {/* Navigation lights: port red / starboard green / white strobe */}
          <mesh ref={starboardLightRef} position={[0.6, 1.05, 0.35]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial color={[0.1, 2.2, 0.15]} toneMapped={false} />
          </mesh>
          <mesh ref={portLightRef} position={[-0.6, 1.05, 0.35]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial color={[2.4, 0.1, 0.1]} toneMapped={false} />
          </mesh>
          {/* Dorsal comms mast with strobe */}
          <group position={[0, 1.35, 0.56]}>
            <mesh>
              <cylinderGeometry args={[0.015, 0.015, 0.55, 6]} />
              <meshStandardMaterial {...DARK} />
            </mesh>
            <mesh ref={strobeRef} position={[0, 0.3, 0]}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshBasicMaterial color={[1, 1, 1]} toneMapped={false} />
            </mesh>
          </group>
          {/* Propellant tanks tucked against the drive section */}
          {[0.62, -0.62].map((z) => (
            <mesh key={`tank-${z}`} position={[0, -1.45, z]} rotation-x={Math.PI / 2}>
              <capsuleGeometry args={[0.15, 0.9, 6, 12]} />
              <meshStandardMaterial color="#4a525c" metalness={0.65} roughness={0.35} />
            </mesh>
          ))}
          {/* Radiator panels on the drive section */}
          {[0.79, -0.79].map((x) => (
            <mesh key={`rad-${x}`} position={[x, -1.6, 0]}>
              <boxGeometry args={[0.035, 1.05, 0.6]} />
              <meshStandardMaterial color="#10151c" metalness={0.4} roughness={0.6} />
            </mesh>
          ))}
          {/* RCS pods + puff cones, all around the hull */}
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
          {/* Vernier thrusters around the main drive */}
          {[
            [0.45, 0.45],
            [-0.45, 0.45],
            [0.45, -0.45],
            [-0.45, -0.45],
          ].map(([x, z], i) => (
            <mesh key={`vern-${i}`} position={[x, -2.22, z]}>
              <coneGeometry args={[0.09, 0.24, 10, 1, true]} />
              <meshStandardMaterial color="#10151c" metalness={0.9} roughness={0.3} side={2} />
            </mesh>
          ))}
          {/* Drive bell + plume */}
          <group position={[0, -2.25, 0]}>
            <mesh geometry={bell}>
              <meshStandardMaterial color="#10151c" metalness={0.9} roughness={0.3} side={2} />
            </mesh>
            <mesh position={[0, -0.1, 0]} rotation-x={Math.PI / 2}>
              <circleGeometry args={[0.19, 16]} />
              <meshBasicMaterial color={[0.5, 4.0, 6.0]} toneMapped={false} />
            </mesh>
            <mesh ref={plumeCoreRef} position={[0, -1.7, 0]} rotation-x={Math.PI} scale={[1, 0.001, 1]}>
              <coneGeometry args={[0.14, 2.8, 12, 1, true]} />
              <meshBasicMaterial
                color="#bfe8ff"
                transparent
                opacity={0}
                blending={AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            <mesh ref={plumeOuterRef} position={[0, -1.45, 0]} rotation-x={Math.PI} scale={[1, 0.001, 1]}>
              <coneGeometry args={[0.34, 2.2, 12, 1, true]} />
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
          {/* Hull floodlights — the ship illuminates itself */}
          <pointLight position={[0, 1.6, 1.3]} color="#e8f0ff" intensity={3} distance={5.5} decay={2} />
          <pointLight position={[0.9, 2.5, -0.6]} color="#fff2dd" intensity={2.2} distance={5} decay={2} />
          <pointLight position={[-1.1, -1.3, 0.9]} color="#dde8ff" intensity={2.4} distance={6} decay={2} />
        </group>
        <pointLight ref={glowRef} position={[0, 0, 3.2]} color="#7fd4ff" intensity={0} distance={45} decay={2} />
      </group>
    </group>
  )
}
