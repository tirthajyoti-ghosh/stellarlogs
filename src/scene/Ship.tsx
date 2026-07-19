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
  Vector2,
  Vector3,
} from 'three'
import { createShipState, shipQuaternion, stepShip } from '../physics/integrator'
import { shipInput } from '../physics/shipInput'
import { shipRig } from '../state/shipRig'
import { SPAWN_POSITION, SPAWN_YAW } from '../config/universe'

// Spacecraft, not aircraft: barely any bank, attitude comes from RCS puffs
const BANK_FACTOR = 0.16
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

const HULL = { color: '#98a1ad', metalness: 0.55, roughness: 0.42, flatShading: true }
const PANEL = { color: '#4a5262', metalness: 0.6, roughness: 0.5, flatShading: true }
const DARK = { color: '#2a3140', metalness: 0.7, roughness: 0.45, flatShading: true }
const ACCENT = { color: '#d95f2b', metalness: 0.35, roughness: 0.55, flatShading: true }

/** RCS pod positions (x, z) around the hull toward the bow. */
const RCS_PODS: { pos: [number, number, number]; axis: 'yaw' | 'pitch'; sign: 1 | -1 }[] = [
  // exhaust +X pushes the nose -X (a left turn = yaw +)
  { pos: [0.6, 1.6, 0], axis: 'yaw', sign: 1 },
  { pos: [-0.6, 1.6, 0], axis: 'yaw', sign: -1 },
  // exhaust +Z (up) pushes the nose down (pitch -)
  { pos: [0, 1.6, 0.6], axis: 'pitch', sign: -1 },
  { pos: [0, 1.6, -0.6], axis: 'pitch', sign: 1 },
]

/** Lit portholes along the forward hull flanks. */
const WINDOWS: [number, number, number][] = [
  [0.55, 1.25, 0.12],
  [0.55, 0.95, 0.12],
  [0.55, 0.35, -0.1],
  [0.56, -0.05, 0.05],
  [-0.55, 1.1, 0.1],
  [-0.55, 0.7, -0.08],
  [-0.56, 0.1, 0.08],
  [-0.56, -0.25, -0.05],
]

/**
 * Owns the physics step (runs first each frame via negative priority) and
 * renders the ship — an Expanse-style corvette: angular flat-shaded octagonal
 * hull sections, layered plating, PDC turrets, RCS pods, drive bell. Local
 * frame inside the -90° X group: +Y = nose direction, +Z = up.
 */
