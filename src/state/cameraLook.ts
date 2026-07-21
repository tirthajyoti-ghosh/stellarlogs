/**
 * Free-look orbit state driven by mouse drag: dragging orbits the chase
 * camera around the ship; releasing eases back behind it. Angles in radians,
 * accumulated by the input layer, consumed (and eased) by the camera.
 */
export const cameraLook = {
  orbitYaw: 0,
  orbitPitch: 0,
  dragging: false,
  /** Impact shake 0..1 — set by activities on hits, decayed by the camera */
  shake: 0,
}
