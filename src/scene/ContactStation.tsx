import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Group, MathUtils, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { Billboard } from './boards/Billboard'
import { buildBoards } from './boards/boardSpecs'
import { CONTACT } from '../content/contact'
import { REGISTRY, REGISTRY_ACCENT } from '../content/credits'
import { STATION_POSITION } from '../config/universe'
import { registerCollider } from '../physics/gravity'
import { shipRig } from '../state/shipRig'
import { useEffect } from 'react'

const ACCENT = CONTACT.starColor
const MODEL_URL = '/models/gateway.glb'
// Model is ~46 units on its long (Y) axis (quantized coords dequantize via
// node scales); scale to ~150 world units and lay the module stack horizontal.
const MODEL_SCALE = 3.25

/**
 * "Gateway" by andreas9343 (Sketchfab, CC Attribution) — a NASA-Gateway-style
 * deep-space station, pre-optimized offline with gltf-transform (9 draw
 * calls, 45.8MB → 6.6MB). Quantized geometry: render with node transforms
 * intact (see Ship.tsx). Credit in the welcome card, SEO mirror and README.
 */
function GatewayModel() {
  const gltf = useGLTF(MODEL_URL)
  useMemo(() => {
    gltf.scene.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshStandardMaterial
      material.envMapIntensity = 1.15
    })
  }, [gltf])
  return (
    <group rotation-z={Math.PI / 2} scale={MODEL_SCALE}>
      <primitive object={gltf.scene} />
    </group>
  )
}

/**
 * The comms station near spawn — fills the contact gap the 2D site had.
 * Gateway-class hull with our beacon, floodlights and the contact boards
 * circling at a readable distance.
 */
export function ContactStation() {
  const beaconRef = useRef<Group>(null)
  const boardsRef = useRef<Group>(null)
  const boardScale = useRef(0)
  const position = useMemo(() => new Vector3(...STATION_POSITION), [])
  const specs = useMemo(() => buildBoards(CONTACT.items[0], ACCENT), [])
  // Solid hull: no more phasing through the station
  useEffect(() => registerCollider({ position: new Vector3(...STATION_POSITION), radius: 68 }), [])
  // The Hull & Hardware Registry: asset attributions as dockmaster's ledger
  // boards, orbiting with the contact boards (out of the welcome popup)
  const registrySpecs = useMemo(
    () => REGISTRY.flatMap((item) => buildBoards(item, REGISTRY_ACCENT)),
    [],
  )

  useFrame(({ clock }) => {
    if (beaconRef.current) {
      const s = Math.pow(Math.max(0, Math.sin(clock.elapsedTime * 1.8)), 16)
      beaconRef.current.scale.setScalar(1 + s * 0.6)
    }
    const boards = boardsRef.current
    if (boards) {
      const d = position.distanceTo(shipRig.position)
      boardScale.current = MathUtils.lerp(boardScale.current, d < 700 ? 1 : 0, 0.08)
      boards.visible = boardScale.current > 0.02
      boards.scale.setScalar(boardScale.current)
      // Geostationary ring; each board turns to face the ship (see Billboard)
      const n = Math.max(1, boards.children.length)
      boards.children.forEach((child, i) => {
        const angle = (i * Math.PI * 2) / n
        child.position.set(Math.cos(angle) * 115, (i % 2 === 0 ? 1 : -1) * 16, Math.sin(angle) * 115)
      })
    }
  })

  return (
    <group position={STATION_POSITION}>
      <Suspense fallback={null}>
        <GatewayModel />
      </Suspense>
      {/* Beacon above the stack */}
      <group ref={beaconRef} position={[0, 58, 0]}>
        <mesh>
          <sphereGeometry args={[1.6, 10, 10]} />
          <meshBasicMaterial color={[4, 2.2, 1.2]} toneMapped={false} />
        </mesh>
      </group>
      {/* Local floodlights so the station reads against space */}
      <pointLight position={[60, 70, 70]} color="#dde8ff" intensity={6} distance={320} decay={1.6} />
      <pointLight position={[-70, -40, -50]} color="#ffe8cc" intensity={4} distance={280} decay={1.7} />
      {/* Contact boards + the asset registry, sharing the geostationary ring */}
      <group ref={boardsRef}>
        {specs.map((spec, i) => (
          <Billboard
            key={i}
            spec={spec}
            accentColor={ACCENT}
            position={[0, 0, 0]}
            planetWorldPos={position}
          />
        ))}
        {registrySpecs.map((spec, i) => (
          <Billboard
            key={`reg-${i}`}
            spec={spec}
            accentColor={REGISTRY_ACCENT}
            position={[0, 0, 0]}
            planetWorldPos={position}
          />
        ))}
      </group>
    </group>
  )
}

useGLTF.preload(MODEL_URL)