export function Ship() {
  const rigRef = useRef<Group>(null)
  const bankRef = useRef<Group>(null)
  const glowRef = useRef<PointLight>(null)
  const plumeCoreRef = useRef<Mesh>(null)
  const plumeOuterRef = useRef<Mesh>(null)
  const rcsRefs = useRef<(Mesh | null)[]>([])
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
    const alpha = stepShip(state, shipInput, dt)
    const rig = rigRef.current
    if (!rig) return

    rig.position.lerpVectors(state.prevPosition, state.position, alpha)
    const yaw = MathUtils.lerp(state.prevYaw, state.yaw, alpha)
    const pitch = MathUtils.lerp(state.prevPitch, state.pitch, alpha)
    shipQuaternion(yaw, pitch, rig.quaternion)

    if (bankRef.current) {
      bankRef.current.rotation.z = state.yawRateSmooth * BANK_FACTOR
    }

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

    // RCS puffs fire opposite the turn direction, like a real spacecraft
    RCS_PODS.forEach((pod, i) => {
      const mesh = rcsRefs.current[i]
      if (!mesh) return
      const input = pod.axis === 'yaw' ? shipInput.yaw : shipInput.pitch
      const firing = Math.max(0, input * pod.sign)
      const mat = mesh.material as MeshBasicMaterial
      mat.opacity = MathUtils.lerp(mat.opacity, firing * 0.85, 0.3)
    })

    // Publish for camera / HUD / proximity
    shipRig.position.copy(rig.position)
    shipRig.quaternion.copy(rig.quaternion)
    shipRig.speed = state.speed
    shipRig.boosting = state.boosting
    shipRig.thrusting = state.thrusting
    shipRig.boostCharge = state.boostCharge
    shipRig.yaw = yaw
  }, -2)

  return (
    <group ref={rigRef}>
      <group ref={bankRef}>
        <group rotation-x={-Math.PI / 2}>
          {/* Angular octagonal hull, bow to stern */}
          <mesh position={[0, 3.0, 0]} rotation-y={OCT}>
            <cylinderGeometry args={[0.1, 0.22, 0.35, 8]} />
            <meshStandardMaterial {...DARK} />
          </mesh>
          <mesh position={[0, 2.2, 0]} rotation-y={OCT}>
            <cylinderGeometry args={[0.22, 0.52, 1.3, 8]} />
            <meshStandardMaterial {...HULL} />
          </mesh>
          <mesh position={[0, 0.7, 0]} rotation-y={OCT}>
            <cylinderGeometry args={[0.52, 0.56, 1.7, 8]} />
            <meshStandardMaterial {...HULL} />
          </mesh>
          <mesh position={[0, -0.6, 0]} rotation-y={OCT}>
            <cylinderGeometry args={[0.56, 0.68, 0.9, 8]} />
            <meshStandardMaterial {...PANEL} />
          </mesh>
          <mesh position={[0, -1.7, 0]} rotation-y={OCT}>
            <cylinderGeometry args={[0.68, 0.76, 1.3, 8]} />
            <meshStandardMaterial {...HULL} />
          </mesh>
          {/* Orange hull stripes */}
          <mesh position={[0, 1.72, 0]} rotation-y={OCT}>
            <cylinderGeometry args={[0.527, 0.535, 0.24, 8]} />
            <meshStandardMaterial {...ACCENT} />
          </mesh>
          <mesh position={[0, -1.14, 0]} rotation-y={OCT}>
            <cylinderGeometry args={[0.695, 0.7, 0.26, 8]} />
            <meshStandardMaterial {...ACCENT} />
          </mesh>
          {/* Raised armor plating on the flanks and spine */}
          {[0.56, -0.56].map((x) => (
            <mesh key={`plate-${x}`} position={[x, 0.6, 0]}>
              <boxGeometry args={[0.07, 1.5, 0.62]} />
              <meshStandardMaterial {...PANEL} />
            </mesh>
          ))}
          <mesh position={[0, 0.9, 0.55]}>
            <boxGeometry args={[0.7, 1.1, 0.07]} />
            <meshStandardMaterial {...PANEL} />
          </mesh>
          <mesh position={[0, -0.1, -0.56]}>
            <boxGeometry args={[0.66, 0.9, 0.06]} />
            <meshStandardMaterial {...PANEL} />
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
                <meshStandardMaterial color="#1a2230" metalness={0.9} roughness={0.3} side={2} />
              </mesh>
              <mesh position={[x > 0 ? 0.16 : -0.16, 0.4, 0]}>
                <boxGeometry args={[0.02, 0.3, 0.08]} />
                <meshBasicMaterial color={[2.4, 2.0, 1.4]} toneMapped={false} />
              </mesh>
            </group>
          ))}
          {/* Hull ribs at section joins */}
          {[
            { y: 1.55, r: 0.545 },
            { y: -0.14, r: 0.585 },
            { y: -1.06, r: 0.705 },
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
          <group position={[-0.55, 1.35, 0.2]}>
            <mesh>
              <boxGeometry args={[0.12, 0.3, 0.12]} />
              <meshStandardMaterial {...DARK} />
            </mesh>
            <mesh position={[-0.09, 0.05, 0]} rotation-z={Math.PI / 2}>
              <coneGeometry args={[0.09, 0.1, 12]} />
              <meshStandardMaterial color="#c8ccd4" metalness={0.5} roughness={0.4} />
            </mesh>
          </group>
          {/* PDC turrets, dorsal and ventral */}
          {[
            { pos: [0.2, 1.45, 0.6] as const, up: 1 },
            { pos: [-0.25, 0.2, -0.62] as const, up: -1 },
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
          {/* Dorsal comms mast */}
          <group position={[0, 1.0, 0.56]}>
            <mesh>
              <cylinderGeometry args={[0.015, 0.015, 0.55, 6]} />
              <meshStandardMaterial {...DARK} />
            </mesh>
            <mesh position={[0, 0.3, 0]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshBasicMaterial color={[3.5, 0.9, 0.6]} toneMapped={false} />
            </mesh>
          </group>
          {/* Propellant tanks tucked against the drive section */}
          {[0.62, -0.62].map((z) => (
            <mesh key={`tank-${z}`} position={[0, -1.55, z]} rotation-x={Math.PI / 2}>
              <capsuleGeometry args={[0.15, 0.9, 6, 12]} />
              <meshStandardMaterial color="#7d8794" metalness={0.6} roughness={0.35} />
            </mesh>
          ))}
          {/* Radiator panels on the drive section */}
          {[0.79, -0.79].map((x) => (
            <mesh key={`rad-${x}`} position={[x, -1.7, 0]}>
              <boxGeometry args={[0.035, 1.05, 0.6]} />
              <meshStandardMaterial color="#1a222f" metalness={0.4} roughness={0.6} />
            </mesh>
          ))}
          {/* RCS pods + puff cones */}
          {RCS_PODS.map((pod, i) => {
            const dir = new Vector3(pod.pos[0], 0, pod.pos[2]).normalize()
            return (
              <group key={i} position={pod.pos}>
                <mesh>
                  <boxGeometry args={[0.16, 0.24, 0.16]} />
                  <meshStandardMaterial {...DARK} />
                </mesh>
                <mesh
                  ref={(m) => {
                    rcsRefs.current[i] = m
                  }}
                  position={[dir.x * 0.24, 0, dir.z * 0.24]}
                  rotation={[dir.z !== 0 ? (dir.z > 0 ? Math.PI / 2 : -Math.PI / 2) : 0, 0, dir.x !== 0 ? (dir.x > 0 ? -Math.PI / 2 : Math.PI / 2) : 0]}
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
            )
          })}
          {/* Vernier thrusters around the main drive */}
          {[
            [0.45, 0.45],
            [-0.45, 0.45],
            [0.45, -0.45],
            [-0.45, -0.45],
          ].map(([x, z], i) => (
            <mesh key={`vern-${i}`} position={[x, -2.32, z]}>
              <coneGeometry args={[0.09, 0.24, 10, 1, true]} />
              <meshStandardMaterial color="#1a2230" metalness={0.9} roughness={0.3} side={2} />
            </mesh>
          ))}
          {/* Drive bell + plume */}
          <group position={[0, -2.35, 0]}>
            <mesh geometry={bell}>
              <meshStandardMaterial color="#1a2230" metalness={0.9} roughness={0.3} side={2} />
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
        </group>
        <pointLight ref={glowRef} position={[0, 0, 3.2]} color="#7fd4ff" intensity={0} distance={45} decay={2} />
      </group>
    </group>
  )
}
