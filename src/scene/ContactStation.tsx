import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, MathUtils, Vector3 } from 'three'
import { Billboard } from './boards/Billboard'
import { buildBoards } from './boards/boardSpecs'
import { CONTACT } from '../content/contact'
import { STATION_POSITION } from '../config/universe'
import { shipRig } from '../state/shipRig'

const ACCENT = CONTACT.starColor

const HULL = { color: '#4a5262', metalness: 0.7, roughness: 0.4, flatShading: true }
const PANEL = { color: '#2a3140', metalness: 0.7, roughness: 0.45, flatShading: true }
const TRUSS = { color: '#3a424e', metalness: 0.65, roughness: 0.5 }

/** Segmented solar wing: truss boom + 2×4 panel grid, slightly tilted. */
function SolarWing({ side }: { side: 1 | -1 }) {
  const segments = [0, 1, 2, 3]
  return (
    <group position={[side * 24, 4, 0]} rotation-z={side * -0.08}>
      {/* Boom */}
      <mesh position={[side * 34, 0, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[1.1, 1.1, 68, 8]} />
        <meshStandardMaterial {...TRUSS} />
      </mesh>
      {/* Boom lattice hints */}
      {[10, 26, 42, 58].map((d) => (
        <mesh key={d} position={[side * d, 0, 0]}>
          <boxGeometry args={[0.7, 3.4, 3.4]} />
          <meshStandardMaterial {...PANEL} />
        </mesh>
      ))}
      {/* Panel grid: two rows of four segments with gaps */}
      {segments.map((i) =>
        [1, -1].map((row) => (
          <mesh key={`${i}-${row}`} position={[side * (12 + i * 15), 0, row * 7.6]} rotation-x={0.12 * row}>
            <boxGeometry args={[13.5, 0.35, 13.4]} />
            <meshStandardMaterial
              color="#101c38"
              metalness={0.85}
              roughness={0.22}
              emissive="#0a1430"
              emissiveIntensity={0.35}
            />
          </mesh>
        )),
      )}
      {/* Wing tip light */}
      <mesh position={[side * 69, 0, 0]}>
        <sphereGeometry args={[0.9, 8, 8]} />
        <meshBasicMaterial color={side > 0 ? [0.1, 2.2, 0.15] : [2.4, 0.1, 0.1]} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** ISS-style segmented radiator: white panels on a spine, angled off-plane. */
function Radiator({ side }: { side: 1 | -1 }) {
  return (
    <group position={[0, -2, side * 20]} rotation-x={side * 0.5}>
      <mesh position={[0, 0, side * 14]}>
        <cylinderGeometry args={[0.5, 0.5, 28, 6]} />
        <meshStandardMaterial {...TRUSS} />
      </mesh>
      {[6, 14, 22].map((d) => (
        <mesh key={d} position={[0, 0, side * d]}>
          <boxGeometry args={[10.5, 0.25, 6.8]} />
          <meshStandardMaterial color="#c8ccd2" metalness={0.25} roughness={0.55} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * The comms station near spawn — fills the contact gap the 2D site had.
 * Industrial build: octagonal hub, rotating habitat ring, truss-mounted
 * solar wings, deployed radiators, tank farm, comms mast, docking port.
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
      {/* Central hub stack */}
      <mesh rotation-y={Math.PI / 8}>
        <cylinderGeometry args={[16, 16, 34, 8]} />
        <meshStandardMaterial {...HULL} />
      </mesh>
      <mesh position={[0, 22, 0]} rotation-y={Math.PI / 8}>
        <cylinderGeometry args={[8, 12, 10, 8]} />
        <meshStandardMaterial {...PANEL} />
      </mesh>
      <mesh position={[0, -21, 0]} rotation-y={Math.PI / 8}>
        <cylinderGeometry args={[11, 15, 8, 8]} />
        <meshStandardMaterial {...PANEL} />
      </mesh>
      {/* Hub plating ribs */}
      {[8, 0, -8].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation-y={Math.PI / 8}>
          <cylinderGeometry args={[16.4, 16.4, 1.2, 8]} />
          <meshStandardMaterial {...PANEL} />
        </mesh>
      ))}
      {/* Hub window band */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = ((i + 0.5) / 8) * Math.PI * 2
        return (
          <mesh key={`hw-${i}`} position={[Math.cos(a) * 16.2, 3, Math.sin(a) * 16.2]} rotation-y={-a}>
            <boxGeometry args={[0.5, 1.6, 4.2]} />
            <meshBasicMaterial color={[2.0, 1.8, 1.3]} toneMapped={false} />
          </mesh>
        )
      })}
      {/* Docking port, nadir: collar + cross-struts + approach lights */}
      <group position={[0, -29, 0]}>
        <mesh>
          <cylinderGeometry args={[5.5, 7, 6, 8]} />
          <meshStandardMaterial {...HULL} />
        </mesh>
        <mesh position={[0, -3.6, 0]}>
          <cylinderGeometry args={[4.2, 4.2, 1.4, 16]} />
          <meshStandardMaterial color="#10151c" metalness={0.8} roughness={0.35} />
        </mesh>
        {[0, Math.PI / 2].map((a) => (
          <mesh key={a} position={[0, -1, 0]} rotation-y={a}>
            <boxGeometry args={[13, 1, 1]} />
            <meshStandardMaterial {...TRUSS} />
          </mesh>
        ))}
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4
          return (
            <mesh key={`dl-${i}`} position={[Math.cos(a) * 5.4, -4, Math.sin(a) * 5.4]}>
              <sphereGeometry args={[0.55, 6, 6]} />
              <meshBasicMaterial color={[2.6, 2.4, 1.6]} toneMapped={false} />
            </mesh>
          )
        })}
      </group>
      {/* Propellant tank farm clustered against the hub */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.5
        return (
          <mesh key={`tank-${i}`} position={[Math.cos(a) * 13, -14, Math.sin(a) * 13]}>
            <capsuleGeometry args={[3.2, 6, 6, 12]} />
            <meshStandardMaterial color="#7d8794" metalness={0.6} roughness={0.35} />
          </mesh>
        )
      })}
      {/* Rotating habitat ring */}
      <group ref={ringRef} rotation-x={Math.PI / 2}>
        <mesh>
          <torusGeometry args={[52, 5, 8, 32]} />
          <meshStandardMaterial color="#3d444d" metalness={0.65} roughness={0.42} flatShading />
        </mesh>
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((a) => (
          <mesh key={a} position={[Math.cos(a) * 26, Math.sin(a) * 26, 0]} rotation-z={a}>
            <boxGeometry args={[52, 3, 3]} />
            <meshStandardMaterial {...PANEL} />
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
        {/* Ring outer plating details */}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2 + 0.2
          return (
            <mesh key={`rp-${i}`} position={[Math.cos(a) * 57.5, Math.sin(a) * 57.5, 0]} rotation-z={a}>
              <boxGeometry args={[1.2, 6, 4]} />
              <meshStandardMaterial {...PANEL} />
            </mesh>
          )
        })}
      </group>
      {/* Solar wings on trusses */}
      <SolarWing side={1} />
      <SolarWing side={-1} />
      {/* Deployed radiators */}
      <Radiator side={1} />
      <Radiator side={-1} />
      {/* Comms mast: main dish + two small dishes + whips */}
      <group position={[0, 32, 0]}>
        <mesh position={[0, 4, 0]}>
          <cylinderGeometry args={[0.5, 0.7, 10, 6]} />
          <meshStandardMaterial {...TRUSS} />
        </mesh>
        <group position={[0, 8, 0]} rotation-x={-0.5}>
          <mesh>
            <coneGeometry args={[9, 4, 16, 1, true]} />
            <meshStandardMaterial color="#7d8794" metalness={0.6} roughness={0.35} side={2} />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 6, 6]} />
            <meshStandardMaterial {...PANEL} />
          </mesh>
        </group>
        {[1, -1].map((s) => (
          <group key={s} position={[s * 4, 1.5, s * 2]} rotation-z={s * 0.8} rotation-x={0.3}>
            <mesh>
              <coneGeometry args={[2.2, 1.1, 12, 1, true]} />
              <meshStandardMaterial color="#8d95a0" metalness={0.55} roughness={0.4} side={2} />
            </mesh>
          </group>
        ))}
        <mesh position={[2, 10, -1]} rotation-z={-0.15}>
          <cylinderGeometry args={[0.08, 0.02, 9, 4]} />
          <meshStandardMaterial {...PANEL} />
        </mesh>
      </group>
      {/* Beacon */}
      <group ref={beaconRef} position={[0, 46, 0]}>
        <mesh>
          <sphereGeometry args={[1.6, 10, 10]} />
          <meshBasicMaterial color={[4, 2.2, 1.2]} toneMapped={false} />
        </mesh>
      </group>
      {/* Local floodlights so the station reads against space */}
      <pointLight position={[40, 60, 60]} color="#dde8ff" intensity={5} distance={260} decay={1.6} />
      <pointLight position={[-50, -30, -40]} color="#ffe8cc" intensity={3} distance={220} decay={1.7} />
      {/* Contact boards */}
      <group ref={boardsRef}>
        {specs.map((spec, i) => (
          <Billboard key={i} spec={spec} accentColor={ACCENT} position={[0, 0, 0]} />
        ))}
      </group>
    </group>
  )
}
