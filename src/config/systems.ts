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
  lava: 48,
  barren: 42,
  terrestrialWet: 70,
  terrestrialDry: 58,
  gasGiant: 118,
  ice: 60,
}

const FIRST_ORBIT = 1250
const ORBIT_STEP = 650
const keplerSpeed = (orbitRadius: number) => 0.018 * Math.pow(FIRST_ORBIT / orbitRadius, 1.5)

interface SystemPlacement {
  content: SystemContent
  position: [number, number, number]
  seedBase: number
}

/**
 * Solar neighborhood layout: Projects dead ahead of spawn, Work to port,
 * the personal systems behind. All within a ~13k radius.
 */
const PLACEMENTS: SystemPlacement[] = [
  { content: PROJECTS, position: [0, 0, -8400], seedBase: 1 },
  { content: WORK, position: [-12600, 350, -13000], seedBase: 11 },
  { content: BLOG, position: [13200, -260, -11300], seedBase: 21 },
  { content: RECOMMENDATIONS, position: [-16600, 220, -1900], seedBase: 31 },
  { content: READING, position: [16300, 540, -500], seedBase: 41 },
  { content: SHOWS, position: [11000, -470, 9800], seedBase: 51 },
  { content: TRAVEL, position: [-11300, -360, 10400], seedBase: 61 },
]

function buildSystem({ content, position, seedBase }: SystemPlacement): SystemConfig {
  const phaseStep = (Math.PI * 2) / content.items.length
  return {
    id: content.id,
    name: content.name,
    starColor: content.starColor,
    starRadius: 340,
    position,
    overview: content.overview,
    planets: content.items.map((item, i) => {
      const slot = TYPE_BY_SLOT[i % TYPE_BY_SLOT.length]
      const orbitRadius = FIRST_ORBIT + i * ORBIT_STEP
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
