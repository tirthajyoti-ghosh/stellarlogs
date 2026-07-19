/**
 * All flight-feel tuning in one place. Units: world units, seconds, radians.
 * Tune here — nothing else in the physics needs touching.
 */
export const FLIGHT = {
  thrustAccel: 140,
  brakeAccel: 100,
  maxSpeed: 210,
  boostMaxSpeed: 520,
  boostAccelMult: 3.2,
  /** s^-1, exponential velocity decay (space "drag" for game feel) */
  linearDamping: 0.35,
  /**
   * s^-1 strength of the pull back toward maxSpeed when over it (e.g. after
   * boost ends). Keep LOW — high values feel like slamming the brakes.
   */
  overspeedBleed: 0.6,
  yawSpeed: 1.7,
  /** RCS translation authority (reverse burn + strafes), units/s^2 */
  rcsAccel: 95,
  /** After a warp pitches the hull, it levels back out at this rate (s^-1) */
  pitchAutolevel: 1.4,
} as const
