import { Vector3 } from 'three'

/**
 * Shared imperative state between activities and the ship's PDC turrets
 * (same pattern as shipRig/hudReadouts — written and read per frame, no React).
 *
 * An activity (e.g. the gunnery range) WRITES `targets` + `firing`; the
 * ship's turret update READS targets, aims the rigs, and WRITES back lock
 * count, muzzle transforms and motion telemetry (for audio).
 */

export interface TurretMuzzle {
  /** World-space muzzle tip */
  position: Vector3
  /** World-space aim direction */
  direction: Vector3
  /** Index into `targets` this turret is tracking, or -1 */
  targetIndex: number
}

export const turretControl = {
  /** World-space target points, written by the active activity (empty = stand down) */
  targets: [] as { position: Vector3 }[],
  /** Guns live — set by the active activity while its drill runs */
  firing: false,

  // ---- written back by the ship's turret update ----
  /** Turrets currently tracking a target */
  locks: 0,
  /** Per-turret muzzle state (fixed length = turret count once discovered) */
  muzzles: [] as TurretMuzzle[],
  /** Summed |angular velocity| of all turrets, rad/s — drives servo audio */
  traverseSpeed: 0,
  /** Barrel spin amount 0..1 (spun up while firing with locks) */
  spin: 0,
}
