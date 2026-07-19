import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, MathUtils, Vector3 } from 'three'
import { Billboard } from './Billboard'
import { buildBoards } from './boardSpecs'
import type { ContentItem } from '../../content/types'
import { shipRig } from '../../state/shipRig'

interface PlanetBoardsProps {
  item: ContentItem
  planetRadius: number
  /** Live world position of the planet (shared, mutated by the orbit) */
  worldPos: Vector3
  accentColor: string
}

/**
 * The Futurama signs: content boards orbiting a planet, fading/scaling in
 * when the ship approaches. Mounted lazily on first approach so image
 * textures never load for planets the visitor skips.
 */
export function PlanetBoards({ item, planetRadius, worldPos, accentColor }: PlanetBoardsProps) {
  const groupRef = useRef<Group>(null)
  const [activated, setActivated] = useState(false)
  const scaleRef = useRef(0)
  const specs = useMemo(
    () => (activated ? buildBoards(item, accentColor) : []),
    [activated, item, accentColor],
  )

  const showDistance = planetRadius * 7 + 220
  const orbitRadius = planetRadius * 1.75 + 40

  useFrame(({ clock }) => {
    const group = groupRef.current
    if (!group) return
    const distance = worldPos.distanceTo(shipRig.position)
    if (!activated && distance < showDistance * 1.6) setActivated(true)

    const target = distance < showDistance ? 1 : 0
    scaleRef.current = MathUtils.lerp(scaleRef.current, target, 0.08)
    const s = scaleRef.current
    group.visible = s > 0.02
    if (!group.visible) return
    group.scale.setScalar(s)

    // Slow procession of the boards around the planet
    const t = clock.elapsedTime * 0.045
    const n = Math.max(1, group.children.length)
    group.children.forEach((child, i) => {
      const angle = t + (i * Math.PI * 2) / n
      child.position.set(
        Math.cos(angle) * orbitRadius,
        Math.sin(clock.elapsedTime * 0.3 + i * 2.1) * planetRadius * 0.12,
        Math.sin(angle) * orbitRadius,
      )
    })
  })

  return (
    <group ref={groupRef}>
      {specs.map((spec, i) => (
        <Billboard key={i} spec={spec} accentColor={accentColor} position={[0, 0, 0]} />
      ))}
    </group>
  )
}
