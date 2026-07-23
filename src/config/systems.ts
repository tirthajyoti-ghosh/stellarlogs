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
  /** Orbit around this planet (by index) instead of the star — a MOON */
  parent?: number
  /** Skip content boards (racing moons carry names, not resumes) */
  noBoards?: boolean
  /** Well override — the Track's wells are heavy where content wells are polite */
  gravity?: { strength: number; influence: number; maxPull: number }
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
 * THE TRACK — the Drift Racing Club's slingshot venue: a TRUE OUTER SYSTEM
 * at the far edge of the map (the sport lives beyond the belt in canon).
 * A dim red dwarf, a ringed Saturn-class giant, a colossal Jovian, and a
 * pale ice giant — with MOONS on visibly moving orbits. The wells here are
 * HEAVY (per-body gravity overrides): the race is flown drive-dark on
 * attitude thrusters, stealing every meter per second from these bodies.
 * Moons are named, boardless, and carry the gates.
 */
const RACE_CONTROL: ContentItem = {
  title: 'Race Control — The Track',
  subtitle: 'Drift Racing Club · slingshot circuit · drive-dark racing',
  overview:
    'Build speed in the launch corridor — the main drive LOCKS at the start line. After that it is gravity and attitude thrusters only: dive the wells, sling the moons, steal your speed from the giants. Kids from the Amnia run this in 90 flat.',
}
const THE_BOARD: ContentItem = {
  title: 'The Board',
  subtitle: 'Fast times · Drift Racing Club',
  overview:
    'The club keeps the times. The line between a fast lap and a long cold drift is how deep you dare the wells with your drive dark. Fly sasa, beratna.',
}
const moonItem = (name: string): ContentItem => ({ title: name })

const TRACK_SYSTEM: SystemConfig = {
  id: 'track',
  name: 'The Track',
  starColor: '#ff6a50',
  starRadius: 120,
  position: [10500, 300, -10500],
  overview: "The Drift Racing Club's slingshot venue — an outer system flown drive-dark.",
  planets: [
    {
      // 0 — the Saturn-class: first sling of the run
      type: 'gasGiant',
      rings: true,
      radius: 150,
      orbitRadius: 2600,
      orbitSpeed: 0.00004,
      phase: (240 * Math.PI) / 180,
      seed: 71,
      item: RACE_CONTROL,
      gravity: { strength: 120, influence: 2400, maxPull: 200 },
    },
    {
      // 1 — the Jovian: the great fall at the middle of the run
      type: 'gasGiant',
      rings: false,
      radius: 210,
      orbitRadius: 4600,
      orbitSpeed: 0.00003,
      phase: (320 * Math.PI) / 180,
      seed: 72,
      item: THE_BOARD,
      gravity: { strength: 150, influence: 3200, maxPull: 260 },
    },
    {
      // 2 — the ice giant: the long cold coast to the finish
      type: 'ice',
      radius: 110,
      orbitRadius: 7400,
      orbitSpeed: 0.000025,
      phase: (335 * Math.PI) / 180,
      seed: 73,
      item: moonItem('Deepwater'),
      noBoards: true,
      gravity: { strength: 80, influence: 1800, maxPull: 150 },
    },
    {
      // 3 — KAAT, the Saturn-class moon: gate 1 rides her
      type: 'barren',
      radius: 30,
      orbitRadius: 420,
      orbitSpeed: 0.03,
      phase: 0.8,
      seed: 74,
      item: moonItem('Kaat'),
      parent: 0,
      noBoards: true,
      gravity: { strength: 60, influence: 650, maxPull: 160 },
    },
    {
      // 4 — VEYU, inner Jovian moon: gate 3 rides her (the trailing boost)
      type: 'ice',
      radius: 34,
      orbitRadius: 540,
      orbitSpeed: 0.024,
      phase: 2.4,
      seed: 75,
      item: moonItem('Veyu'),
      parent: 1,
      noBoards: true,
      gravity: { strength: 70, influence: 760, maxPull: 180 },
    },
    {
      // 5 — OSO, outer Jovian moon: hazard and free boost for the brave
      type: 'barren',
      radius: 26,
      orbitRadius: 860,
      orbitSpeed: 0.014,
      phase: 4.9,
      seed: 76,
      item: moonItem('Oso'),
      parent: 1,
      noBoards: true,
      gravity: { strength: 55, influence: 620, maxPull: 150 },
    },
  ],
}

export const ALL_SYSTEMS: SystemConfig[] = [...PLACEMENTS.map(buildSystem), TRACK_SYSTEM]
