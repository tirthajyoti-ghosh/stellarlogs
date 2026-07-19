/**
 * GPU/device quality tiers, decided once at startup. Everything expensive
 * reads from this: pixel ratio, postprocessing, geometry detail, counts.
 */

export type QualityTier = 'high' | 'medium' | 'low'

/**
 * Touch UI shows only for touch-first devices: touch points present AND the
 * primary pointer is coarse (finger). A touchscreen laptop driven by a mouse
 * reports a fine pointer, so it correctly gets the desktop controls.
 */
export const IS_TOUCH =
  typeof window !== 'undefined' &&
  navigator.maxTouchPoints > 0 &&
  window.matchMedia('(pointer: coarse)').matches

function detectTier(): QualityTier {
  if (typeof navigator === 'undefined') return 'high'
  const cores = navigator.hardwareConcurrency ?? 8
  const memory = (navigator as { deviceMemory?: number }).deviceMemory ?? 8

  if (IS_TOUCH) {
    // Phones/tablets: medium by default, low for weak hardware
    return cores <= 4 || memory <= 3 ? 'low' : 'medium'
  }
  if (cores <= 4 || memory <= 4) return 'medium'
  return 'high'
}

const TIER = detectTier()

interface QualitySettings {
  tier: QualityTier
  /** dpr range passed to the R3F Canvas */
  dpr: [number, number]
  postprocessing: boolean
  planetSegments: number
  /** multiplier applied to starfield point counts */
  starScale: number
  asteroidCount: number
  skyDomeSize: number
}

const SETTINGS: Record<QualityTier, QualitySettings> = {
  high: {
    tier: 'high',
    dpr: [1, 2],
    postprocessing: true,
    planetSegments: 64,
    starScale: 1,
    asteroidCount: 380,
    skyDomeSize: 4096,
  },
  medium: {
    tier: 'medium',
    dpr: [1, 1.5],
    postprocessing: true,
    planetSegments: 48,
    starScale: 0.6,
    asteroidCount: 200,
    skyDomeSize: 2048,
  },
  low: {
    tier: 'low',
    dpr: [1, 1.15],
    postprocessing: false,
    planetSegments: 32,
    starScale: 0.35,
    asteroidCount: 90,
    skyDomeSize: 2048,
  },
}

export const QUALITY: QualitySettings = SETTINGS[TIER]
