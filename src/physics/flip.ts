import { shipRig } from '../state/shipRig'
import { warp } from './warp'

/**
 * Pilot-commanded FLIP — the fundamental Expanse maneuver. One tap and the
 * flight computer holds the stick through a 180°: nose to RETROGRADE (so a
 * main-drive burn kills your velocity), or a plain heading reversal when
 * drifting too slowly for retrograde to mean anything. No hidden autopilot:
 * it slews at the same RCS rates the pilot has, and any manual rotation
 * input cancels it instantly.
 */

export const flip = {
  active: false,
  targetYaw: 0,
  targetPitch: 0,
}

export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

export function requestFlip(): void {
  if (warp.phase !== 'idle' || flip.active) return
  if (shipRig.speed > 5) {
    // Nose to retrograde: nose = (-sin y·cos p, sin p, -cos y·cos p) = -v̂
    const d = shipRig.velocityDir
    flip.targetYaw = Math.atan2(d.x, d.z)
    flip.targetPitch = Math.asin(Math.max(-1, Math.min(1, -d.y)))
  } else {
    // Nearly at rest: simple end-over-end heading reversal
    flip.targetYaw = shipRig.yaw + Math.PI
    flip.targetPitch = -shipRig.pitch
  }
  flip.active = true
}

export function cancelFlip(): void {
  flip.active = false
}

/**
 * Synthetic stick deflection driving the flip (same -1..1 range as the
 * pilot's keys — the computer gets no stronger thrusters than you do).
 * Clears `active` when the attitude settles on target.
 */
export function flipStick(currentYaw: number, currentPitch: number): { yaw: number; pitch: number } {
  const dy = wrapAngle(flip.targetYaw - currentYaw)
  const dp = wrapAngle(flip.targetPitch - currentPitch)
  if (Math.abs(dy) < 0.05 && Math.abs(dp) < 0.05) {
    flip.active = false
    return { yaw: 0, pitch: 0 }
  }
  return {
    yaw: Math.max(-1, Math.min(1, dy * 2.4)),
    pitch: Math.max(-1, Math.min(1, dp * 2.4)),
  }
}
