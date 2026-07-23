import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, useGLTF } from '@react-three/drei'
import {
  BufferGeometry,
  Group,
  InstancedMesh,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three'
import { shipRig } from '../state/shipRig'
import { registerHudLabel } from '../hud/hudState'
import { labelsChanged } from '../hud/LabelLayer'
import { DRIFT_POI } from '../config/pois'
import { FONT_BOLD } from './boards/font'

/**
 * INTERAMNIA DRIFT — the drift-colony dug into a rock in the Projects belt.
 * "Space Station Asteroid Mining Facility" by Inditrion Dradnon (Sketchfab,
 * CC BY 4.0), optimized offline (scripts/build-drift.mjs, 573k faces →
 * sloppy-simplified colony prop, 9 draw calls). The colony spins at
 * drift-gravity slowness; her windows stay lit; a painted welcome board
 * greets the lane in Lang Belta — the one place the creole lives, as world
 * signage, never UI. The militia, the racing club, and the ice runs all
 * belong to this rock.
 */

const MODEL_URL = '/models/drift.glb'
const BUOY_URL = '/models/buoy.glb'
const SPIN = 0.008 // rad/s — alive on a long look, imperceptible in passing
/** Stable Vector3 for the HUD label registry */
const LABEL_POSITION = new Vector3(...DRIFT_POI.position)

function useBuoyBody(): { geometry: BufferGeometry; material: Material } {
  const gltf = useGLTF(BUOY_URL)
  return useMemo(() => {
    let found: Mesh | null = null
    gltf.scene.traverse((obj) => {
      const m = obj as Mesh
      if (m.isMesh && !found) found = m
    })
    const source = found as unknown as Mesh
    return { geometry: source.geometry, material: source.material as MeshStandardMaterial }
  }, [gltf])
}

function DriftBody() {
  const gltf = useGLTF(MODEL_URL)
  useMemo(() => {
    gltf.scene.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      const material = (
        Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      ) as MeshStandardMaterial
      // dusty regolith, not a showroom: keep reflections nearly off
      material.envMapIntensity = 0.35
      // the windows are the life of the place
      material.emissiveIntensity = Math.max(material.emissiveIntensity, 1.7)
    })
  }, [gltf])
  return <primitive object={gltf.scene} />
}

const _dummy = new Object3D()

export function InteramniaDrift() {
  const colonyRef = useRef<Group>(null)
  const marqueeRef = useRef<Group>(null)
  const buoyMeshRef = useRef<InstancedMesh>(null)
  const buoyBody = useBuoyBody()

  useEffect(() => {
    const unregister = registerHudLabel({
      id: 'poi-drift',
      name: 'INTERAMNIA DRIFT',
      color: '#ffc06e',
      kind: 'poi',
      position: LABEL_POSITION,
      yOffset: 150,
      el: null,
      detail: 'DRIFT COLONY · ALL TRAFFIC HAIL DOCKMASTER',
      jumpStandoff: DRIFT_POI.standoff,
    })
    labelsChanged()
    return () => {
      unregister()
      labelsChanged()
    }
  }, [])

  // Approach lane buoys: a lit line pointing at the docks from the lane side
  useEffect(() => {
    const mesh = buoyMeshRef.current
    if (!mesh) return
    for (let i = 0; i < 4; i++) {
      const t = 160 + i * 65
      _dummy.position.set(t * 0.56, 6 - i * 4, t * 0.83)
      _dummy.rotation.set(0, i * 1.9, 0)
      _dummy.scale.setScalar(0.8)
      _dummy.updateMatrix()
      mesh.setMatrixAt(i, _dummy.matrix)
    }
    _dummy.rotation.set(0, 0, 0)
    mesh.instanceMatrix.needsUpdate = true
  }, [])

  useFrame((_, dt) => {
    // Drift-gravity spin
    const colony = colonyRef.current
    if (colony) colony.rotation.y += dt * SPIN
    // Marquee faces the pilot (geostationary law)
    const marquee = marqueeRef.current
    if (marquee) {
      marquee.rotation.y = Math.atan2(
        shipRig.position.x - DRIFT_POI.position[0],
        shipRig.position.z - DRIFT_POI.position[2],
      )
    }
  })

  return (
    <group position={DRIFT_POI.position}>
      <group ref={colonyRef}>
        <Suspense fallback={null}>
          <DriftBody />
        </Suspense>
      </group>

      {/* Marquee — the landmark, readable from the lane */}
      <group ref={marqueeRef} position={[0, 190, 0]}>
        <Text
          font={FONT_BOLD}
          fontSize={38}
          letterSpacing={0.16}
          color="#ffc06e"
          anchorX="center"
          anchorY="middle"
          material-toneMapped={false}
          material-transparent
          fillOpacity={0.9}
        >
          INTERAMNIA DRIFT
        </Text>
        <Text
          font={FONT_BOLD}
          fontSize={10}
          letterSpacing={0.42}
          color="#9fc4de"
          anchorX="center"
          anchorY="middle"
          position={[0, -31, 0]}
          material-toneMapped={false}
          material-transparent
          fillOpacity={0.85}
        >
          DRIFT COLONY · ALL TRAFFIC HAIL DOCKMASTER
        </Text>
      </group>

      {/* The painted welcome board: Lang Belta first, English under — fixed
          toward the lane, hung a little crooked, the way Belters would */}
      <group position={[92, 28, 118]} rotation-y={0.59}>
        <group rotation-z={-0.04}>
          <mesh>
            <boxGeometry args={[64, 20, 1.4]} />
            <meshStandardMaterial color="#1c232e" metalness={0.6} roughness={0.55} flatShading />
          </mesh>
          <Text
            font={FONT_BOLD}
            fontSize={6.2}
            letterSpacing={0.1}
            color="#ffc06e"
            anchorX="center"
            anchorY="middle"
            position={[0, 3.6, 0.9]}
          >
            OYE, BELTALOWDA
          </Text>
          <Text
            font={FONT_BOLD}
            fontSize={2.6}
            letterSpacing={0.24}
            color="#8fb8d8"
            anchorX="center"
            anchorY="middle"
            position={[0, -4.6, 0.9]}
          >
            WELCOME TO THE AMNIA · KEEP TRANSPONDERS HOT
          </Text>
        </group>
      </group>

      {/* Approach buoys */}
      <instancedMesh ref={buoyMeshRef} args={[buoyBody.geometry, buoyBody.material, 4]} frustumCulled={false} />

      {/* Dock floodlights + the warm haze of a lived-in rock */}
      <pointLight position={[70, 60, 90]} color="#ffd9a0" intensity={7} distance={340} decay={1.6} />
      <pointLight position={[-90, -30, -60]} color="#aab8cc" intensity={4} distance={300} decay={1.7} />
    </group>
  )
}

useGLTF.preload(MODEL_URL)
