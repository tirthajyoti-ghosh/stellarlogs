/**
 * Activity / point-of-interest world placements shared by scene + HUD layers.
 * The gunnery range sits between spawn and the Projects/Work systems —
 * far enough that a fresh visitor never spawns inside the auto-start ring.
 */
export const GUNNERY_POI = {
  /** Open space west of spawn: the LIVE arena (2600) clears every system
   *  star by 400+ so a drifting battle can never reach readable billboards */
  position: [-3400, -100, 200] as [number, number, number],
  /** Warp/jump arrival distance — lands OUTSIDE the auto-start ring (1400) */
  standoff: 1700,
}

/**
 * THE TRACK — the racing club's slingshot circuit START gate, south side of
 * the Track system (racing migrated here from the Projects belt). Jump
 * arrival lands short of the gate; the clock starts at the line.
 */
export const TRACK_POI = {
  /** The STAGING mouth of the launch corridor — arrive here, then burn */
  position: [5700, -1170, -11000] as [number, number, number],
  standoff: 420,
}

/**
 * THE NILAK SITE — where the ice hauler died on approach. Her hull was
 * long since scrapped for parts (a colony wastes nothing); what stands
 * here now is THE VIGIL: the holographic memorial. The reason the
 * militia exists. Nothing to play; everything to understand.
 */
export const WRECK_POI = {
  /** Off the spawn→Projects lane, lifted well above the traffic plane so
   *  the memorial stands clear of the Drift's silhouette */
  position: [-310, 100, -1430] as [number, number, number],
  standoff: 320,
}

/**
 * INTERAMNIA DRIFT — the Belter colony that owns this neighborhood: the
 * militia, the racing club, the docks the ice runs to. The Nilak's wreck
 * lies between the colony and the lane: she died on approach.
 */
export const DRIFT_POI = {
  position: [-1050, -30, -1650] as [number, number, number],
  standoff: 540,
}

