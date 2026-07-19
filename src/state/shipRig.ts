import { Quaternion, Vector3 } from 'three'

/**
 * The interpolated, render-ready ship transform, written once per frame by
 * <Ship> and read by the camera, HUD, and proximity systems. Mutable on
 * purpose — this changes every frame and must not go through React state.
 */
export const shipRig = {
  position: new Vector3(),
  quaternion: new Quaternion(),
  speed: 0,
  boosting: false,
  thrusting: false,
  boostCharge: 1,
  yaw: 0,
}
