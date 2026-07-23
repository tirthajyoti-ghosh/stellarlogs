/**
 * Activity / point-of-interest world placements shared by scene + HUD layers.
 * The gunnery range sits between spawn and the Projects/Work systems —
 * far enough that a fresh visitor never spawns inside the auto-start ring.
 */
export const GUNNERY_POI = {
  /** Open space west of spawn: the LIVE arena (2600) clears every system
   *  star by 400+ so a drifting battle can never reach readable billboards */
  position: [-2500, -80, 100] as [number, number, number],
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

/**
 * The wreck of the NILAK — the ice hauler the raiders took, drifting on the
 * spawn→Projects lane. The reason the militia exists. Nothing to play;
 * everything to understand.
 */
export const WRECK_POI = {
  /** 350u off the spawn→Projects lane, clear of planet gravity wells so a
   *  visitor can sit with her without drifting */
  position: [-350, -35, -1100] as [number, number, number],
  standoff: 320,
}

/**
 * INTERAMNIA DRIFT — the Belter colony that owns this neighborhood: the
 * militia, the racing club, the docks the ice runs to. The Nilak's wreck
 * lies between the colony and the lane: she died on approach.
 */
export const DRIFT_POI = {
  position: [-731, -25, -1092] as [number, number, number],
  standoff: 540,
}
