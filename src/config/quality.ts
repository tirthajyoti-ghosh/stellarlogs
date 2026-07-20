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
  /** width of the baked equirect planet textures (height = width/2) */
  bakeWidth: number
  /** multiplier applied to starfield point counts */
  starScale: number
  asteroidCount: number
}

const SETTINGS: Record<QualityTier, QualitySettings> = {
  high: {
    tier: 'high',
    // Capped at 1.5 even on Retina: ~44% fewer shaded pixels than dpr 2 for a
    // nearly invisible sharpness cost — the single cheapest fps win we have.
    dpr: [1, 1.5],
    postprocessing: true,
    planetSegments: 64,
    bakeWidth: 2048,
    starScale: 1,
    asteroidCount: 380,
  },
  medium: {
    tier: 'medium',
    dpr: [1, 1.5],
    postprocessing: true,
    planetSegments: 48,
    bakeWidth: 1024,
    starScale: 0.6,
    asteroidCount: 200,
  },
  low: {
    tier: 'low',
    dpr: [1, 1.15],
    postprocessing: false,
    planetSegments: 32,
    bakeWidth: 512,
    starScale: 0.35,
    asteroidCount: 90,
  },
}

export const QUALITY: QualitySettings = SETTINGS[TIER]
