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

function makeHull(): LatheGeometry {
  const profile = [
    new Vector2(0.001, -2.0),
    new Vector2(0.42, -1.95),
    new Vector2(0.58, -1.5),
    new Vector2(0.54, -0.9),
    new Vector2(0.52, 0.6),
    new Vector2(0.48, 1.6),
    new Vector2(0.34, 2.5),
    new Vector2(0.12, 3.0),
    new Vector2(0.001, 3.25),
  ]
  return new LatheGeometry(profile, 28)
}

function makeEngineBell(): LatheGeometry {
  const profile = [
    new Vector2(0.14, 0.0),
    new Vector2(0.2, -0.18),
    new Vector2(0.3, -0.42),
    new Vector2(0.38, -0.62),
  ]
  return new LatheGeometry(profile, 20)
}

const HULL = { color: '#dde2ea', metalness: 0.45, roughness: 0.38 }
const PANEL = { color: '#2b3242', metalness: 0.7, roughness: 0.45 }
const ACCENT = { color: '#e8622a', metalness: 0.3, roughness: 0.5 }

/** RCS pod positions (x, z) around the hull at mid-ship. */
const RCS_PODS: { pos: [number, number, number]; axis: 'yaw' | 'pitch'; sign: 1 | -1 }[] = [
  // exhaust +X pushes the nose -X (a left turn = yaw +)
  { pos: [0.56, 1.7, 0], axis: 'yaw', sign: 1 },
  { pos: [-0.56, 1.7, 0], axis: 'yaw', sign: -1 },
  // exhaust +Z (up) pushes the nose down (pitch -)
  { pos: [0, 1.7, 0.56], axis: 'pitch', sign: -1 },
  { pos: [0, 1.7, -0.56], axis: 'pitch', sign: 1 },
]

/**
 * Owns the physics step (runs first each frame via negative priority) and
 * renders the ship — an Expanse-style utilitarian spacecraft: hull, engine
 * bell, RCS pods, radiators, tanks. Local frame inside the -90° X group:
 * +Y = nose direction, +Z = up.
 */
export function Ship() {
  const rigRef = useRef<Group>(null)
  const bankRef = useRef<Group>(null)
  const glowRef = useRef<PointLight>(null)
  const plumeRef = useRef<Mesh>(null)
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

  const hull = useMemo(() => makeHull(), [])
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

    // Main drive plume tracks thrust
    const plumeTarget = state.thrusting ? (state.boosting ? 2.6 : 1) : 0
    const plume = plumeRef.current
    if (plume) {
      const s = MathUtils.lerp(plume.scale.y, plumeTarget, 0.15)
      plume.scale.set(1, Math.max(0.001, s), 1)
      ;(plume.material as MeshBasicMaterial).opacity = 0.8 * Math.min(1, s)
    }
    if (glowRef.current) {
      const target = state.thrusting ? (state.boosting ? 34 : 14) : 0
      glowRef.current.intensity = MathUtils.lerp(glowRef.current.intensity, target, 0.2)
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
          {/* Hull */}
          <mesh geometry={hull}>
            <meshStandardMaterial {...HULL} />
          </mesh>
          {/* Nose stripe + rear stripe (racing accents) */}
          <mesh position={[0, 2.35, 0]}>
            <cylinderGeometry args={[0.415, 0.44, 0.18, 28]} />
            <meshStandardMaterial {...ACCENT} />
          </mesh>
          <mesh position={[0, -1.1, 0]}>
            <cylinderGeometry args={[0.545, 0.55, 0.22, 28]} />
            <meshStandardMaterial {...ACCENT} />
          </mesh>
          {/* Cockpit window band near the nose */}
          {[-0.35, 0, 0.35].map((a) => (
            <mesh key={a} position={[Math.sin(a) * 0.33, 2.72, Math.cos(a) * 0.33 * 0.9 + 0.06]} rotation-y={a}>
              <boxGeometry args={[0.16, 0.34, 0.05]} />
              <meshStandardMaterial
                color="#0a141f"
                metalness={0.5}
                roughness={0.1}
                emissive="#4a7a9a"
                emissiveIntensity={0.5}
              />
            </mesh>
          ))}
          {/* Dorsal antenna */}
          <group position={[0, 1.0, 0.5]}>
            <mesh>
              <cylinderGeometry args={[0.015, 0.015, 0.5, 6]} />
              <meshStandardMaterial {...PANEL} />
            </mesh>
            <mesh position={[0, 0.28, 0]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshBasicMaterial color={[3.5, 0.9, 0.6]} toneMapped={false} />
            </mesh>
          </group>
          {/* Side fuel tanks */}
          {[0.6, -0.6].map((x) => (
            <mesh key={x} position={[x, -0.3, -0.12]}>
              <capsuleGeometry args={[0.16, 1.5, 6, 12]} />
              <meshStandardMaterial color="#aab2c0" metalness={0.6} roughness={0.35} />
            </mesh>
          ))}
          {/* Radiator panels (flush, vertical — not wings) */}
          {[0.7, -0.7].map((x) => (
            <mesh key={x} position={[x, -1.15, 0]}>
              <boxGeometry args={[0.03, 1.1, 0.55]} />
              <meshStandardMaterial color="#1a222f" metalness={0.4} roughness={0.6} />
            </mesh>
          ))}
          {/* RCS pods + puff cones */}
          {RCS_PODS.map((pod, i) => {
            const dir = new Vector3(pod.pos[0], 0, pod.pos[2]).normalize()
            return (
              <group key={i} position={pod.pos}>
                <mesh>
                  <boxGeometry args={[0.14, 0.22, 0.14]} />
                  <meshStandardMaterial {...PANEL} />
                </mesh>
                <mesh
                  ref={(m) => {
                    rcsRefs.current[i] = m
                  }}
                  position={[dir.x * 0.22, 0, dir.z * 0.22]}
                  rotation={[dir.z !== 0 ? (dir.z > 0 ? Math.PI / 2 : -Math.PI / 2) : 0, 0, dir.x !== 0 ? (dir.x > 0 ? -Math.PI / 2 : Math.PI / 2) : 0]}
                >
                  <coneGeometry args={[0.07, 0.4, 8, 1, true]} />
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
          {/* Engine bell + plume */}
          <group position={[0, -2.0, 0]}>
            <mesh geometry={bell}>
              <meshStandardMaterial color="#1a2230" metalness={0.9} roughness={0.3} side={2} />
            </mesh>
            <mesh position={[0, -0.05, 0]} rotation-x={Math.PI / 2}>
              <circleGeometry args={[0.13, 16]} />
              <meshBasicMaterial color={[0.5, 4.0, 6.0]} toneMapped={false} />
            </mesh>
            <mesh ref={plumeRef} position={[0, -1.35, 0]} rotation-x={Math.PI} scale={[1, 0.001, 1]}>
              <coneGeometry args={[0.24, 2.2, 12, 1, true]} />
              <meshBasicMaterial
                color="#7fd4ff"
                transparent
                opacity={0}
                blending={AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
        </group>
        <pointLight ref={glowRef} position={[0, 0, 3]} color="#7fd4ff" intensity={0} distance={45} decay={2} />
      </group>
    </group>
  )
}
