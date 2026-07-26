import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AdditiveBlending, Group, Mesh, Object3D, Vector3 } from 'three'
import { shipRig } from '../state/shipRig'
import { registerHudLabel } from '../hud/hudState'
import { labelsChanged } from '../hud/LabelLayer'

/**
 * THE DRAUGR, SIGHTED. She works the Amnia's lanes, and between raids she
 * has to be somewhere: shadowing the traffic that transits the Work
 * Experience system, running dark, transponder off, holding station just
 * off the lane like she is waiting for something. She is.
 *
 * Nothing to play here yet — this is the sighting that makes the raider a
 * real ship in the world rather than a thing that appears for four seconds
 * during an escort. Fly up and look at her. The interdiction (F.3) is what
 * happens when somebody finally goes after her.
 */

const MODEL_URL = '/models/draugr.glb'
/** Off the Work Experience system, out where nobody has business being. */
const POSITION = new Vector3(-4720, 610, -3560)

export function DraugrSighting() {
  const gltf = useGLTF(MODEL_URL)
  const hull = useMemo(() => (gltf.scene.getObjectByName('hull') as Object3D).clone(), [gltf])
  const groupRef = useRef<Group>(null)
  const plumeRef = useRef<Mesh>(null)

  useEffect(() => {
    const off = registerHudLabel({
      id: 'draugr-sighting',
      name: 'UNKNOWN CONTACT',
      color: '#e0708f',
      kind: 'poi',
      position: POSITION,
      yOffset: 22,
      el: null,
      detail: 'NO TRANSPONDER · RUNNING DARK · HOLDING STATION',
    })
    labelsChanged()
    return () => {
      off()
      labelsChanged()
    }
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const group = groupRef.current
    if (group) {
      // station-keeping: a slow drift and a lazy yaw, like she is watching
      group.position.set(
        POSITION.x + Math.sin(t * 0.09) * 5,
        POSITION.y + Math.sin(t * 0.13) * 3,
        POSITION.z + Math.cos(t * 0.07) * 5,
      )
      group.rotation.y = t * 0.02
      group.rotation.z = Math.sin(t * 0.11) * 0.05
    }
    const plume = plumeRef.current
    if (plume) {
      // station-keeping thrust only: an idle flicker, not a burn
      const f = 0.24 + Math.abs(Math.sin(t * 0.8)) * 0.12
      plume.scale.set(f, f, f)
      // she notices you: the drive comes up a little when somebody closes in
      const close = shipRig.position.distanceTo(POSITION) < 320
      plume.scale.multiplyScalar(close ? 2.2 : 1)
    }
  })

  return (
    <group ref={groupRef} position={POSITION.toArray()}>
      <primitive object={hull} />
      <mesh ref={plumeRef} position={[-12.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.9, 6, 8, 1, true]} />
        <meshBasicMaterial
          color={[1.9, 0.9, 1.7]}
          transparent
          opacity={0.75}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight position={[-14, 0, 0]} color="#c07adf" intensity={1.4} distance={44} decay={1.8} />
    </group>
  )
}

useGLTF.preload(MODEL_URL)
