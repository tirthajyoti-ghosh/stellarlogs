/**
 * Drive-dark racing: while locked, the main drive and afterburner are dead
 * and translation RCS drops to trim authority — attitude control stays
 * full. Set by the Track when a run starts (the canon slingshot-racing
 * rule: your entry speed is the last thrust you own). Cleared on
 * finish/DNF/restart-idle.
 */
export const driveLock = {
  locked: false,
  /** Fraction of reverse/strafe authority left while locked — Alex's puffs */
  trim: 0.35,
}
