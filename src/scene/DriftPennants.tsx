import { useMemo, useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { Group } from 'three'
import { shipRig } from '../state/shipRig'
import { lvCountries } from '../systems/liveness'
import { DRIFT_POI } from '../config/pois'
import { FONT_BOLD } from './boards/font'

/**
 * THE PENNANT LINE (docs/the-liveness.md L2 — his GO 2026-09-01).
 * A cord strung at the docks, one pennant per country that has ever
 * docked a ship here — port-registry codes on plates, the way a real
 * harbor flies courtesy flags. Grows monotonically, never resets,
 * says "people from n places stood where you stand." Flags derive
 * from browser locale client-side (never geo-IP) and carry no times,
 * no order, no identity.
 *
 * Renders nothing until the relay answers with at least one country —
 * an empty cord would be the empty-room lie.
 */

// strung directly under the militia kill-board — the one clear band in
// the docks signage stack (the flank collides with THE CRIB's cradle)
const POS = [
  DRIFT_POI.position[0] + 250,
  DRIFT_POI.position[1] + 38,
  DRIFT_POI.position[2] + 210,
] as const
const SHOWN_MAX = 24
const SPACING = 5.2

export function DriftPennants() {
  const rootRef = useRef<Group>(null)
  const [countries, setCountries] = useState<string[]>([])

  useEffect(() => {
    const id = setInterval(() => {
      const list = lvCountries()
      if (list && list.length !== countries.length) setCountries([...list].sort())
    }, 5000)
    return () => clearInterval(id)
  }, [countries.length])

  const shown = useMemo(() => countries.slice(0, SHOWN_MAX), [countries])

  useFrame(() => {
    const root = rootRef.current
    if (!root) return
    root.visible = shown.length > 0
    if (root.visible) {
      root.rotation.y = Math.atan2(shipRig.position.x - POS[0], shipRig.position.z - POS[2])
    }
  })

  const width = Math.max(shown.length - 1, 1) * SPACING

  return (
    <group ref={rootRef} position={[POS[0], POS[1], POS[2]]} visible={false}>
      {/* the cord */}
      <mesh rotation={[0, 0, 0]} position={[0, 3.2, 0]}>
        <boxGeometry args={[width + 10, 0.18, 0.18]} />
        <meshStandardMaterial color="#3a4a5c" metalness={0.6} roughness={0.5} />
      </mesh>
      <Text
        font={FONT_BOLD}
        fontSize={2.2}
        letterSpacing={0.22}
        color="#9fd8ef"
        anchorX="center"
        anchorY="middle"
        position={[0, 6.4, 0]}
        material-toneMapped={false}
      >
        {`PORT REGISTRY — SHIPS FROM ${countries.length} ${countries.length === 1 ? 'PORT' : 'PORTS'}`}
      </Text>
      {shown.map((code, i) => (
        <group key={code} position={[(i - (shown.length - 1) / 2) * SPACING, 0.4, 0]}>
          <mesh>
            <boxGeometry args={[3.6, 4.6, 0.3]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? '#1d2836' : '#22303f'}
              metalness={0.4}
              roughness={0.65}
              flatShading
            />
          </mesh>
          <Text
            font={FONT_BOLD}
            fontSize={1.7}
            letterSpacing={0.1}
            color="#ffc06e"
            anchorX="center"
            anchorY="middle"
            position={[0, 0, 0.4]}
            material-toneMapped={false}
          >
            {code}
          </Text>
        </group>
      ))}
    </group>
  )
}
