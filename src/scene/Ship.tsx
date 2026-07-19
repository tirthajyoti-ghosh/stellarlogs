import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Shape,
  Vector2,
  Vector3,
} from 'three'
import { createShipState, shipQuaternion, stepShip } from '../physics/integrator'
import { shipInput } from '../physics/shipInput'
import { shipRig } from '../state/shipRig'
import { SPAWN_POSITION, SPAWN_YAW } from '../config/universe'

const BANK_FACTOR = 0.55 // visual roll per unit of yaw rate

function makeFuselage(): LatheGeometry {
  const profile = [
    new Vector2(0.001, -2.15),
    new Vector2(0.28, -2.1),
    new Vector2(0.36, -1.7),
    new Vector2(0.52, -0.8),
    new Vector2(0.55, 0.2),
    new Vector2(0.4, 1.2),
    new Vector2(0.18, 2.2),
    new Vector2(0.001, 3.0),
  ]
  return new LatheGeometry(profile, 24)
}

function makeWing(): ExtrudeGeometry {
  const shape = new Shape()
  shape.moveTo(0, 0.4)
  shape.lineTo(2.3, -1.55)
  shape.lineTo(1.9, -1.85)
  shape.lineTo(0, -1.6)
  shape.closePath()
  return new ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false })
}

function makeFin(): ExtrudeGeometry {
  const shape = new Shape()
  shape.moveTo(0, 0.3)
  shape.lineTo(1.05, -0.9)
  shape.lineTo(0.75, -1.1)
  shape.lineTo(0, -1.0)
  shape.closePath()
  return new ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false })
}

/**
 * Owns the physics step (runs first each frame via negative priority) and
 * renders the procedural interceptor. Local frame inside the -90° X group:
 * +Y = nose direction, +Z = up.
 */
export function Ship() {
  const rigRef = useRef<Group>(null)
  const bankRef = useRef<Group>(null)
  const glowRef = useRef<PointLight>(null)
  const plumeLeft = useRef<Mesh>(null)
  const plumeRight = useRef<Mesh>(null)
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

  const fuselage = useMemo(() => makeFuselage(), [])
  const wing = useMemo(() => makeWing(), [])
  const fin = useMemo(() => makeFin(), [])

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

    // Engine visuals track thrust
    const plumeTarget = state.thrusting ? (state.boosting ? 2.2 : 1) : 0
    for (const plume of [plumeLeft.current, plumeRight.current]) {
      if (!plume) continue
      const s = MathUtils.lerp(plume.scale.y, plumeTarget, 0.15)
      plume.scale.set(1, Math.max(0.001, s), 1)
      ;(plume.material as MeshBasicMaterial).opacity = 0.75 * Math.min(1, s)
    }
    if (glowRef.current) {
      const target = state.thrusting ? (state.boosting ? 30 : 12) : 0
      glowRef.current.intensity = MathUtils.lerp(glowRef.current.intensity, target, 0.2)
    }

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
          {/* Fuselage */}
          <mesh geometry={fuselage}>
            <meshStandardMaterial color="#c8d2e0" metalness={0.75} roughness={0.3} />
          </mesh>
          {/* Canopy */}
          <mesh position={[0, 0.7, 0.42]} scale={[0.32, 0.95, 0.28]}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshStandardMaterial
              color="#0e1a2a"
              metalness={0.6}
              roughness={0.12}
              emissive="#2a5a8a"
              emissiveIntensity={0.35}
            />
          </mesh>
          {/* Wings */}
          <mesh geometry={wing} position={[0.3, 0.2, -0.04]} rotation-y={0.07}>
            <meshStandardMaterial color="#232c3d" metalness={0.7} roughness={0.45} side={DoubleSide} />
          </mesh>
          <group scale={[-1, 1, 1]}>
            <mesh geometry={wing} position={[0.3, 0.2, -0.04]} rotation-y={0.07}>
              <meshStandardMaterial color="#232c3d" metalness={0.7} roughness={0.45} side={DoubleSide} />
            </mesh>
          </group>
          {/* Tail fin (vertical) */}
          <mesh geometry={fin} position={[0.03, -0.85, 0.35]} rotation-y={-Math.PI / 2}>
            <meshStandardMaterial color="#232c3d" metalness={0.7} roughness={0.45} side={DoubleSide} />
          </mesh>
          {/* Wingtip strips (HDR — pick up bloom) */}
          <mesh position={[2.35, -1.35, 0]}>
            <boxGeometry args={[0.05, 0.5, 0.04]} />
            <meshBasicMaterial color={[0.4, 3.2, 4.5]} toneMapped={false} />
          </mesh>
          <mesh position={[-2.35, -1.35, 0]}>
            <boxGeometry args={[0.05, 0.5, 0.04]} />
            <meshBasicMaterial color={[0.4, 3.2, 4.5]} toneMapped={false} />
          </mesh>
          {/* Engines */}
          {[0.33, -0.33].map((x) => (
            <group key={x} position={[x, -1.95, -0.02]}>
              <mesh>
                <cylinderGeometry args={[0.19, 0.23, 0.6, 16]} />
                <meshStandardMaterial color="#1a2230" metalness={0.85} roughness={0.35} />
              </mesh>
              <mesh position={[0, -0.31, 0]} rotation-x={Math.PI / 2}>
                <circleGeometry args={[0.17, 16]} />
                <meshBasicMaterial color={[0.5, 4.0, 6.0]} toneMapped={false} />
              </mesh>
              <mesh
                ref={x > 0 ? plumeRight : plumeLeft}
                position={[0, -1.15, 0]}
                rotation-x={Math.PI}
                scale={[1, 0.001, 1]}
              >
                <coneGeometry args={[0.16, 1.6, 12, 1, true]} />
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
          ))}
        </group>
        <pointLight ref={glowRef} position={[0, 0, 3]} color="#7fd4ff" intensity={0} distance={45} decay={2} />
      </group>
    </group>
  )
}
