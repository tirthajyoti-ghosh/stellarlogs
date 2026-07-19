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
import { makeHullGeometry, makePanelTextures } from './shipGeometry'

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
  // Yaw couple
  { pos: [0.6, 2.0, 0], dir: [1, 0, 0], fire: (i) => Math.max(0, i.yaw) },
  { pos: [-0.86, -1.6, 0], dir: [-1, 0, 0], fire: (i) => Math.max(0, i.yaw) },
  { pos: [-0.6, 2.0, 0], dir: [-1, 0, 0], fire: (i) => Math.max(0, -i.yaw) },
  { pos: [0.86, -1.6, 0], dir: [1, 0, 0], fire: (i) => Math.max(0, -i.yaw) },
  // Pitch couple
  { pos: [0, 2.0, -0.34], dir: [0, 0, -1], fire: (i) => Math.max(0, i.pitch) },
  { pos: [0, -1.6, 0.54], dir: [0, 0, 1], fire: (i) => Math.max(0, i.pitch) },
  { pos: [0, 2.0, 0.34], dir: [0, 0, 1], fire: (i) => Math.max(0, -i.pitch) },
  { pos: [0, -1.6, -0.54], dir: [0, 0, -1], fire: (i) => Math.max(0, -i.pitch) },
  // Lateral strafe pairs
  { pos: [-0.68, 1.1, 0], dir: [-1, 0, 0], fire: (i) => Math.max(0, i.strafeX) },
  { pos: [-0.87, -1.1, 0], dir: [-1, 0, 0], fire: (i) => Math.max(0, i.strafeX) },
  { pos: [0.68, 1.1, 0], dir: [1, 0, 0], fire: (i) => Math.max(0, -i.strafeX) },
  { pos: [0.87, -1.1, 0], dir: [1, 0, 0], fire: (i) => Math.max(0, -i.strafeX) },
  // Retro burn nozzles at the bow
  { pos: [0.28, 2.85, 0], dir: [0, 1, 0], fire: (i) => i.reverse },
  { pos: [-0.28, 2.85, 0], dir: [0, 1, 0], fire: (i) => i.reverse },
]
const _podUp = new Vector3(0, 1, 0)
const RCS_QUATS = RCS_PODS.map((pod) => {
  const q = new Quaternion()
  q.setFromUnitVectors(_podUp, new Vector3(...pod.dir).normalize())
  return q
})

