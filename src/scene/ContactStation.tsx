import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, MathUtils, Vector3 } from 'three'
import { Billboard } from './boards/Billboard'
import { buildBoards } from './boards/boardSpecs'
import { CONTACT } from '../content/contact'
import { STATION_POSITION } from '../config/universe'
import { shipRig } from '../state/shipRig'

const ACCENT = CONTACT.starColor

/**
 * The comms station near spawn — fills the contact gap the 2D site had.
 * Rotating ring habitat, solar arrays, beacon, and a contact board.
 */
export function ContactStation() {
  const ringRef = useRef<Group>(null)
  const beaconRef = useRef<Group>(null)
  const boardsRef = useRef<Group>(null)
  const boardScale = useRef(0)
  const position = useMemo(() => new Vector3(...STATION_POSITION), [])
  const specs = useMemo(() => buildBoards(CONTACT.items[0], ACCENT), [])

  useFrame(({ clock }) => {
    if (ringRef.current) ringRef.current.rotation.z = clock.elapsedTime * 0.1
    if (beaconRef.current) {
      const s = Math.pow(Math.max(0, Math.sin(clock.elapsedTime * 1.8)), 16)
      beaconRef.current.scale.setScalar(1 + s * 0.6)
    }
    // Contact board fades in on approach and slowly orbits the hub
    const boards = boardsRef.current
    if (boards) {
      const d = position.distanceTo(shipRig.position)
      boardScale.current = MathUtils.lerp(boardScale.current, d < 700 ? 1 : 0, 0.08)
      boards.visible = boardScale.current > 0.02
      boards.scale.setScalar(boardScale.current)
      const a = clock.elapsedTime * 0.06
      boards.children.forEach((child, i) => {
        const angle = a + (i * Math.PI * 2) / Math.max(1, boards.children.length)
        child.position.set(Math.cos(angle) * 95, 12, Math.sin(angle) * 95)
      })
    }
  })

  return (
    <group position={STATION_POSITION}>
      {/* Hub */}
      <mesh rotation-y={Math.PI / 8}>
        <cylinderGeometry args={[16, 16, 34, 8]} />
        <meshStandardMaterial color="#4a5262" metalness={0.7} roughness={0.4} flatShading />
      </mesh>
      <mesh position={[0, 22, 0]} rotation-y={Math.PI / 8}>
        <cylinderGeometry args={[8, 12, 10, 8]} />
        <meshStandardMaterial color="#2a3140" metalness={0.7} roughness={0.45} flatShading />
      </mesh>
      {/* Rotating habitat ring */}
      <group ref={ringRef} rotation-x={Math.PI / 2}>
        <mesh>
          <torusGeometry args={[52, 5, 8, 32]} />
          <meshStandardMaterial color="#3d444d" metalness={0.65} roughness={0.42} flatShading />
        </mesh>
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((a) => (
          <mesh key={a} position={[Math.cos(a) * 26, Math.sin(a) * 26, 0]} rotation-z={a}>
            <boxGeometry args={[52, 3, 3]} />
            <meshStandardMaterial color="#262c35" metalness={0.6} roughness={0.5} />
          </mesh>
        ))}
        {/* Ring windows */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 52, Math.sin(a) * 52, 5.2]}>
              <boxGeometry args={[2.4, 1.2, 0.4]} />
              <meshBasicMaterial color={[2.2, 1.9, 1.3]} toneMapped={false} />
            </mesh>
          )
        })}
      </group>
      {/* Solar arrays */}
      {[68, -68].map((x) => (
        <group key={x} position={[x, 4, 0]}>
          <mesh>
            <boxGeometry args={[58, 0.8, 22]} />
            <meshStandardMaterial color="#101c38" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[x > 0 ? -30 : 30, 0, 0]}>
            <boxGeometry args={[4, 1.6, 2]} />
            <meshStandardMaterial color="#2a3140" metalness={0.7} roughness={0.45} />
          </mesh>
        </group>
      ))}
      {/* Comms dish */}
      <group position={[0, 32, 0]} rotation-x={-0.5}>
        <mesh>
          <coneGeometry args={[9, 4, 16, 1, true]} />
          <meshStandardMaterial color="#7d8794" metalness={0.6} roughness={0.35} side={2} />
        </mesh>
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 6, 6]} />
          <meshStandardMaterial color="#2a3140" metalness={0.7} roughness={0.45} />
        </mesh>
      </group>
      {/* Beacon */}
      <group ref={beaconRef} position={[0, 42, 0]}>
        <mesh>
          <sphereGeometry args={[1.6, 10, 10]} />
          <meshBasicMaterial color={[4, 2.2, 1.2]} toneMapped={false} />
        </mesh>
      </group>
      {/* Local floodlight so the station reads against space */}
      <pointLight position={[40, 60, 60]} color="#dde8ff" intensity={5} distance={260} decay={1.6} />
      {/* Contact boards */}
      <group ref={boardsRef}>
        {specs.map((spec, i) => (
          <Billboard key={i} spec={spec} accentColor={ACCENT} position={[0, 0, 0]} />
        ))}
      </group>
    </group>
  )
}
