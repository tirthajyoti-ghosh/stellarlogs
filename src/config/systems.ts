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
  /** UNSURVEYED: mass and light only — no boards, no jobs. The Deep's
   *  doorstep, pre-positioned (docs/the-neighborhood.md §3). */
  inert?: boolean
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
/** THE NEIGHBORHOOD LIFT (2026-08-09, starmap.html verdict): same
 *  neighbors, real depth — the tabletop plane is dead. Travel scale held. */
const PLACEMENTS: SystemPlacement[] = [
  { content: PROJECTS, position: [0, 810, -3800], seedBase: 1 },
  { content: WORK, position: [-5050, 2150, -3700], seedBase: 11 },
  { content: BLOG, position: [6650, -1700, -2500], seedBase: 21 },
  { content: RECOMMENDATIONS, position: [-8650, -1450, -650], seedBase: 31 },
  { content: READING, position: [7550, 2500, 4150], seedBase: 41 },
  { content: SHOWS, position: [3950, -2350, 6100], seedBase: 51 },
  { content: TRAVEL, position: [-6100, 1550, 5500], seedBase: 61 },
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
  subtitle: 'Drift Racing Club · THE WATER RUN · eight rings, one lap',
  overview:
    'In the Dry Weeks the club ran raw ice through this system, lap after lap, so the Drift never went dry. Now they run the route for time. Eight rings, the lap ends where it begins. A miss costs seconds, never the run. Kids from the Amnia run this in 90 flat.',
}
const THE_BOARD: ContentItem = {
  title: 'The Board',
  subtitle: 'Fast times · Drift Racing Club',
  overview:
    "The club keeps the times: the Kids' Time, the Club Time, and the Surveyor's Time, which nobody holds for long. The fast line dives the giant — gravity turns you for free, if you dare fly low. Fly sasa, beratna.",
}
const moonItem = (name: string): ContentItem => ({ title: name })

const TRACK_SYSTEM: SystemConfig = {
  id: 'track',
  name: 'The Track',
  starColor: '#ff6a50',
  starRadius: 120,
  position: [10100, -1170, -10100],
  overview: "The Drift Racing Club's home circuit — THE WATER RUN, eight rings around the giants.",
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

/**
 * THE INERT STARS — five minor systems between and off-plane: mass and
 * light where the map was empty. Labeled UNSURVEYED in the HUD: the word
 * is the Deep's doorstep, planted early. No boards, no jobs.
 */
const inertPlanet = (name: string, seed: number): PlanetConfig => ({
  type: 'barren',
  radius: 19,
  orbitRadius: 520,
  orbitSpeed: keplerSpeed(520),
  phase: seed * 2.3,
  seed,
  inclination: 0.06,
  item: { title: name },
  noBoards: true,
})
const INERT_SYSTEMS: SystemConfig[] = [
  {
    id: 'khione',
    name: 'Khione',
    starColor: '#cfe3ff',
    starRadius: 70,
    position: [3650, 4750, 1950],
    overview: 'A white dwarf logged and left. Unsurveyed.',
    planets: [],
    inert: true,
  },
  {
    id: 'salt',
    name: 'Salt',
    starColor: '#ff8a66',
    starRadius: 90,
    position: [-3100, 3650, -13700],
    overview: 'A red dwarf north of the lanes. Unsurveyed.',
    planets: [],
    inert: true,
  },
  {
    id: 'ember',
    name: 'Ember',
    starColor: '#ff7a52',
    starRadius: 95,
    position: [12900, 2650, -9500],
    overview: 'A red dwarf with one cold stone. Unsurveyed.',
    planets: [inertPlanet('Ember b', 71)],
    inert: true,
  },
  {
    id: 'harrow',
    name: 'Harrow',
    starColor: '#ffd9a0',
    starRadius: 80,
    position: [-16500, 1700, 4750],
    overview: 'A dim pair past the western reach. Unsurveyed.',
    planets: [inertPlanet('Harrow b', 81)],
    inert: true,
  },
  {
    id: 'vestige',
    name: 'Vestige',
    starColor: '#b0603a',
    starRadius: 85,
    position: [1800, -4500, 12600],
    overview: 'A brown dwarf barely burning. Unsurveyed.',
    planets: [],
    inert: true,
  },
]

export const ALL_SYSTEMS: SystemConfig[] = [
  ...PLACEMENTS.map(buildSystem),
  TRACK_SYSTEM,
  ...INERT_SYSTEMS,
]
