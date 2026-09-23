import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { NpcPlume, type NpcPlumeHandle } from './NpcPlume'

/**
 * The Draugr's drive: FOUR plumes, because she has four engine bells.
 *
 * The nozzle positions are measured, not guessed — profiling the hull's aft
 * 12% found four vertex clusters of ~1,070 each in a clean 2x2 at ±23/±22 in
 * source units, which scale to ±1.4/±1.5 on a 44-unit hull whose stern tip
 * sits at x = -22. Bow is +X, so the plumes fire aft along -X.
 *
 * 2026-09-10 (his "same plume on every ship" order): the four cones became
 * four of the player's own volumetric flames, tinted violet — a raider's
 * drive chemistry runs dirty.
 */

/** local offsets of the four bells (bow = +X) — re-measured 2026-09-23:
 *  barrel rows at y 2.75 / -1.75, columns z ±1.25, mouths at x≈-19.9 */
export const NOZZLES: [number, number, number][] = [
  [-20.1, 2.75, 1.25],
  [-20.1, 2.75, -1.25],
  [-20.1, -1.75, 1.25],
  [-20.1, -1.75, -1.25],
]

/** Mutable per-instance drive state; the owner writes it each frame. */
export interface DrivePower {
  /** 0 = cold, 1 = full burn */
  power: number
}

export function createDrivePower(): DrivePower {
  return { power: 0 }
}

const VIOLET: [number, number, number] = [1.35, 0.55, 1.5]

export function DraugrPlumes({ drive }: { drive: DrivePower }) {
  const groupRef = useRef<Group>(null)
  const plumeRefs = useRef<(NpcPlumeHandle | null)[]>([])

  useFrame(() => {
    const group = groupRef.current
    if (!group) return
    const p = drive.power
    group.visible = p > 0.01
    // each bell flickers on its own, the way four separate reactors would
    for (let i = 0; i < plumeRefs.current.length; i++) {
      plumeRefs.current[i]?.setStage(group.visible ? p * (1.7 + Math.random() * 0.3) : 0)
    }
  })

  return (
    <group ref={groupRef} visible={false}>
      {NOZZLES.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]} rotation={[0, 0, -Math.PI / 2]}>
          <NpcPlume
            ref={(h) => {
              plumeRefs.current[i] = h
            }}
            dia={2.6}
            len={12}
            tint={VIOLET}
          />
        </group>
      ))}
      <pointLight position={[-24, 0.5, 0]} color="#c07adf" intensity={2.4} distance={70} decay={1.8} />
    </group>
  )
}
