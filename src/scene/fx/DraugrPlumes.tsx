import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Group, Mesh } from 'three'

/**
 * The Draugr's drive: FOUR plumes, because she has four engine bells.
 *
 * The nozzle positions are measured, not guessed — profiling the hull's aft
 * 12% found four vertex clusters of ~1,070 each in a clean 2x2 at ±23/±22 in
 * source units, which scale to ±1.4/±1.5 on a 44-unit hull whose stern tip
 * sits at x = -22. Bow is +X, so the plumes fire aft along -X.
 */

/** local offsets of the four bells (bow = +X) */
export const NOZZLES: [number, number, number][] = [
  [-22, 1.4, 1.5],
  [-22, 1.4, -1.5],
  [-22, -1.4, 1.5],
  [-22, -1.4, -1.5],
]

/** Mutable per-instance drive state; the owner writes it each frame. */
export interface DrivePower {
  /** 0 = cold, 1 = full burn */
  power: number
}

export function createDrivePower(): DrivePower {
  return { power: 0 }
}

export function DraugrPlumes({ drive }: { drive: DrivePower }) {
  const groupRef = useRef<Group>(null)
  const coneRefs = useRef<(Mesh | null)[]>([])

  useFrame(() => {
    const group = groupRef.current
    if (!group) return
    const p = drive.power
    group.visible = p > 0.01
    if (!group.visible) return
    // each bell flickers on its own, the way four separate reactors would
    for (let i = 0; i < coneRefs.current.length; i++) {
      const cone = coneRefs.current[i]
      if (!cone) continue
      const f = p * (0.82 + Math.random() * 0.36)
      cone.scale.set(f, f * (1 + Math.random() * 0.3), f)
    }
  })

  return (
    <group ref={groupRef} visible={false}>
      {NOZZLES.map(([x, y, z], i) => (
        <mesh
          key={i}
          ref={(el: Mesh | null) => {
            coneRefs.current[i] = el
          }}
          position={[x - 3.4, y, z]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <coneGeometry args={[0.62, 7, 8, 1, true]} />
          <meshBasicMaterial
            color={[2.1, 1.0, 1.9]}
            transparent
            opacity={0.8}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      <pointLight position={[-26, 0, 0]} color="#c07adf" intensity={2.4} distance={70} decay={1.8} />
    </group>
  )
}
