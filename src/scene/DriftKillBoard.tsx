import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { Group } from 'three'
import { shipRig } from '../state/shipRig'
import { getTorpsDowned, getRocksStopped } from '../systems/tallies'
import { lvTotals } from '../systems/liveness'
import { DRIFT_POI } from '../config/pois'
import { FONT_BOLD } from './boards/font'

/**
 * THE MILITIA KILL-BOARD (docs/the-neighborhood.md — a liveness frame,
 * and since docs/the-liveness.md L1 a LIVE one). The big number is
 * every pilot's torpedoes downed — ALL HANDS — with this pilot's own
 * tally beneath. Local-first honesty: until the relay answers, the
 * board shows exactly what it always showed (your numbers, unlabeled).
 */

const POS = [DRIFT_POI.position[0] + 250, DRIFT_POI.position[1] + 66, DRIFT_POI.position[2] + 210] as const

export function DriftKillBoard() {
  const boardRef = useRef<Group>(null)
  const numRef = useRef<{ text: string; sync?: () => void } | null>(null)
  const yoursRef = useRef<{ text: string; sync?: () => void } | null>(null)
  const rocksRef = useRef<{ text: string; sync?: () => void } | null>(null)

  useFrame(() => {
    const board = boardRef.current
    if (board) {
      board.rotation.y = Math.atan2(
        shipRig.position.x - POS[0],
        shipRig.position.z - POS[2],
      )
    }
    const all = lvTotals()
    const num = numRef.current
    if (num) {
      const text = all ? String(all.torps) : String(getTorpsDowned())
      if (num.text !== text) {
        num.text = text
        num.sync?.()
      }
    }
    const yours = yoursRef.current
    if (yours) {
      const text = all ? `ALL HANDS · YOURS — ${getTorpsDowned()}` : ''
      if (yours.text !== text) {
        yours.text = text
        yours.sync?.()
      }
    }
    const rocks = rocksRef.current
    if (rocks) {
      const text = all
        ? `KHIONE ROCKS STOPPED — ${all.rocks} · YOURS ${getRocksStopped()}`
        : `KHIONE ROCKS STOPPED — ${getRocksStopped()}`
      if (rocks.text !== text) {
        rocks.text = text
        rocks.sync?.()
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
        position={[0, -2.6, 1.3]}
        material-toneMapped={false}
      >
        {''}
      </Text>
      <Text
        ref={((el: { text: string; sync?: () => void } | null) => {
          yoursRef.current = el
        }) as never}
        font={FONT_BOLD}
        fontSize={2.1}
        letterSpacing={0.2}
        color="#5f7c92"
        anchorX="center"
        anchorY="middle"
        position={[0, -6.4, 1.3]}
        material-toneMapped={false}
      >
        {''}
      </Text>
      <Text
        ref={((el: { text: string; sync?: () => void } | null) => {
          rocksRef.current = el
        }) as never}
        font={FONT_BOLD}
        fontSize={2.6}
        letterSpacing={0.18}
        color="#9fdcff"
        anchorX="center"
        anchorY="middle"
        position={[0, -8.9, 1.3]}
        material-toneMapped={false}
      >
        {''}
      </Text>
    </group>
  )
}
