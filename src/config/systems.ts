/** Visual/orbital configuration for star systems (content attaches in Phase 3). */

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
}

export interface SystemConfig {
  id: string
  name: string
  starColor: string
  starRadius: number
  position: [number, number, number]
  planets: PlanetConfig[]
}

/**
 * Phase 2 showcase — becomes the Projects system in Phase 3.
 * Planet ordering follows planetary-formation science: scorched rocky worlds
 * near the star, habitable terrestrials in the temperate zone, then the gas
 * giant near the frost line, ice world beyond it. Orbit speeds fall off
 * Kepler-style (v ∝ r^-1.5, scaled for gameplay).
 */
const keplerSpeed = (orbitRadius: number, innermost = 1250, base = 0.018) =>
  base * Math.pow(innermost / orbitRadius, 1.5)

export const PROJECTS_SYSTEM: SystemConfig = {
  id: 'projects',
  name: 'Projects',
  starColor: '#5CAFFB',
  starRadius: 340,
  position: [0, 0, -5400],
  planets: [
    { type: 'lava', radius: 48, orbitRadius: 1250, orbitSpeed: keplerSpeed(1250), phase: 4.1, seed: 3, inclination: 0.05 },
    { type: 'barren', radius: 42, orbitRadius: 1780, orbitSpeed: keplerSpeed(1780), phase: 3.2, seed: 6, inclination: -0.08 },
    { type: 'terrestrialWet', radius: 70, orbitRadius: 2450, orbitSpeed: keplerSpeed(2450), phase: 2.4, seed: 2, inclination: -0.04 },
    { type: 'terrestrialDry', radius: 58, orbitRadius: 3080, orbitSpeed: keplerSpeed(3080), phase: 1.5, seed: 5, inclination: 0.07 },
    { type: 'gasGiant', radius: 118, orbitRadius: 3850, orbitSpeed: keplerSpeed(3850), phase: 0.6, seed: 1, rings: true, inclination: 0.11 },
    { type: 'ice', radius: 60, orbitRadius: 4550, orbitSpeed: keplerSpeed(4550), phase: 5.3, seed: 4, inclination: -0.1 },
  ],
}
