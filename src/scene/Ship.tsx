import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, MathUtils, PointLight, Vector3 } from 'three'
import { createShipState, shipQuaternion, stepShip } from '../physics/integrator'
import { shipInput } from '../physics/shipInput'
import { shipRig } from '../state/shipRig'
import { SPAWN_POSITION, SPAWN_YAW } from '../config/universe'

const BANK_FACTOR = 0.55 // visual roll per unit of yaw rate

/**
 * Owns the physics step (runs first each frame via negative priority) and
 * renders the ship. Placeholder cone until the glTF model lands in Phase 2.
 */
export function Ship() {
  const rigRef = useRef<Group>(null)
  const bankRef = useRef<Group>(null)
  const glowRef = useRef<PointLight>(null)
  const state = useMemo(() => createShipState(new Vector3(...SPAWN_POSITION), SPAWN_YAW), [])

  useFrame((_, dt) => {
    const alpha = stepShip(state, shipInput, dt)
    const rig = rigRef.current
    if (!rig) return

    // Interpolate between physics steps for smooth rendering
    rig.position.lerpVectors(state.prevPosition, state.position, alpha)
    const yaw = MathUtils.lerp(state.prevYaw, state.yaw, alpha)
    const pitch = MathUtils.lerp(state.prevPitch, state.pitch, alpha)
    shipQuaternion(yaw, pitch, rig.quaternion)

    // Visual banking into turns
    if (bankRef.current) {
      bankRef.current.rotation.z = state.yawRateSmooth * BANK_FACTOR
    }

    // Engine glow tracks thrust
    if (glowRef.current) {
      const target = state.thrusting ? (state.boosting ? 26 : 10) : 0
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
        <mesh rotation-x={-Math.PI / 2}>
          <coneGeometry args={[1.3, 4.2, 8]} />
          <meshStandardMaterial color="#b8c4d8" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0, 2.4]}>
          <sphereGeometry args={[0.45, 12, 12]} />
          <meshBasicMaterial color="#7fd4ff" toneMapped={false} />
        </mesh>
        <pointLight ref={glowRef} position={[0, 0, 3]} color="#7fd4ff" intensity={0} distance={40} decay={2} />
      </group>
    </group>
  )
}
