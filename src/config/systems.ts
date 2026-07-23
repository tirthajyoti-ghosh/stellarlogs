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
 * The neighborhood, opened up (2026-07-23): systems 4.2–9.1k from spawn with
 * ≥3.8k between neighbors — breathing room between the ports, activities in
 * the seams. Projects still burns dead ahead of spawn; warp for the hops.
 */
const PLACEMENTS: SystemPlacement[] = [
  { content: PROJECTS, position: [0, 0, -4200], seedBase: 1 },
  { content: WORK, position: [-5200, 430, -3900], seedBase: 11 },
  { content: BLOG, position: [7000, -360, -2600], seedBase: 21 },
  { content: RECOMMENDATIONS, position: [-9100, 290, -450], seedBase: 31 },
  { content: READING, position: [8100, 720, 4200], seedBase: 41 },
  { content: SHOWS, position: [4350, -720, 6400], seedBase: 51 },
  { content: TRAVEL, position: [-6400, -500, 5500], seedBase: 61 },
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

/**
 * THE TRACK — the Drift Racing Club's slingshot circuit: a dim red dwarf
 * with two heavy, nearly-parked gas giants whose gravity wells ARE the
 * course. Not a content system; the giants' boards belong to the club.
 * (Racing migrated here from the Projects belt — see story-layer doc.)
 */
const RACE_CONTROL: ContentItem = {
  title: 'Race Control — The Track',
  subtitle: 'Drift Racing Club · slingshot circuit',
  overview:
    'Ten gates, two gravity wells, one clock. Cross the START ring and fly the line — the giants will bend it for you if you dare them close. Kids from the Amnia run this in 80 flat.',
}
const THE_BOARD: ContentItem = {
  title: 'The Board',
  subtitle: 'Fast times · Drift Racing Club',
  overview:
    'The club keeps the times. The line between a fast lap and a scattering of debris is how deep you cut the wells. Fly sasa, beratna.',
}

const TRACK_SYSTEM: SystemConfig = {
  id: 'track',
  name: 'The Track',
  starColor: '#ff6a50',
  starRadius: 120,
  position: [5200, 200, -6000],
  overview: "The Drift Racing Club's slingshot circuit.",
  planets: [
    {
      type: 'gasGiant',
      rings: true,
      radius: 70,
      orbitRadius: 500,
      orbitSpeed: 0.0009,
      phase: 0,
      seed: 71,
      inclination: 0.03,
      item: RACE_CONTROL,
    },
    {
      type: 'gasGiant',
      rings: false,
      radius: 60,
      orbitRadius: 900,
      orbitSpeed: 0.0007,
      phase: Math.PI,
      seed: 72,
      inclination: -0.04,
      item: THE_BOARD,
    },
  ],
}

export const ALL_SYSTEMS: SystemConfig[] = [...PLACEMENTS.map(buildSystem), TRACK_SYSTEM]
