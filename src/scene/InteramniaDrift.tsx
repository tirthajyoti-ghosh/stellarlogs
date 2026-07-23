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
import { registerCollider } from '../physics/gravity'
import { DRIFT_POI } from '../config/pois'
import { useRockVariants } from './Asteroids'
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
/** Stable Vector3 for the HUD label registry */
const LABEL_POSITION = new Vector3(...DRIFT_POI.position)

/** The colony's rock cluster: photoreal asteroid-pack variants (the Ceres
 *  pattern — the rock dominates, the industry is bolted on). Local offsets,
 *  world-unit sizes, stable variant picks. */
const ROCKS = [
  { variant: 3, offset: [-39, -25, -22] as const, size: 260, spin: [0.3, 1.7, 0.9] as const },
  { variant: 7, offset: [120, 6, 81] as const, size: 150, spin: [2.1, 0.4, 2.8] as const },
]
/** Whole-colony scale on the docked structures (rocks size independently) */
const STRUCTURE_SCALE = 1.4

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
  const rockRefs = useRef<(InstancedMesh | null)[]>([])
  const buoyBody = useBuoyBody()
  const rockVariants = useRockVariants()

  // The rocks themselves: one instance per variant, composed with the
  // pack's base matrix (quantized geometry — transforms stay in matrices)
  useEffect(() => {
    ROCKS.forEach((rock, i) => {
      const mesh = rockRefs.current[i]
      const variant = rockVariants[rock.variant % rockVariants.length]
      if (!mesh || !variant) return
      _dummy.position.set(rock.offset[0], rock.offset[1], rock.offset[2])
      _dummy.rotation.set(rock.spin[0], rock.spin[1], rock.spin[2])
      _dummy.scale.setScalar(rock.size * variant.norm)
      _dummy.updateMatrix()
      mesh.setMatrixAt(0, _dummy.matrix.clone().multiply(variant.base))
      mesh.instanceMatrix.needsUpdate = true
    })
    _dummy.rotation.set(0, 0, 0)
  }, [rockVariants])

  // Solid: the ship bounces off the rocks instead of phasing through
  useEffect(() => {
    const unregisters = ROCKS.map((rock) =>
      registerCollider({
        position: new Vector3(
          DRIFT_POI.position[0] + rock.offset[0],
          DRIFT_POI.position[1] + rock.offset[1],
          DRIFT_POI.position[2] + rock.offset[2],
        ),
        radius: rock.size * 0.4,
      }),
    )
    return () => unregisters.forEach((u) => u())
  }, [])

  useEffect(() => {
    const unregister = registerHudLabel({
      id: 'poi-drift',
      name: 'INTERAMNIA DRIFT',
      color: '#ffc06e',
      kind: 'poi',
      position: LABEL_POSITION,
      yOffset: 205,
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
      const t = 215 + i * 85
      _dummy.position.set(t * 0.56, 6 - i * 4, t * 0.83)
      _dummy.rotation.set(0, i * 1.9, 0)
      _dummy.scale.setScalar(0.8)
      _dummy.updateMatrix()
      mesh.setMatrixAt(i, _dummy.matrix)
    }
    _dummy.rotation.set(0, 0, 0)
    mesh.instanceMatrix.needsUpdate = true
  }, [])

  useFrame(() => {
    // Marquee faces the pilot (geostationary law). The colony itself holds
    // still — her rocks are SOLID now, and colliders don't chase rotations.
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
          <group scale={STRUCTURE_SCALE}>
            <DriftBody />
          </group>
          {ROCKS.map((rock, i) => (
            <instancedMesh
              key={i}
              ref={(m) => {
                rockRefs.current[i] = m
              }}
              args={[
                rockVariants[rock.variant % rockVariants.length]?.geometry,
                rockVariants[rock.variant % rockVariants.length]?.material,
                1,
              ]}
              frustumCulled={false}
            />
          ))}
        </Suspense>
      </group>

      {/* Marquee — the landmark, readable from the lane */}
      <group ref={marqueeRef} position={[0, 255, 0]}>
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
      <group position={[128, 40, 165]} rotation-y={0.59}>
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
      <pointLight position={[98, 84, 126]} color="#ffd9a0" intensity={9} distance={470} decay={1.6} />
      <pointLight position={[-126, -42, -84]} color="#aab8cc" intensity={5.5} distance={420} decay={1.7} />
    </group>
  )
}

useGLTF.preload(MODEL_URL)
