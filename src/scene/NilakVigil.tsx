import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { Group, Vector3 } from 'three'
import { shipRig } from '../state/shipRig'
import { say } from '../state/activityState'
import { registerHudLabel } from '../hud/hudState'
import { triggerBell } from '../audio/engine'
import { lightCandle, getCandles, gClaims } from '../systems/tallies'
import { WRECK_POI } from '../config/pois'
import { FONT_BOLD } from './boards/font'

/**
 * THE VIGIL (docs/the-neighborhood.md — the wreck's secret, kept sacred).
 * A ship's bell salvaged from the Nilak, remounted on a stanchion off
 * her hull, with a sill of candles behind it. Ring it — one somber
 * toll, one more candle lit, forever (localStorage now; the backend
 * will one day make the count everyone's). No fanfare, no score.
 * G rings it; once per approach — a vigil is not a toy.
 */

const BELL_POS = new Vector3(
  WRECK_POI.position[0] + 90,
  WRECK_POI.position[1] + 10,
  WRECK_POI.position[2] + 60,
)
const RING_RANGE = 70
const MAX_FLAMES = 36

export function NilakVigil() {
  const [candles, setCandles] = useState(getCandles())
  const bellRef = useRef<Group>(null)
  const g = useRef({ near: false, rungThisApproach: false, swing: 0 })

  useEffect(() => {
    const off = registerHudLabel({
      id: 'poi-vigil',
      name: 'THE BELL',
      color: '#c9b48a',
      kind: 'poi',
      position: BELL_POS,
      yOffset: 26,
      el: null,
      detail: 'FOR THE NILAK — PRESS G, ONE TOLL',
      jumpStandoff: 320,
    })
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'KeyG' || e.repeat) return
      const st = g.current
      if (!st.near || st.rungThisApproach) return
      st.rungThisApproach = true
      st.swing = 1
      triggerBell()
      const n = lightCandle()
      setCandles(n)
      say(3, 'ONE FOR THE NILAK — ALL HANDS REMEMBERED', 'info', 6)
    }
    window.addEventListener('keydown', down)
    return () => {
      off()
      window.removeEventListener('keydown', down)
    }
  }, [])

  useFrame((_, dt) => {
    const st = g.current
    const d = shipRig.position.distanceTo(BELL_POS)
    st.near = d < RING_RANGE
    gClaims.vigil = st.near
    if (d > RING_RANGE * 2.2) st.rungThisApproach = false
    // the toll swings the bell, briefly, then stills
    st.swing = Math.max(0, st.swing - dt * 0.35)
    const bell = bellRef.current
    if (bell) {
      bell.rotation.z = Math.sin(st.swing * 14) * 0.24 * st.swing
    }
  })

  const flames = Math.min(candles, MAX_FLAMES)

  return (
    <group position={[BELL_POS.x, BELL_POS.y, BELL_POS.z]}>
      {/* the stanchion */}
      <mesh position={[0, -6, 0]}>
        <cylinderGeometry args={[0.5, 0.7, 12, 8]} />
        <meshStandardMaterial color="#3a4048" metalness={0.6} roughness={0.55} flatShading />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[5.2, 0.7, 0.7]} />
        <meshStandardMaterial color="#3a4048" metalness={0.6} roughness={0.55} flatShading />
      </mesh>
      {/* the bell, bronze, hung from the crossbar */}
      <group ref={bellRef} position={[0, 0, 0]}>
        <mesh position={[0, -1.6, 0]}>
          <cylinderGeometry args={[1.5, 2.1, 2.6, 12]} />
          <meshStandardMaterial color="#8a6a3c" metalness={0.85} roughness={0.35} />
        </mesh>
        <mesh position={[0, -3.1, 0]}>
          <sphereGeometry args={[0.34, 8, 8]} />
          <meshStandardMaterial color="#6a5230" metalness={0.9} roughness={0.3} />
        </mesh>
      </group>
      {/* the sill of candles, one per toll ever rung */}
      <group position={[0, -10.5, -3]}>
        <mesh>
          <boxGeometry args={[16, 0.8, 3]} />
          <meshStandardMaterial color="#2c333d" metalness={0.5} roughness={0.7} flatShading />
        </mesh>
        {Array.from({ length: flames }, (_, i) => {
          const row = Math.floor(i / 12)
          const col = i % 12
          return (
            <group key={i} position={[-6.6 + col * 1.2, 0.8, -0.8 + row * 1.1]}>
              <mesh>
                <cylinderGeometry args={[0.14, 0.16, 0.8, 6]} />
                <meshStandardMaterial color="#d8cfc0" roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.62, 0]}>
                <sphereGeometry args={[0.13, 6, 6]} />
                <meshBasicMaterial color={[2.4, 1.5, 0.6]} toneMapped={false} />
              </mesh>
            </group>
          )
        })}
      </group>
      {/* the plate */}
      <Text
        font={FONT_BOLD}
        fontSize={1.1}
        letterSpacing={0.22}
        color="#c9b48a"
        anchorX="center"
        anchorY="middle"
        position={[0, -8.6, -1.2]}
        material-toneMapped={false}
      >
        FOR THE NILAK — ALL HANDS
      </Text>
      <Text
        font={FONT_BOLD}
        fontSize={0.9}
        letterSpacing={0.18}
        color="#8fb8d8"
        anchorX="center"
        anchorY="middle"
        position={[0, -12.4, -1.2]}
        material-toneMapped={false}
      >
        {`CANDLES LIT ${candles}`}
      </Text>
    </group>
  )
}
