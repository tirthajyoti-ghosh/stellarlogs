import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, useGLTF } from '@react-three/drei'
import { Group, Mesh, MeshBasicMaterial, Object3D, Vector3 } from 'three'
import { shipRig } from '../state/shipRig'
import { registerHudLabel } from '../hud/hudState'
import { labelsChanged } from '../hud/LabelLayer'
import { WRECK_POI } from '../config/pois'
import { FONT_BOLD } from './boards/font'

/**
 * THE NILAK — wreck of an ice hauler, lost to raiders on her final approach.
 * Static history, nothing to play: she is the reason the militia drills and
 * the reason escorts fly. Built from "Cargo Hauler" by NekoKuroHB (Sketchfab,
 * CC BY 4.0), broken offline (scripts/build-wreck.mjs): severed aft tank pod
 * drifting beside the hull, glass blown out, materials dead. Quantized +
 * meshopt — rendered via <primitive>, transforms at group level only.
 * A militia warning buoy holds the painted plaque: REMEMBER THE NILAK.
 */

const MODEL_URL = '/models/nilak.glb'
const BUOY_URL = '/models/buoy.glb'
const POSITION = new Vector3(...WRECK_POI.position)

function WreckBody() {
  const gltf = useGLTF(MODEL_URL)
  const { hull, pod } = useMemo(() => {
    return {
      hull: gltf.scene.getObjectByName('hull') as Object3D,
      pod: gltf.scene.getObjectByName('pod') as Object3D,
    }
  }, [gltf])
  const hullRef = useRef<Group>(null)
  const podRef = useRef<Group>(null)

  useFrame((_, dt) => {
    // Dead-slow tumble — months of drift, nothing corrected
    const hullGroup = hullRef.current
    if (hullGroup) {
      hullGroup.rotation.z += dt * 0.008
      hullGroup.rotation.y += dt * 0.005
    }
    const podGroup = podRef.current
    if (podGroup) {
      podGroup.rotation.x -= dt * 0.011
      podGroup.rotation.y += dt * 0.007
    }
  })

  return (
    <>
      <group ref={hullRef} rotation={[0.34, 0.8, -0.18]}>
        <primitive object={hull} />
      </group>
      {/* The severed aft section, drifting apart ever so slowly */}
      <group ref={podRef} position={[33, 11, -15]} rotation={[0.9, 0.2, 0.5]}>
        <primitive object={pod} />
      </group>
    </>
  )
}

/** Militia warning buoy keeping vigil at the wreck. */
function VigilBuoy() {
  const gltf = useGLTF(BUOY_URL)
  const strobeRef = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const strobe = strobeRef.current
    if (!strobe) return
    // slow, mournful double-blink every few seconds
    const t = clock.elapsedTime % 4.2
    const on = (t > 0 && t < 0.12) || (t > 0.35 && t < 0.47)
    const material = strobe.material as MeshBasicMaterial
    material.color.setRGB(on ? 3.4 : 0.4, on ? 1.4 : 0.18, on ? 0.9 : 0.12)
  })
  return (
    <group position={[-28, 16, 11]} scale={0.85}>
      <primitive object={gltf.scene} />
      <mesh position={[0, 3.4, 0]} ref={strobeRef}>
        <sphereGeometry args={[1.1, 8, 8]} />
        <meshBasicMaterial color={[0.4, 0.18, 0.12]} toneMapped={false} />
      </mesh>
    </group>
  )
}

export function Wreck() {
  const plaqueRef = useRef<Group>(null)

  useEffect(() => {
    const unregister = registerHudLabel({
      id: 'poi-nilak',
      name: 'THE NILAK',
      color: '#a8b8c8',
      kind: 'poi',
      position: POSITION,
      yOffset: 90,
      el: null,
      detail: 'WRECK · ICE HAULER · LOST TO RAIDERS',
      jumpStandoff: WRECK_POI.standoff,
    })
    labelsChanged()
    return () => {
      unregister()
      labelsChanged()
    }
  }, [])

  useFrame(() => {
    // The plaque faces the pilot — a memorial is meant to be read
    const plaque = plaqueRef.current
    if (plaque) {
      plaque.rotation.y = Math.atan2(
        shipRig.position.x - POSITION.x,
        shipRig.position.z - POSITION.z,
      )
    }
  })

  return (
    <group position={WRECK_POI.position}>
      <Suspense fallback={null}>
        <WreckBody />
        <VigilBuoy />
      </Suspense>

      {/* The painted plaque, hung slightly crooked over the hull */}
      <group ref={plaqueRef} position={[0, 44, 0]}>
        <group rotation-z={-0.045}>
          <Text
            font={FONT_BOLD}
            fontSize={4.6}
            letterSpacing={0.22}
            color="#e8ddc8"
            anchorX="center"
            anchorY="middle"
            material-toneMapped={false}
            material-transparent
            fillOpacity={0.85}
          >
            REMEMBER THE NILAK
          </Text>
          <Text
            font={FONT_BOLD}
            fontSize={1.7}
            letterSpacing={0.4}
            color="#8a97a5"
            anchorX="center"
            anchorY="middle"
            position={[0, -4.6, 0]}
            material-toneMapped={false}
            material-transparent
            fillOpacity={0.8}
          >
            ICE HAULER · LOST WITH ALL HANDS
          </Text>
        </group>
      </group>

      {/* Cold, faint working light from the vigil buoy's floodlamp */}
      <pointLight position={[-24, 24, 12]} color="#aab8cc" intensity={3} distance={160} decay={1.8} />
    </group>
  )
}

useGLTF.preload(MODEL_URL)
