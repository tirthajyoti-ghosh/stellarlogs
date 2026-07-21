import type { ContentItem, SystemContent } from '../content/types'
import { WORK } from '../content/work'
import { PROJECTS } from '../content/projects'
import { BLOG } from '../content/blog'
import { RECOMMENDATIONS } from '../content/recommendations'
import { READING, SHOWS } from '../content/personal'
import { TRAVEL } from '../content/travel'

/** Visual/orbital configuration for star systems, built from content. */

export type PlanetType =
  | 'gasGiant'
  | 'lava'
  | 'ice'
  | 'terrestrialWet'
  | 'terrestrialDry'
  | 'barren'

export interface PlanetConfig {
  type: PlanetType
  radius: number
  orbitRadius: number
  /** rad/s — keep slow so orbiting billboards stay readable */
  orbitSpeed: number
  /** starting angle, radians */
  phase: number
  seed: number
  rings?: boolean
  /** orbit-plane tilt, radians — small values add a lot of visual depth */
  inclination?: number
  /** The portfolio content this planet carries on its billboards */
  item: ContentItem
}

export interface SystemConfig {
  id: string
  name: string
  starColor: string
  starRadius: number
  position: [number, number, number]
  overview: string
  planets: PlanetConfig[]
}

/**
 * Planet archetypes per orbit slot, innermost → outermost, following
 * formation science: scorched rocky worlds near the star, terrestrials in
 * the temperate zone, gas giant near the frost line, ice beyond.
 */
const TYPE_BY_SLOT: { type: PlanetType; rings?: boolean }[] = [
  { type: 'lava' },
  { type: 'barren' },
  { type: 'terrestrialWet' },
  { type: 'terrestrialDry' },
  { type: 'gasGiant', rings: true },
  { type: 'ice' },
]

const RADIUS_BY_TYPE: Record<PlanetType, number> = {
  lava: 22,
  barren: 19,
  terrestrialWet: 32,
  terrestrialDry: 26,
  gasGiant: 53,
  ice: 27,
}

// Compact systems for the dense neighborhood map: outermost orbit stays
// ≤ ~1400 regardless of planet count so systems never interpenetrate at
// 3.2k+ spacing (see docs/experience-redesign-2026-07.md).
const FIRST_ORBIT = 420
const orbitStep = (count: number) => (count <= 6 ? 190 : 980 / (count - 1))
const keplerSpeed = (orbitRadius: number) => 0.018 * Math.pow(FIRST_ORBIT / orbitRadius, 1.5)

interface SystemPlacement {
  content: SystemContent
  position: [number, number, number]
  seedBase: number
}

/**
 * Dense, glanceable neighborhood (experience redesign 2026-07): all systems
 * 3.5–6.5k from spawn, cruisable in 30–60s of boost, warp for hops. Projects
 * burns dead ahead of spawn; activities live in the seams between systems.
 * Minimum inter-system spacing 3.2k (> 2× the 1400 outermost orbit).
 */
const PLACEMENTS: SystemPlacement[] = [
  { content: PROJECTS, position: [0, 0, -2900], seedBase: 1 },
  { content: WORK, position: [-3600, 300, -2700], seedBase: 11 },
  { content: BLOG, position: [4800, -250, -1800], seedBase: 21 },
  { content: RECOMMENDATIONS, position: [-6300, 200, -300], seedBase: 31 },
  { content: READING, position: [5600, 500, 2900], seedBase: 41 },
  { content: SHOWS, position: [3000, -500, 4400], seedBase: 51 },
  { content: TRAVEL, position: [-4400, -350, 3800], seedBase: 61 },
]

function buildSystem({ content, position, seedBase }: SystemPlacement): SystemConfig {
  const phaseStep = (Math.PI * 2) / content.items.length
  return {
    id: content.id,
    name: content.name,
    starColor: content.starColor,
    starRadius: 200,
    position,
    overview: content.overview,
    planets: content.items.map((item, i) => {
      const slot = TYPE_BY_SLOT[i % TYPE_BY_SLOT.length]
      const orbitRadius = FIRST_ORBIT + i * orbitStep(content.items.length)
      return {
        type: slot.type,
        rings: slot.rings,
        radius: RADIUS_BY_TYPE[slot.type],
        orbitRadius,
        orbitSpeed: keplerSpeed(orbitRadius),
        phase: seedBase * 1.7 + i * (phaseStep + 0.9),
        seed: seedBase + i,
        inclination: (i % 2 === 0 ? 1 : -1) * (0.04 + ((seedBase + i) % 5) * 0.02),
        item,
      }
    }),
  }
}

export const ALL_SYSTEMS: SystemConfig[] = PLACEMENTS.map(buildSystem)
