/**
 * Activity / point-of-interest world placements shared by scene + HUD layers.
 * The gunnery range sits between spawn and the Projects/Work systems —
 * far enough that a fresh visitor never spawns inside the auto-start ring.
 */
export const GUNNERY_POI = {
  position: [-1600, -60, -1600] as [number, number, number],
  /** Warp/jump arrival distance — lands OUTSIDE the auto-start ring (1400) */
  standoff: 1700,
}

/**
 * BELT RUN time trial — the START gate on the near edge of the Projects
 * asteroid belt. Jump arrival lands short of the gate; the clock only
 * starts when the ship actually crosses the START ring.
 */
export const BELTRUN_POI = {
  position: [310, -20, -1142] as [number, number, number],
  standoff: 380,
}
