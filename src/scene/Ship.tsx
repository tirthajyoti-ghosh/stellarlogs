import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import {
  AdditiveBlending,
  BufferGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  Quaternion,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createShipState, shipQuaternion, stepShip } from '../physics/integrator'
import { warp, warpTurn, stepWarp } from '../physics/warp'
import { shipInput } from '../physics/shipInput'
import type { ShipInput } from '../physics/shipInput'
import { shipRig } from '../state/shipRig'
import { SPAWN_POSITION, SPAWN_YAW } from '../config/universe'

const MODEL_URL = '/models/tachi.glb'
// Raw model: ~480 units long, bow at +Z, drive at -Z, +Y up. Scale to ~6.5
// ship units and recentre (raw hull centre sits at z ≈ +57.7).
const MODEL_SCALE = 0.0135
const MODEL_CENTER = 57.65 * MODEL_SCALE

/**
 * RCS pods (local frame: +Y forward, +Z up, +X starboard) on the hull.
 * Exhaust opposite the wanted motion; bow/stern couples for rotation.
 */
interface RcsPod {
  pos: [number, number, number]
  dir: [number, number, number]
  fire: (input: ShipInput) => number
}
const RCS_PODS: RcsPod[] = [
  // Yaw couple: bow pods + stern pods
  { pos: [0.3, 2.3, 0], dir: [1, 0, 0], fire: (i) => Math.max(0, i.yaw) },
  { pos: [-0.62, -2.0, 0], dir: [-1, 0, 0], fire: (i) => Math.max(0, i.yaw) },
  { pos: [-0.3, 2.3, 0], dir: [-1, 0, 0], fire: (i) => Math.max(0, -i.yaw) },
  { pos: [0.62, -2.0, 0], dir: [1, 0, 0], fire: (i) => Math.max(0, -i.yaw) },
  // Pitch couple
  { pos: [0, 2.3, -0.3], dir: [0, 0, -1], fire: (i) => Math.max(0, i.pitch) },
  { pos: [0, -2.0, 0.55], dir: [0, 0, 1], fire: (i) => Math.max(0, i.pitch) },
  { pos: [0, 2.3, 0.3], dir: [0, 0, 1], fire: (i) => Math.max(0, -i.pitch) },
  { pos: [0, -2.0, -0.55], dir: [0, 0, -1], fire: (i) => Math.max(0, -i.pitch) },
  // Lateral strafe pairs
  { pos: [-0.62, 0.6, 0], dir: [-1, 0, 0], fire: (i) => Math.max(0, i.strafeX) },
  { pos: [-0.66, -0.7, 0], dir: [-1, 0, 0], fire: (i) => Math.max(0, i.strafeX) },
  { pos: [0.62, 0.6, 0], dir: [1, 0, 0], fire: (i) => Math.max(0, -i.strafeX) },
  { pos: [0.66, -0.7, 0], dir: [1, 0, 0], fire: (i) => Math.max(0, -i.strafeX) },
  // Retro burn nozzles at the bow tip
  { pos: [0.18, 3.0, 0], dir: [0, 1, 0], fire: (i) => i.reverse },
  { pos: [-0.18, 3.0, 0], dir: [0, 1, 0], fire: (i) => i.reverse },
]
const _podUp = new Vector3(0, 1, 0)
const RCS_QUATS = RCS_PODS.map((pod) => {
  const q = new Quaternion()
  q.setFromUnitVectors(_podUp, new Vector3(...pod.dir).normalize())
  return q
})

interface ShipPart {
  geometry: BufferGeometry
  material: MeshStandardMaterial
}

/**
 * "MCRN Tachi" by Jakub.Vildomec (Sketchfab, CC Attribution) — 355 meshes
 * sharing 4 materials, merged down to 4 draw calls with world transforms
 * baked in. Credit shown in the welcome card, SEO mirror and README.
 */
