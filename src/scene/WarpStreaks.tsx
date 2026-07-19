import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Quaternion,
  Vector3,
} from 'three'
import { shipRig } from '../state/shipRig'
import { warp } from '../physics/warp'

const COUNT = 360
const TUBE_RADIUS_MIN = 30
const TUBE_RADIUS_MAX = 260
const TUBE_LENGTH = 3200
const STREAK_LENGTH = 260

const _dir = new Vector3()
const _quat = new Quaternion()
const FORWARD = new Vector3(0, 0, -1)

/**
 * Hyperspace star streaks: a tube of radially-distributed light lines around
 * the flight path that scream past during a jump, converging toward the
 * destination point — the classic game warp read.
 */
export function WarpStreaks() {
  const groupRef = useRef<Group>(null)
  const lineRef = useRef<LineSegments>(null)
  const opacity = useRef(0)

  const { geometry, offsets } = useMemo(() => {
    const offsets = new Float32Array(COUNT * 3) // radial x, radial y, axial z
    const positions = new Float32Array(COUNT * 2 * 3)
    const colors = new Float32Array(COUNT * 2 * 3)
    let seed = 987654321
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    for (let i = 0; i < COUNT; i++) {
      const a = rng() * Math.PI * 2
      const r = TUBE_RADIUS_MIN + rng() * (TUBE_RADIUS_MAX - TUBE_RADIUS_MIN)
      offsets[i * 3] = Math.cos(a) * r
      offsets[i * 3 + 1] = Math.sin(a) * r
      offsets[i * 3 + 2] = rng() * TUBE_LENGTH - TUBE_LENGTH / 2
      // head bright blue-white, tail dim blue
      colors[i * 6] = 0.75
      colors[i * 6 + 1] = 0.9
      colors[i * 6 + 2] = 1.0
      colors[i * 6 + 3] = 0.2
      colors[i * 6 + 4] = 0.35
      colors[i * 6 + 5] = 0.7
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('color', new BufferAttribute(colors, 3))
    return { geometry, offsets }
  }, [])

  useFrame((_, dt) => {
    const group = groupRef.current
    const lines = lineRef.current
    if (!group || !lines) return

    const jumping = warp.phase === 'jump'
    opacity.current += ((jumping ? 1 : 0) - opacity.current) * (1 - Math.exp(-(jumping ? 6 : 10) * dt))
    const material = lines.material as LineBasicMaterial
    material.opacity = opacity.current * 0.85
    group.visible = opacity.current > 0.02
    if (!group.visible) return

    // Orient the tube along the travel direction, centered on the ship
    _dir.copy(warp.arrival).sub(shipRig.position)
    if (_dir.lengthSq() > 1) {
      _quat.setFromUnitVectors(FORWARD, _dir.normalize())
      group.quaternion.copy(_quat)
    }
    group.position.copy(shipRig.position)

    // March streaks backward through the tube, wrapping ahead
    const relSpeed = Math.max(shipRig.speed * 1.1, 2000)
    const positions = geometry.getAttribute('position') as BufferAttribute
    const stretch = STREAK_LENGTH * Math.min(1, shipRig.speed / 12000 + 0.25)
    for (let i = 0; i < COUNT; i++) {
      let z = offsets[i * 3 + 2]
      z += relSpeed * dt // streaks fly past toward local +Z (behind the ship)
      if (z > TUBE_LENGTH / 2) z -= TUBE_LENGTH
      offsets[i * 3 + 2] = z
      const x = offsets[i * 3]
      const y = offsets[i * 3 + 1]
      positions.setXYZ(i * 2, x, y, z)
      positions.setXYZ(i * 2 + 1, x, y, z - stretch)
    }
    positions.needsUpdate = true
  })

  return (
    <group ref={groupRef} visible={false}>
      <lineSegments ref={lineRef} geometry={geometry} frustumCulled={false}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  )
}
