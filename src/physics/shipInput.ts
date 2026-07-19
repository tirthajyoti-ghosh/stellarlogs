/**
 * Mutable ship input intents, written by control hooks (keyboard, touch) and
 * read by the physics step. RCS-style 6-axis scheme: the ship translates on
 * three axes and rotates only in yaw — no banking, no nose-pitching.
 * Values normalized: thrust/reverse 0..1, strafes and yaw -1..1
 * (strafeX + = right, strafeY + = up, yaw + = rotate left).
 */
export interface ShipInput {
  thrust: number
  reverse: number
  strafeX: number
  strafeY: number
  yaw: number
  boost: boolean
}

export const shipInput: ShipInput = {
  thrust: 0,
  reverse: 0,
  strafeX: 0,
  strafeY: 0,
  yaw: 0,
  boost: false,
}
