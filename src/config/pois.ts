/**
 * Activity / point-of-interest world placements shared by scene + HUD layers.
 * The gunnery range sits between spawn and the Projects/Work systems —
 * far enough that a fresh visitor never spawns inside the auto-start ring.
 */
export const GUNNERY_POI = {
  position: [-1600, -60, -1600] as [number, number, number],
  /** Warp/jump arrival distance — lands OUTSIDE the auto-start ring (900) */
  standoff: 1150,
}
