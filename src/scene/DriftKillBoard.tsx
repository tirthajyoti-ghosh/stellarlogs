import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { Group } from 'three'
import { shipRig } from '../state/shipRig'
import { getTorpsDowned } from '../systems/tallies'
import { DRIFT_POI } from '../config/pois'
import { FONT_BOLD } from './boards/font'

/**
 * THE MILITIA KILL-BOARD (docs/the-neighborhood.md — a liveness frame).
 * Painted on the docks under the jobs board: this pilot's torpedoes
 * downed, honest and local. When the backend lands, the same frame
 * carries everyone's count.
 */

const POS = [DRIFT_POI.position[0] + 250, DRIFT_POI.position[1] + 66, DRIFT_POI.position[2] + 210] as const

export function DriftKillBoard() {
  const boardRef = useRef<Group>(null)
  const numRef = useRef<{ text: string; sync?: () => void } | null>(null)

  useFrame(() => {
    const board = boardRef.current
    if (board) {
      board.rotation.y = Math.atan2(
        shipRig.position.x - POS[0],
        shipRig.position.z - POS[2],
      )
    }
    const num = numRef.current
    if (num) {
      const text = String(getTorpsDowned())
      if (num.text !== text) {
        num.text = text
        num.sync?.()
      }
    }
  })

  return (
    <group ref={boardRef} position={[POS[0], POS[1], POS[2]]}>
      <mesh>
        <boxGeometry args={[64, 20, 2]} />
        <meshStandardMaterial color="#161d27" metalness={0.55} roughness={0.6} flatShading />
      </mesh>
      <Text
        font={FONT_BOLD}
        fontSize={3.4}
        letterSpacing={0.18}
        color="#9fd8ef"
        anchorX="center"
        anchorY="middle"
        position={[0, 5.5, 1.3]}
        material-toneMapped={false}
      >
        AMNIA MILITIA — TORPEDOES DOWNED
      </Text>
      <Text
        ref={((el: { text: string; sync?: () => void } | null) => {
          numRef.current = el
        }) as never}
        font={FONT_BOLD}
        fontSize={7}
        letterSpacing={0.14}
        color="#ffc06e"
        anchorX="center"
        anchorY="middle"
        position={[0, -3.5, 1.3]}
        material-toneMapped={false}
      >
        {''}
      </Text>
    </group>
  )
}
