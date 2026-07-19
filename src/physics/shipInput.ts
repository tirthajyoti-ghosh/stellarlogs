/**
 * Mutable ship input intents, written by control hooks (keyboard, pointer,
 * touch) and read by the physics step. Values are normalized:
 * thrust/brake 0..1, yaw/pitch -1..1 (yaw + = turn left, pitch + = nose up).
 */
export interface ShipInput {
  thrust: number
  brake: number
  yaw: number
  pitch: number
  boost: boolean
}

export const shipInput: ShipInput = {
  thrust: 0,
  brake: 0,
  yaw: 0,
  pitch: 0,
  boost: false,
}
