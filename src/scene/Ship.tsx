import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import {
  AdditiveBlending,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  Quaternion,
  SpotLight,
  Vector3,
} from 'three'
import { createShipState, shipQuaternion, stepShip } from '../physics/integrator'
import { discoverTurrets, updateTurrets, devAimAt } from './shipTurrets'
import { turretControl } from '../state/turretControl'
import { warp, warpTurn, stepWarp, warpBurning } from '../physics/warp'
import { flip, flipStick, cancelFlip, wrapAngle } from '../physics/flip'
import { DrivePlume } from './DrivePlume'
import { driveLock } from '../physics/driveLock'
import { pursuit } from '../physics/pursuit'
import { shipInput } from '../physics/shipInput'
import type { ShipInput } from '../physics/shipInput'
import { shipRig } from '../state/shipRig'
import { PROBES } from '../config/probes'
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
const _rollQuat = new Quaternion()
const _rollAxis = new Vector3(0, 0, 1)

/** Reused container for the FLIP autopilot's synthetic stick (no per-frame alloc) */
const flipInputObj: ShipInput = {
  thrust: 0,
  reverse: 0,
  strafeX: 0,
  yaw: 0,
  pitch: 0,
  boost: false,
}
/** Reused container for the PURSUIT ASSIST's synthetic stick */
const assistInputObj: ShipInput = {
  thrust: 0,
  reverse: 0,
  strafeX: 0,
  yaw: 0,
  pitch: 0,
  boost: false,
}
const _los = new Vector3()
/** Reused container for the drive-dark racing lock (no per-frame alloc) */
const lockInputObj: ShipInput = {
  thrust: 0,
  reverse: 0,
  strafeX: 0,
  yaw: 0,
  pitch: 0,
  boost: false,
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

/**
 * "MCRN Tachi" by Jakub.Vildomec (Sketchfab, CC Attribution). The GLB is
 * pre-optimized offline with gltf-transform (join + weld + meshopt + webp,
 * 19.6MB → 2.4MB) down to one mesh per material — 4 draw calls as-is. The
 * geometry is quantized (KHR_mesh_quantization: node scale carries the
 * dequantization), so the scene must render with its node transforms intact.
 * Credit shown in the welcome card, SEO mirror and README.
 */
function TachiModel() {
  const gltf = useGLTF(MODEL_URL)
  useMemo(() => {
    gltf.scene.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshStandardMaterial
      material.envMapIntensity = 1.1
    })
    // PDC ball-turret rigs (pdc_1..pdc_6 pivot nodes from the build script)
    discoverTurrets(gltf.scene)
  }, [gltf])
  return (
    <group position={[0, -MODEL_CENTER, 0]} rotation-y={Math.PI}>
      <group rotation-x={-Math.PI / 2} scale={MODEL_SCALE}>
        <primitive object={gltf.scene} />
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
  const headlightRef = useRef<SpotLight>(null)
  const headTargetRef = useRef<Object3D>(null)
  const glowRef = useRef<PointLight>(null)
  const rcsRefs = useRef<(Mesh | null)[]>([])
  const strobeRef = useRef<Mesh>(null)
  const portLightRef = useRef<Mesh>(null)
  const starboardLightRef = useRef<Mesh>(null)
  const state = useMemo(() => createShipState(new Vector3(...SPAWN_POSITION), SPAWN_YAW), [])

  // Teleport for visual inspection / automation (dev + probe builds)
  if (PROBES) {
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
    // A velocity kick for scripted "flown" acceptance runs — the parked/
    // moving comparison the wave-balance law is verified against.
    ;(window as unknown as Record<string, unknown>).__impulse = (x: number, y: number, z: number) => {
      state.velocity.x += x
      state.velocity.y += y
      state.velocity.z += z
    }
    ;(window as unknown as Record<string, unknown>).__aimTurrets = (
      x?: number,
      y?: number,
      z?: number,
    ) => {
      devAimAt(x === undefined ? null : new Vector3(x, y!, z!))
    }
    ;(window as unknown as Record<string, unknown>).__turrets = turretControl
  }

  useFrame((_, dt) => {
    // Impact physics from activities: velocity kick + decaying attitude tumble
    if (shipRig.pendingImpulse.lengthSq() > 0) {
      state.velocity.add(shipRig.pendingImpulse)
      shipRig.pendingImpulse.set(0, 0, 0)
    }
    if (Math.abs(shipRig.tumbleYaw) > 0.001 || Math.abs(shipRig.tumblePitch) > 0.001) {
      state.yaw += shipRig.tumbleYaw * dt
      state.pitch += shipRig.tumblePitch * dt
      const decay = Math.exp(-2.4 * dt)
      shipRig.tumbleYaw *= decay
      shipRig.tumblePitch *= decay
    }

    // FLIP autopilot: the computer holds the stick, the pilot's hands win
    if (flip.active && (warp.phase !== 'idle' || shipInput.yaw !== 0 || shipInput.pitch !== 0)) {
      cancelFlip()
    }
    let activeInput: ShipInput = shipInput
    if (flip.active) {
      const stick = flipStick(state.yaw, state.pitch)
      flipInputObj.thrust = shipInput.thrust
      flipInputObj.reverse = shipInput.reverse
      flipInputObj.strafeX = shipInput.strafeX
      flipInputObj.boost = shipInput.boost
      flipInputObj.yaw = stick.yaw
      flipInputObj.pitch = stick.pitch
      activeInput = flipInputObj
    }
    // PURSUIT ASSIST: the flight computer's HOLD (the-hunt.md pass 4).
    // Capture = nose inside the fixed world-radius disc around the quarry
    // (tight cone at range, forgiving up close). The hold is a hand, never
    // a magnet: deadband + soft capped gain — and the pilot's hands win
    // the instant any yaw/pitch key is touched.
    if (pursuit.target && !flip.active && warp.phase === 'idle') {
      _los.copy(pursuit.target).sub(state.position)
      const dist = _los.length()
      if (dist > 1) {
        _los.multiplyScalar(1 / dist)
        const desYaw = Math.atan2(-_los.x, -_los.z)
        const desPitch = Math.asin(Math.max(-1, Math.min(1, _los.y)))
        const dy = wrapAngle(desYaw - state.yaw)
        const dp = wrapAngle(desPitch - state.pitch)
        const sep = Math.hypot(dy, dp)
        pursuit.sep = sep
        const cone = Math.atan(pursuit.captureRadius / dist)
        const handsOn = shipInput.yaw !== 0 || shipInput.pitch !== 0
        if (handsOn) pursuit.engaged = false
        else if (sep < cone) pursuit.engaged = true
        else if (sep > cone * 2.2) pursuit.engaged = false
        if (pursuit.engaged && !handsOn) {
          const DEAD = 0.018
          assistInputObj.thrust = activeInput.thrust
          assistInputObj.reverse = activeInput.reverse
          assistInputObj.strafeX = activeInput.strafeX
          assistInputObj.boost = activeInput.boost
          assistInputObj.yaw = Math.abs(dy) < DEAD ? 0 : Math.max(-0.55, Math.min(0.55, dy * 1.1))
          assistInputObj.pitch = Math.abs(dp) < DEAD ? 0 : Math.max(-0.55, Math.min(0.55, dp * 1.4))
          activeInput = assistInputObj
        }
      }
    } else {
      pursuit.engaged = false
    }

    // Drive-dark racing: main drive dead, translation RCS at trim authority
    if (driveLock.locked) {
      lockInputObj.thrust = 0
      lockInputObj.boost = false
      lockInputObj.reverse = activeInput.reverse * driveLock.trim
      lockInputObj.strafeX = activeInput.strafeX * driveLock.trim
      lockInputObj.yaw = activeInput.yaw
      lockInputObj.pitch = activeInput.pitch
      activeInput = lockInputObj
    }

    let alpha: number
    if (warp.phase === 'idle') {
      alpha = stepShip(state, activeInput, dt)
    } else {
      stepWarp(state, Math.min(dt, 0.05))
      alpha = 1
    }
    const rig = rigRef.current
    if (!rig) return
    if (headlightRef.current && headTargetRef.current && headlightRef.current.target !== headTargetRef.current) {
      headlightRef.current.target = headTargetRef.current
    }

    rig.position.lerpVectors(state.prevPosition, state.position, alpha)
    const yaw = MathUtils.lerp(state.prevYaw, state.yaw, alpha)
    const pitch = MathUtils.lerp(state.prevPitch, state.pitch, alpha)
    shipQuaternion(yaw, pitch, rig.quaternion)
    // Swimmer-turn half-twist: transient roll about the hull's long axis
    // while the jump autopilot tumbles the ship end-over-end
    if (warp.roll !== 0) {
      rig.quaternion.multiply(_rollQuat.setFromAxisAngle(_rollAxis, warp.roll))
    }

    // Epstein-style drive exhaust: layered core + glow, flicker under thrust,
    // stretched white-hot afterburner while boosting. A brachistochrone's
    // powered legs are just that — the drive at FULL BURN, nothing exotic.
    const now = performance.now() / 1000
    const flicker = 1 + 0.05 * Math.sin(now * 43) + 0.035 * Math.sin(now * 97)
    const burning = warpBurning()
    const thrustingVis = state.thrusting || burning
    const boostingVis = state.boosting || burning
    if (glowRef.current) {
      const target = thrustingVis ? (boostingVis ? 60 : 16) : 0
      glowRef.current.intensity = MathUtils.lerp(glowRef.current.intensity, target * flicker, 0.2)
      glowRef.current.color.set('#7fd4ff')
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

    // RCS puffs — during align/flip/turnback the autopilot's rotation drives them
    const podInput =
      warp.phase === 'align' || warp.phase === 'flip' || warp.phase === 'turnback'
        ? {
            thrust: 0,
            reverse: 0,
            strafeX: 0,
            yaw: MathUtils.clamp(warpTurn.yaw * 3, -1, 1),
            pitch: MathUtils.clamp(warpTurn.pitch * 3, -1, 1),
            boost: false,
          }
        : activeInput
    RCS_PODS.forEach((pod, i) => {
      const mesh = rcsRefs.current[i]
      if (!mesh) return
      const mat = mesh.material as MeshBasicMaterial
      mat.opacity = MathUtils.lerp(mat.opacity, pod.fire(podInput) * 0.85, 0.3)
    })

    // PDC turrets: acquire/track targets, slew balls, spin barrels
    updateTurrets(dt)

    // Publish for camera / HUD / proximity
    shipRig.position.copy(rig.position)
    shipRig.quaternion.copy(rig.quaternion)
    shipRig.speed = state.speed
    shipRig.boosting = state.boosting
    shipRig.thrusting = state.thrusting
    shipRig.boostCharge = state.boostCharge
    shipRig.warping = warp.phase !== 'idle'
    shipRig.flipping = flip.active
    shipRig.yaw = yaw
    shipRig.pitch = pitch
    if (state.speed > 1) {
      shipRig.velocityDir.copy(state.velocity).normalize()
    }
  }, -2)

  return (
    <group ref={rigRef}>
      {/* THE HEADLIGHT — a real computed lamp, always burning (Everspace
          rule, billboard law: light is computed, never painted; no beam,
          nothing to scatter in vacuum). Wrecks, crates and rock answer
          it as you close — the world emerges from the dark. */}
      <spotLight
        ref={headlightRef}
        position={[0, 0.05, -3.05]}
        angle={0.34}
        penumbra={0.55}
        decay={1.0}
        distance={1300}
        intensity={1500}
        color="#e8f2ff"
      />
      <object3D ref={headTargetRef} position={[0, 0.1, -600]} />
      {/* the fixture: a lamp cowl seated on the bow, its saddle buried in
          the nose plating so the lens reads as hull-mounted hardware */}
      <group position={[0, 0.05, -2.86]}>
        <mesh position={[0, -0.01, 0.28]}>
          <boxGeometry args={[0.15, 0.13, 0.62]} />
          <meshStandardMaterial color="#2e343c" metalness={0.7} roughness={0.5} flatShading />
        </mesh>
        <mesh rotation-x={Math.PI / 2} position={[0, 0, -0.06]}>
          <cylinderGeometry args={[0.075, 0.095, 0.26, 10]} />
          <meshStandardMaterial color="#3a4048" metalness={0.75} roughness={0.45} flatShading />
        </mesh>
        <mesh position={[0, 0, -0.19]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color={[2.6, 2.8, 3.2]} toneMapped={false} />
        </mesh>
      </group>
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

        {/* Main drive plume anchored at the engine skirt — the reference
            build (docs/the-plume.md): mouth lens, ragged tongue, beam,
            corona, all staged by throttle */}
        <group position={[0, -3.08, 0]}>
          <DrivePlume />
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
