/**
 * Mutable ship input intents, written by control hooks (keyboard, touch) and
 * read by the physics step. Rotation for aiming (yaw/pitch via RCS couples),
 * translation for maneuvering (thrust, reverse, lateral strafe).
 * Values normalized: thrust/reverse 0..1; yaw/pitch/strafeX -1..1
 * (yaw + = nose left, pitch + = nose up, strafeX + = right).
 */
export interface ShipInput {
  thrust: number
  reverse: number
  strafeX: number
  yaw: number
  pitch: number
  boost: boolean
}

export const shipInput: ShipInput = {
  thrust: 0,
  reverse: 0,
  strafeX: 0,
  yaw: 0,
  pitch: 0,
  boost: false,
}
