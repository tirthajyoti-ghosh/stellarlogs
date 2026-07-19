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
  yaw: number
} = {
  position: new Vector3(),
  quaternion: new Quaternion(),
  speed: 0,
  boosting: false,
  thrusting: false,
  boostCharge: 1,
  warping: false,
  yaw: 0,
}

// Dev-only inspection handle for debugging/automation
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__shipRig = shipRig
}
