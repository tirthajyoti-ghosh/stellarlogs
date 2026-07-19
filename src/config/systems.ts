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

/** Phase 2 showcase — becomes the Projects system in Phase 3. */
export const PROJECTS_SYSTEM: SystemConfig = {
  id: 'projects',
  name: 'Projects',
  starColor: '#5CAFFB',
  starRadius: 300,
  position: [0, 0, -3200],
  planets: [
    { type: 'gasGiant', radius: 110, orbitRadius: 750, orbitSpeed: 0.02, phase: 0.6, seed: 1, rings: true, inclination: 0.14 },
    { type: 'terrestrialWet', radius: 72, orbitRadius: 1100, orbitSpeed: 0.015, phase: 2.4, seed: 2, inclination: -0.07 },
    { type: 'lava', radius: 55, orbitRadius: 1420, orbitSpeed: 0.012, phase: 4.1, seed: 3, inclination: 0.1 },
    { type: 'ice', radius: 66, orbitRadius: 1760, orbitSpeed: 0.01, phase: 5.3, seed: 4, inclination: -0.12 },
    { type: 'terrestrialDry', radius: 60, orbitRadius: 2080, orbitSpeed: 0.008, phase: 1.5, seed: 5, inclination: 0.06 },
    { type: 'barren', radius: 45, orbitRadius: 2380, orbitSpeed: 0.007, phase: 3.2, seed: 6, inclination: -0.09 },
  ],
}
