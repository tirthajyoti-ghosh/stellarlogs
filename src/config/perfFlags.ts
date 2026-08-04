/**
 * Runtime switches for every performance optimisation, so each one can be
 * turned OFF and ON while the scene is running.
 *
 * This exists for the no-pop contract. Verifying "the world still looks the
 * same" by screenshotting two different builds is unreliable — planets have
 * orbited, traffic has moved, clocks have advanced. Toggling a flag and
 * shooting the SAME scene milliseconds apart isolates exactly one variable:
 * the optimisation. Everything else is identical by construction.
 *
 * Defaults are ON. In dev the object is exposed as `window.__perf`.
 */
export const perfFlags = {
  /** Asteroid belts: real instance bounds + frustum culling + rock LOD */
  beltCulling: true,
  /** Screen-size driven tessellation for planets and stars */
  bodyLod: true,
  /** Distance/screen-size LOD on ship hulls */
  shipLod: true,
  /**
   * Compile board shaders before the boards are revealed, and mount them a
   * few at a time. Off = the old behaviour, which froze the frame for ~700 ms
   * on approach. Kept switchable so the fix can be A/B'd on a live scene.
   */
  boardWarmup: true,
  /**
   * Move the pixel ratio within the tier's range when the machine cannot hold
   * the display's refresh. Off = pinned at the tier ceiling, which is what
   * shipped before.
   */
  adaptiveResolution: true,
}

export type PerfFlag = keyof typeof perfFlags

if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__perf = perfFlags
}
