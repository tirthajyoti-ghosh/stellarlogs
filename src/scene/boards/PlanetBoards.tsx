import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, MathUtils, Vector3 } from 'three'
import { Billboard } from './Billboard'
import { buildBoards } from './boardSpecs'
import { useShaderWarmup } from './useShaderWarmup'
import type { ContentItem } from '../../content/types'
import { shipRig } from '../../state/shipRig'
import { perfFlags } from '../../config/perfFlags'

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
 *
 * Approaching one used to freeze the game for ~700 ms (measured; see
 * useShaderWarmup for the profile). Two things caused it and both are handled
 * here: the GPU driver compiling every board shader the first time a board was
 * drawn, and the scene graph swallowing the entire subtree in a single frame.
 * So the boards now mount a few at a time, well before they are needed, their
 * shaders are compiled off the critical path, and only then are they revealed.
 */
export function PlanetBoards({ item, planetRadius, worldPos, accentColor }: PlanetBoardsProps) {
  const groupRef = useRef<Group>(null)
  const [activated, setActivated] = useState(false)
  /** how many boards have been handed to the scene graph so far */
  const [mounted, setMounted] = useState(0)
  const scaleRef = useRef(0)
  const placedFor = useRef(0)
  const specs = useMemo(
    () => (activated ? buildBoards(item, accentColor) : []),
    [activated, item, accentColor],
  )

  const showDistance = planetRadius * 7 + 220
  const orbitRadius = planetRadius * 1.75 + 40

  const fullyMounted = activated && mounted >= specs.length && specs.length > 0
  const warm = useShaderWarmup(groupRef, fullyMounted)
  const ready = !perfFlags.boardWarmup || warm

  useFrame(() => {
    const group = groupRef.current
    if (!group) return
    const distance = worldPos.distanceTo(shipRig.position)

    // Start early. The work below is invisible, so the only cost of beginning
    // it sooner is that it is finished by the time the boards are wanted.
    const lead = perfFlags.boardWarmup ? 3 : 1.6
    if (!activated && distance < showDistance * lead) setActivated(true)

    // One board per frame. The whole set at once is a 190 ms matrix update;
    // spread out it is a rounding error, and nothing is on screen yet anyway.
    if (activated && mounted < specs.length) {
      setMounted((n) => (perfFlags.boardWarmup ? n + 1 : specs.length))
    }

    const target = distance < showDistance && ready ? 1 : 0
    const next = MathUtils.lerp(scaleRef.current, target, 0.08)
    // DEADBAND: a settled cluster must not touch its scale — one setScalar
    // marks the root dirty and force-walks every descendant's world matrix.
    if (Math.abs(next - scaleRef.current) > 0.0008 || Math.abs(next - target) > 0.0008) {
      scaleRef.current = Math.abs(next - target) <= 0.0008 ? target : next
      group.scale.setScalar(scaleRef.current)
    }
    group.visible = scaleRef.current > 0.02
    if (!group.visible) return

    // Geostationary ring positions depend only on the child count — write
    // them when a board mounts, never per frame (constant writes were
    // force-walking the whole cluster).
    const n = Math.max(1, group.children.length)
    if (n !== placedFor.current) {
      placedFor.current = n
      group.children.forEach((child, i) => {
        const angle = (i * Math.PI * 2) / n
        child.position.set(
          Math.cos(angle) * orbitRadius,
          (i % 2 === 0 ? 1 : -1) * planetRadius * 0.16,
          Math.sin(angle) * orbitRadius,
        )
      })
    }
  })

  return (
    <group ref={groupRef} visible={false}>
      {specs.slice(0, mounted).map((spec, i) => (
        <Billboard
          key={i}
          spec={spec}
          accentColor={accentColor}
          position={[0, 0, 0]}
          planetWorldPos={worldPos}
        />
      ))}
    </group>
  )
}
