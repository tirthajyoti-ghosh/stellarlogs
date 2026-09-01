import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { Color, Group, InstancedMesh, Object3D, Vector3 } from 'three'
import { shipRig } from '../state/shipRig'
import { lvHails } from '../systems/liveness'
import { composeHail } from '../config/hails'
import { STATION_POSITION } from '../config/universe'
import { FONT_BOLD } from './boards/font'

/**
 * THE HAIL LINE (docs/the-liveness.md L3 — his GO 2026-09-01).
 * Visitor transmissions as beacon buoys, strung in an arc off the
 * Comms Station — the rolling window of the last 30 hails, oldest
 * expiring server-side (which is also the whole right-to-erasure
 * story). Buoy positions are DETERMINISTIC slots on the arc: nobody
 * places anything anywhere, so the entire placement-griefing class
 * (the Elden Ring ladder lesson) cannot exist here.
 *
 * Reading requires traversal (the research's one consistent law):
 * fly within reveal range and the nearest buoy speaks — one reused
 * Text, the Bruno single-bubble pattern.
 */

const STATION = new Vector3(...STATION_POSITION)
const SLOTS = 30
const ARC_R = 240
const ARC_SPAN = Math.PI * 0.9
const REVEAL_AT = 110
const _dummy = new Object3D()
const _color = new Color()
const _slot = new Vector3()

function slotPos(i: number, out: Vector3): Vector3 {
  const t = i / (SLOTS - 1)
  const a = -ARC_SPAN / 2 + t * ARC_SPAN + Math.PI * 0.25
  out.set(
    STATION.x + Math.cos(a) * ARC_R,
    STATION.y + Math.sin(i * 2.4) * 26,
    STATION.z + Math.sin(a) * ARC_R,
  )
  return out
}

export function HailLine() {
  const meshRef = useRef<InstancedMesh>(null)
  const labelGroupRef = useRef<Group>(null)
  const labelRef = useRef<{ text: string; sync?: () => void } | null>(null)
  const [count, setCount] = useState(0)
  const hails = useMemo(() => ({ list: lvHails() ?? [] }), [])

  useEffect(() => {
    const id = setInterval(() => {
      const list = lvHails()
      if (list) {
        hails.list = list
        setCount(list.length)
      }
    }, 5000)
    return () => clearInterval(id)
  }, [hails])

  // lay the buoys into their slots whenever the window changes
  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    for (let i = 0; i < count; i++) {
      slotPos(i, _slot)
      _dummy.position.copy(_slot)
      _dummy.rotation.set(0, 0, 0)
      _dummy.scale.setScalar(1.7)
      _dummy.updateMatrix()
      mesh.setMatrixAt(i, _dummy.matrix)
    }
    mesh.count = count
    mesh.instanceMatrix.needsUpdate = true
  }, [count])

  useFrame(({ clock }) => {
    const mesh = meshRef.current
    if (!mesh || count === 0) return
    // nav strobes: each buoy blinks on its own beat
    const t = clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const pulse = Math.max(0, Math.sin(t * 2.2 + i * 1.7)) ** 6
      _color.setRGB(0.15 + 1.9 * pulse, 0.35 + 1.4 * pulse, 0.5 + 0.7 * pulse)
      mesh.setColorAt(i, _color)
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

    // the nearest buoy inside reveal range speaks — one reused label
    let best = -1
    let bestD = REVEAL_AT
    for (let i = 0; i < count; i++) {
      const d = slotPos(i, _slot).distanceTo(shipRig.position)
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    const label = labelGroupRef.current
    if (!label) return
    if (best < 0 || !hails.list[best]) {
      label.visible = false
      return
    }
    label.visible = true
    slotPos(best, _slot)
    label.position.set(_slot.x, _slot.y + 8, _slot.z)
    label.rotation.y = Math.atan2(
      shipRig.position.x - _slot.x,
      shipRig.position.z - _slot.z,
    )
    const h = hails.list[best]
    const text = composeHail(h.o, h.l, h.s) + (h.f ? `  [${h.f}]` : '')
    const el = labelRef.current
    if (el && el.text !== text) {
      el.text = text
      el.sync?.()
    }
  })

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, SLOTS]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <group ref={labelGroupRef} visible={false}>
        <Text
          ref={((el: { text: string; sync?: () => void } | null) => {
            labelRef.current = el
          }) as never}
          font={FONT_BOLD}
          fontSize={2.1}
          letterSpacing={0.14}
          color="#9fe8f0"
          anchorX="center"
          anchorY="middle"
          maxWidth={38}
          textAlign="center"
          material-toneMapped={false}
          outlineWidth={0.28}
          outlineColor="#04121c"
        >
          {''}
        </Text>
      </group>
    </group>
  )
}