function useTachiParts(): ShipPart[] {
  const gltf = useGLTF(MODEL_URL)
  return useMemo(() => {
    gltf.scene.updateMatrixWorld(true)
    const byMaterial = new Map<MeshStandardMaterial, BufferGeometry[]>()
    gltf.scene.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      let g = mesh.geometry.clone()
      if (g.index) g = g.toNonIndexed()
      g.applyMatrix4(mesh.matrixWorld)
      for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name)
      }
      const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshStandardMaterial
      const list = byMaterial.get(material) ?? []
      list.push(g)
      byMaterial.set(material, list)
    })
    const parts: ShipPart[] = []
    for (const [material, geoms] of byMaterial) {
      const merged = mergeGeometries(geoms, false)
      geoms.forEach((g) => g.dispose())
      if (!merged) continue
      material.envMapIntensity = 1.1
      parts.push({ geometry: merged, material })
    }
    return parts
  }, [gltf])
}

/** Orients the raw model into the ship's local frame (+Y nose, +Z up). */
function TachiModel() {
  const parts = useTachiParts()
  return (
    <group position={[0, -MODEL_CENTER, 0]} rotation-y={Math.PI}>
      <group rotation-x={-Math.PI / 2} scale={MODEL_SCALE}>
        {parts.map((part, i) => (
          <mesh key={i} geometry={part.geometry} material={part.material} />
        ))}
      </group>
    </group>
  )
}

/**
 * Owns the physics step (runs first each frame via negative priority) and
 * renders the ship — the Tachi/Rocinante hull plus our own drive plume,
 * RCS puffs, running lights and floodlights layered on top.
 * Local frame inside the -90° X group: +Y = nose, +Z = up.
 */
export function Ship() {
  const rigRef = useRef<Group>(null)
  const glowRef = useRef<PointLight>(null)
  const plumeCoreRef = useRef<Mesh>(null)
  const plumeOuterRef = useRef<Mesh>(null)
  const rcsRefs = useRef<(Mesh | null)[]>([])
  const engineDiscRef = useRef<Mesh>(null)
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
    const disc = engineDiscRef.current
    if (disc) {
      const heat = jumping ? 1 : state.thrusting ? (state.boosting ? 1 : 0.6) : 0.08
      const m = disc.material as MeshBasicMaterial
      if (jumping) m.color.setRGB(3.4 * heat, 2.4 * heat, 5.2 * heat)
      else m.color.setRGB(0.5 * heat, 4.0 * heat, 6.0 * heat)
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
        <Suspense fallback={null}>
          <TachiModel />
        </Suspense>

        {/* Navigation lights on the flanks */}
        <mesh ref={starboardLightRef} position={[0.72, 0.4, 0.1]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color={[0.1, 2.2, 0.15]} toneMapped={false} />
        </mesh>
        <mesh ref={portLightRef} position={[-0.72, 0.4, 0.1]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color={[2.4, 0.1, 0.1]} toneMapped={false} />
        </mesh>
        {/* Anti-collision strobe on the dorsal spine */}
        <mesh ref={strobeRef} position={[0, -1.4, 0.66]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial color={[1, 1, 1]} toneMapped={false} />
        </mesh>

        {/* RCS puff cones on the hull */}
        {RCS_PODS.map((pod, i) => (
          <mesh
            key={i}
            ref={(m) => {
              rcsRefs.current[i] = m
            }}
            position={[
              pod.pos[0] + pod.dir[0] * 0.16,
              pod.pos[1] + pod.dir[1] * 0.16,
              pod.pos[2] + pod.dir[2] * 0.16,
            ]}
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
        ))}

        {/* Main drive plume anchored at the engine skirt */}
        <group position={[0, -3.08, 0]}>
          <mesh ref={engineDiscRef} position={[0, 0.14, 0]} rotation-x={Math.PI / 2}>
            <circleGeometry args={[0.15, 16]} />
            <meshBasicMaterial color={[0.04, 0.32, 0.48]} toneMapped={false} />
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

        {/* Hull floodlights — the ship illuminates itself */}
        <pointLight position={[0, 1.6, 1.5]} color="#e8f0ff" intensity={4} distance={6} decay={2} />
        <pointLight position={[1.3, 2.6, -0.8]} color="#fff2dd" intensity={3} distance={5.5} decay={2} />
        <pointLight position={[-1.4, -1.4, 1.1]} color="#dde8ff" intensity={3.2} distance={6.5} decay={2} />
      </group>
      <pointLight ref={glowRef} position={[0, 0, 3.6]} color="#7fd4ff" intensity={0} distance={45} decay={2} />
    </group>
  )
}

useGLTF.preload(MODEL_URL)
