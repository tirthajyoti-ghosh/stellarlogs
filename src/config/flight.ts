/**
 * All flight-feel tuning in one place. Units: world units, seconds, radians.
 * Tune here — nothing else in the physics needs touching.
 */
export const FLIGHT = {
  thrustAccel: 85,
  brakeAccel: 60,
  maxSpeed: 115,
  boostMaxSpeed: 280,
  boostAccelMult: 3.2,
  /** s^-1, exponential velocity decay (space "drag" for game feel) */
  linearDamping: 0.35,
  /**
   * s^-1 strength of the pull back toward maxSpeed when over it (e.g. after
   * boost ends). Keep LOW — high values feel like slamming the brakes.
   */
  overspeedBleed: 0.6,
  yawSpeed: 1.7,
  pitchSpeed: 1.15,
  pitchLimit: 1.25,
  pitchAutolevel: 0.12,
  /** Full boost charge lasts this many seconds */
  boostDuration: 1.6,
  boostRechargeTime: 2.5,
  /** Charge needed to fire boost normally */
  boostMinCharge: 0.15,
  /** After running dry, charge needed before boost can re-ignite (prevents pulsing) */
  boostReigniteCharge: 0.6,
} as const
