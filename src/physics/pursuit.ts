import type { Vector3 } from 'three'

/**
 * PURSUIT ASSIST (the-hunt.md pass 4 amendments, locked 2026-08-09).
 * The chase's skill is the throttle, not pixel-aiming a keyboard yaw — so
 * on contract the flight computer offers a HOLD: fly your nose into the
 * capture disc around the quarry and the RCS keeps it there. The bench
 * verdict shapes the feel: a hand, never a magnet — soft gain, deadband,
 * capped authority — and any yaw/pitch input breaks it instantly.
 *
 * The capture cone is Tirtha's geometry: a fixed WORLD-radius disc around
 * HER, projected — tiny and demanding at range, wide and forgiving up
 * close. The activity that owns the hunt sets `target`; Ship.tsx flies it.
 */
export const pursuit = {
  /** the quarry's live position; null = no assist offered */
  target: null as Vector3 | null,
  /** world radius of the capture disc around the target */
  captureRadius: 180,
  /** the computer currently holds the nose */
  engaged: false,
  /** current angular separation nose→target, radians (for the HUD ring) */
  sep: 0,
}