/** Lit portholes along both flanks, two rows. */
const WINDOWS: [number, number, number][] = [
  [0.76, 1.5, 0.14],
  [0.78, 1.1, 0.14],
  [0.8, 0.6, 0.14],
  [0.81, 0.1, 0.14],
  [0.82, -0.5, 0.14],
  [-0.76, 1.35, 0.1],
  [-0.79, 0.85, 0.1],
  [-0.81, 0.25, 0.1],
  [-0.82, -0.35, 0.1],
  [0.79, 0.75, -0.22],
  [0.81, 0.15, -0.22],
  [-0.8, 0.45, -0.22],
  [-0.82, -0.15, -0.22],
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

  const hull = useMemo(() => makeHullGeometry(), [])
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
        {/* Lofted slab hull with armored plating */}
        <mesh geometry={hull} material={hullMaterial} />

        {/* Dorsal spine plate */}
        <mesh position={[0, 0.3, 0.45]} material={plateMaterial}>
          <boxGeometry args={[0.7, 2.6, 0.1]} />
        </mesh>
        {/* Ventral keel plate */}
        <mesh position={[0, 0.1, -0.46]} material={plateMaterial}>
          <boxGeometry args={[0.6, 2.2, 0.09]} />
        </mesh>
        {/* Flank armor plates */}
        {[0.83, -0.83].map((x) => (
          <mesh key={`flank-${x}`} position={[x, -0.3, 0]} material={plateMaterial}>
            <boxGeometry args={[0.07, 1.9, 0.66]} />
          </mesh>
        ))}

        {/* Cockpit glazing set into the upper bow */}
        <group position={[0, 2.42, 0.28]} rotation-x={0.18}>
          <mesh material={plateMaterial}>
            <boxGeometry args={[0.56, 0.5, 0.09]} />
          </mesh>
          {[-0.16, 0, 0.16].map((x) => (
            <mesh key={x} position={[x, 0.08, 0.052]}>
              <boxGeometry args={[0.11, 0.2, 0.012]} />
              <meshStandardMaterial
                color="#0a141f"
                metalness={0.5}
                roughness={0.1}
                emissive="#3a6a92"
                emissiveIntensity={0.7}
              />
            </mesh>
          ))}
        </group>

        {/* Torpedo tube doors on the upper bow face */}
        {[0.24, -0.24].map((x) => (
          <group key={`torp-${x}`} position={[x, 1.85, 0.36]} rotation-x={0.1}>
            <mesh>
              <boxGeometry args={[0.26, 0.44, 0.04]} />
              <meshStandardMaterial {...PANEL} />
            </mesh>
            <mesh position={[0, 0, 0.022]}>
              <boxGeometry args={[0.2, 0.38, 0.008]} />
              <meshStandardMaterial {...DARK} />
            </mesh>
          </group>
        ))}

        {/* PDC turrets around the hull */}
        <Pdc position={[0.34, 0.9, 0.44]} />
        <Pdc position={[-0.42, -0.4, 0.47]} yaw={2.4} />
        <Pdc position={[0.3, 0.1, -0.45]} up={-1} yaw={0.8} />
        <Pdc position={[-0.3, 1.3, -0.41]} up={-1} yaw={-1.8} />

        {/* MCRN-style accent striping */}
        <mesh position={[0, 2.0, 0.34]} rotation-x={0.13}>
          <boxGeometry args={[0.9, 0.14, 0.03]} />
          <meshStandardMaterial {...ACCENT} />
        </mesh>
        {[0.845, -0.845].map((x) => (
          <mesh key={`stripe-${x}`} position={[x, -1.45, 0]}>
            <boxGeometry args={[0.04, 0.7, 0.5]} />
            <meshStandardMaterial {...ACCENT} />
          </mesh>
        ))}

        {/* Hull conduits along the dorsal spine */}
        {[0.22, -0.22].map((x) => (
          <mesh key={`pipe-${x}`} position={[x, -0.2, 0.51]}>
            <cylinderGeometry args={[0.03, 0.03, 2.2, 6]} />
            <meshStandardMaterial {...PANEL} />
          </mesh>
        ))}
        {[0.6, -0.4, -1.1].map((y) => (
          <mesh key={`clamp-${y}`} position={[0.22, y, 0.51]}>
            <boxGeometry args={[0.1, 0.05, 0.1]} />
            <meshStandardMaterial {...DARK} />
          </mesh>
        ))}

        {/* Equipment boxes */}
        <mesh position={[0.4, 1.5, -0.36]} material={plateMaterial}>
          <boxGeometry args={[0.3, 0.44, 0.14]} />
        </mesh>
        <mesh position={[-0.35, 0.6, -0.44]}>
          <boxGeometry args={[0.24, 0.3, 0.12]} />
          <meshStandardMaterial {...DARK} />
        </mesh>
        <mesh position={[-0.15, -0.9, 0.49]} material={plateMaterial}>
          <boxGeometry args={[0.36, 0.34, 0.12]} />
        </mesh>

        {/* Aft mini comms dish */}
        <group position={[0.5, -0.7, 0.52]} rotation-x={-0.6} rotation-z={0.3}>
          <mesh>
            <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
            <meshStandardMaterial {...DARK} />
          </mesh>
          <mesh position={[0, 0.2, 0]} rotation-x={0.4}>
            <coneGeometry args={[0.11, 0.05, 12, 1, true]} />
            <meshStandardMaterial color="#7d8794" metalness={0.6} roughness={0.35} side={2} />
          </mesh>
        </group>
        {/* Whip antenna */}
        <mesh position={[-0.35, -1.3, -0.52]} rotation-x={0.5}>
          <cylinderGeometry args={[0.008, 0.003, 0.7, 4]} />
          <meshStandardMaterial {...DARK} />
        </mesh>

        {/* Strobe mast */}
        <group position={[0, 0.9, 0.54]}>
          <mesh>
            <cylinderGeometry args={[0.014, 0.014, 0.4, 6]} />
            <meshStandardMaterial {...DARK} />
          </mesh>
          <mesh ref={strobeRef} position={[0, 0.24, 0]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color={[1, 1, 1]} toneMapped={false} />
          </mesh>
        </group>

        {/* Navigation lights on the flanks */}
        <mesh ref={starboardLightRef} position={[0.85, 0.9, 0.2]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color={[0.1, 2.2, 0.15]} toneMapped={false} />
        </mesh>
        <mesh ref={portLightRef} position={[-0.85, 0.9, 0.2]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color={[2.4, 0.1, 0.1]} toneMapped={false} />
        </mesh>

        {/* Forward docking lights */}
        {[0.24, -0.24].map((x) => (
          <mesh key={`dock-${x}`} position={[x, 3.0, -0.14]}>
            <sphereGeometry args={[0.03, 6, 6]} />
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
        {/* Running-light strips */}
        {[0.835, -0.835].map((x) => (
          <mesh key={`strip-${x}`} position={[x, 0.5, -0.34]}>
            <boxGeometry args={[0.015, 1.9, 0.03]} />
            <meshBasicMaterial color={[0.5, 1.1, 1.5]} toneMapped={false} />
          </mesh>
        ))}

        {/* Registry markings */}
        <Text
          font={FONT_BOLD}
          fontSize={0.3}
          color="#c8d2dd"
          anchorX="center"
          anchorY="middle"
          position={[0.87, 0.35, -0.02]}
          rotation={[Math.PI / 2, Math.PI / 2, 0]}
        >
          SL-01
        </Text>
        <Text
          font={FONT_BOLD}
          fontSize={0.3}
          color="#c8d2dd"
          anchorX="center"
          anchorY="middle"
          position={[-0.87, 0.35, -0.02]}
          rotation={[Math.PI / 2, -Math.PI / 2, 0]}
        >
          SL-01
        </Text>

        {/* Propellant tanks against the drive block */}
        {[0.5, -0.5].map((z) => (
          <mesh key={`tank-${z}`} position={[0, -1.7, z]} rotation-x={Math.PI / 2}>
            <capsuleGeometry args={[0.16, 0.9, 6, 12]} />
            <meshStandardMaterial color="#454c55" metalness={0.6} roughness={0.45} />
          </mesh>
        ))}
        {/* Radiator panels near the stern */}
        {[0.9, -0.9].map((x) => (
          <mesh key={`rad-${x}`} position={[x, -1.6, 0]}>
            <boxGeometry args={[0.035, 0.95, 0.55]} />
            <meshStandardMaterial color="#10151c" metalness={0.4} roughness={0.6} />
          </mesh>
        ))}

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

        {/* Drive block: stern plate, main bell, four corner bells */}
        <group position={[0, -2.15, 0]}>
          <mesh position={[0, -0.03, 0]} material={plateMaterial}>
            <boxGeometry args={[1.45, 0.12, 0.88]} />
          </mesh>
          <group position={[0, -0.1, 0]}>
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
          {/* Corner auxiliary bells */}
          {[
            [0.52, 0.28],
            [-0.52, 0.28],
            [0.52, -0.28],
            [-0.52, -0.28],
          ].map(([x, z], i) => (
            <group key={`aux-${i}`} position={[x, -0.08, z]}>
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
        <pointLight position={[0, 1.6, 1.4]} color="#e8f0ff" intensity={4} distance={6} decay={2} />
        <pointLight position={[1.2, 2.5, -0.7]} color="#fff2dd" intensity={3} distance={5.5} decay={2} />
        <pointLight position={[-1.3, -1.3, 1.0]} color="#dde8ff" intensity={3.2} distance={6.5} decay={2} />
      </group>
      <pointLight ref={glowRef} position={[0, 0, 3.4]} color="#7fd4ff" intensity={0} distance={45} decay={2} />
    </group>
  )
}
