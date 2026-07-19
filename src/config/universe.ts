/**
 * World layout and scale. One unit ≈ a few meters of "game space".
 * Systems live within a ~16k-unit radius so float32 precision is never an
 * issue (no camera-relative rendering needed).
 */
export const SPAWN_POSITION: [number, number, number] = [0, 0, 600]
export const SPAWN_YAW = 0 // facing -Z, toward the dev sun

/** Placeholder sun for Phase 1/2 visual development. */
export const DEV_SUN_POSITION: [number, number, number] = [0, 0, -2200]
export const DEV_SUN_RADIUS = 380
