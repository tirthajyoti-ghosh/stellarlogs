import { Vector3 } from 'three'

/**
 * THE SPINE (docs/the-spine.md, blessed 2026-08-09) — state and law.
 *
 * One keel-mounted railgun: the whole ship is the mount, the pilot's
 * flying IS the aiming — no assist, no tuning, no ballistics. HOLD the
 * trigger to charge (1.5 s), release at full charge to fire; release
 * early and the capacitors vent. Full charge keeps only 2.5 s, then
 * vents itself. Seven seconds of cycling between slugs: sniper rhythm
 * against the PDCs' rain.
 *
 * IMPOUND RULES: interdiction contracts want hulls and stories intact —
 * the spine is SAFED while a manhunt runs (IceRoute owns the flag).
 *
 * The slug only adjudicates against REGISTERED targets (the proving
 * line's plates, later the storm's boulders) — combat balance is
 * structurally untouchable by it.
 */

export const RAIL = {
  CHARGE_S: 1.5,
  HOLD_MAX_S: 2.5,
  COOLDOWN_S: 7,
  KICK: 26,
  RANGE: 5200,
} as const

export type RailPhase = 'ready' | 'charge' | 'hold' | 'cool'

export const railgun = {
  phase: 'ready' as RailPhase,
  t: 0,
  /** impound rules — set by the hunt, blocks the trigger */
  safed: false,
  /** trigger currently held (key or touch) */
  held: false,
  /** one-shot event flags consumed by the scene layer */
  fireRequested: false,
  ventRequested: false,
  chargeStarted: false,
  /** the pilot pressed T while safed — the HUD answers once */
  safedPressAt: 0,
}

export function railTriggerDown(): void {
  if (railgun.held) return
  railgun.held = true
  if (railgun.safed) {
    railgun.safedPressAt = performance.now() / 1000
    return
  }
  if (railgun.phase !== 'ready') return
  railgun.phase = 'charge'
  railgun.t = 0
  railgun.chargeStarted = true
}

export function railTriggerUp(): void {
  railgun.held = false
  if (railgun.phase === 'charge') {
    railgun.phase = 'ready'
    railgun.t = 0
    railgun.ventRequested = true
  } else if (railgun.phase === 'hold') {
    railgun.fireRequested = true
  }
}

/** advance the machine; the scene layer consumes the one-shot flags */
export function railStep(dt: number): void {
  railgun.t += dt
  if (railgun.phase === 'charge' && railgun.t >= RAIL.CHARGE_S) {
    railgun.phase = 'hold'
    railgun.t = 0
  } else if (railgun.phase === 'hold' && railgun.t >= RAIL.HOLD_MAX_S) {
    // capacitors won't keep forever: self-vent into cooldown
    railgun.phase = 'cool'
    railgun.t = RAIL.COOLDOWN_S * 0.6 // partial cycle — a vent isn't a shot
    railgun.ventRequested = true
  } else if (railgun.phase === 'cool' && railgun.t >= RAIL.COOLDOWN_S) {
    railgun.phase = 'ready'
    railgun.t = 0
  }
}

/** things a slug may lawfully hit */
export interface RailTarget {
  /** live world position ref */
  position: Vector3
  radius: number
  alive: () => boolean
  onHit: (point: Vector3) => void
}

export const railTargets: RailTarget[] = []

export function registerRailTarget(t: RailTarget): () => void {
  railTargets.push(t)
  return () => {
    const i = railTargets.indexOf(t)
    if (i !== -1) railTargets.splice(i, 1)
  }
}
