import { Quaternion, Vector3 } from 'three'

/**
 * The interpolated, render-ready ship transform, written once per frame by
 * <Ship> and read by the camera, HUD, and proximity systems. Mutable on
 * purpose — this changes every frame and must not go through React state.
 */
export const shipRig: {
  position: Vector3
  quaternion: Quaternion
  speed: number
  boosting: boolean
  thrusting: boolean
  boostCharge: number
  warping: boolean
  /** Pilot-commanded FLIP maneuver in progress */
  flipping: boolean
  yaw: number
  pitch: number
  /** Normalized direction of travel (holds last heading when stopped) */
  velocityDir: Vector3
  /** Impulse accumulator (world units/s) — activities write, Ship consumes */
  pendingImpulse: Vector3
  /** Injected attitude tumble rates (rad/s), decayed by Ship each frame */
  tumbleYaw: number
  tumblePitch: number
} = {
  position: new Vector3(),
  quaternion: new Quaternion(),
  speed: 0,
  boosting: false,
  thrusting: false,
  boostCharge: 1,
  warping: false,
  flipping: false,
  yaw: 0,
  pitch: 0,
  velocityDir: new Vector3(0, 0, -1),
  pendingImpulse: new Vector3(),
  tumbleYaw: 0,
  tumblePitch: 0,
}

// Dev-only inspection handle for debugging/automation
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__shipRig = shipRig
}
