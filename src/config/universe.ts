/**
 * World layout and scale. One unit ≈ a few meters of "game space".
 * Systems live within a ~16k-unit radius so float32 precision is never an
 * issue (no camera-relative rendering needed).
 */
export const SPAWN_POSITION: [number, number, number] = [0, 0, 600]
export const SPAWN_YAW = 0 // facing -Z, toward the Projects system

/** The comms station sits just off the spawn route so visitors notice it. */
export const STATION_POSITION: [number, number, number] = [520, 40, -450]
