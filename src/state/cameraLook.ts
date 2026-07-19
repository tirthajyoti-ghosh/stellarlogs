/**
 * Free-look state driven by plain mouse movement (no buttons): the cursor's
 * offset from screen center orbits the chase camera around the ship.
 * Steering drags take priority — the camera freezes while `dragging`.
 */
export const cameraLook = {
  /** Normalized cursor position, -1..1 each axis, 0 = screen center. */
  x: 0,
  y: 0,
  dragging: false,
}
