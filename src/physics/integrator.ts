import { Euler, Quaternion, Vector3 } from 'three'
import type { ShipInput } from './shipInput'
import { applyGravity, resolveCollisions } from './gravity'
import { flightAssist } from './flightAssist'
import { FLIGHT } from '../config/flight'

export const FIXED_DT = 1 / 120
const SHIP_RADIUS = 3

export interface ShipState {
  position: Vector3
  prevPosition: Vector3
  velocity: Vector3
  yaw: number
  pitch: number
  prevYaw: number
  prevPitch: number
  boostCharge: number
  boosting: boolean
  thrusting: boolean
  speed: number
  /**
   * Current hard speed limit. Jumps up instantly when boost ignites, decays
   * smoothly back to maxSpeed when it ends — firm caps without braking jolts.
   */
  speedCeiling: number
}

export function createShipState(spawn: Vector3, yaw = 0): ShipState {
  return {
    position: spawn.clone(),
    prevPosition: spawn.clone(),
    velocity: new Vector3(),
    yaw,
    pitch: 0,
    prevYaw: yaw,
    prevPitch: 0,
    boostCharge: 1,
    boosting: false,
    thrusting: false,
    speed: 0,
    speedCeiling: FLIGHT.maxSpeed,
  }
}

const _euler = new Euler()
const _quat = new Quaternion()
const _forward = new Vector3()
const _right = new Vector3()
const _up = new Vector3()

export function shipQuaternion(yaw: number, pitch: number, out: Quaternion): Quaternion {
  _euler.set(pitch, yaw, 0, 'YXZ')
  return out.setFromEuler(_euler)
}

function substep(state: ShipState, input: ShipInput, dt: number): void {
  // Attitude via RCS couples: yaw and pitch rotate the hull (no banking).
  // No limits, no auto-level: the ship holds whatever attitude it's left in.
  state.yaw += input.yaw * FLIGHT.yawSpeed * dt
  state.pitch += input.pitch * FLIGHT.pitchSpeed * dt

  // Boost is a drive mode: active exactly while held, never a dip
  state.boosting = input.boost
  state.boostCharge = 1

  shipQuaternion(state.yaw, state.pitch, _quat)
  _forward.set(0, 0, -1).applyQuaternion(_quat)
  _right.set(1, 0, 0).applyQuaternion(_quat)
  _up.set(0, 1, 0).applyQuaternion(_quat)

  const accel = FLIGHT.thrustAccel * (state.boosting ? FLIGHT.boostAccelMult : 1)
  state.thrusting = input.thrust > 0
  if (input.thrust > 0) state.velocity.addScaledVector(_forward, input.thrust * accel * dt)
  // RCS translation: reverse burn and lateral/vertical strafes
  if (input.reverse > 0)
    state.velocity.addScaledVector(_forward, -input.reverse * FLIGHT.rcsAccel * dt)
  if (input.strafeX !== 0)
    state.velocity.addScaledVector(_right, input.strafeX * FLIGHT.rcsAccel * dt)

  applyGravity(state.position, state.velocity, dt)

  // FLIGHT ASSIST: the computer retro-burns residual velocity toward zero.
  // With assist off (drive-dark) nothing decays — speed is conserved and
  // only gravity, RCS, and collisions change it.
  if (flightAssist.enabled) {
    state.velocity.multiplyScalar(Math.exp(-FLIGHT.linearDamping * dt))
  }
  const targetCeiling = !flightAssist.enabled
    ? FLIGHT.assistOffMaxSpeed
    : state.boosting
      ? FLIGHT.boostMaxSpeed
      : FLIGHT.maxSpeed
  if (targetCeiling >= state.speedCeiling) {
    state.speedCeiling = targetCeiling // ignition: limit rises instantly
  } else {
    // boost ended: ceiling glides down, excess speed bleeds off jolt-free
    state.speedCeiling =
      targetCeiling + (state.speedCeiling - targetCeiling) * Math.exp(-FLIGHT.overspeedBleed * dt)
  }
  const speed = state.velocity.length()
  if (speed > state.speedCeiling) {
    state.velocity.multiplyScalar(state.speedCeiling / speed)
  }
  state.speed = state.velocity.length()

  state.position.addScaledVector(state.velocity, dt)
  resolveCollisions(state.position, state.velocity, SHIP_RADIUS)
}

let accumulator = 0

/**
 * Advance the simulation by `frameDt` using fixed substeps.
 * Returns the interpolation alpha (0..1) between prev and current state.
 */
export function stepShip(state: ShipState, input: ShipInput, frameDt: number): number {
  accumulator += Math.min(frameDt, 0.1) // clamp long frames (tab switch)
  while (accumulator >= FIXED_DT) {
    state.prevPosition.copy(state.position)
    state.prevYaw = state.yaw
    state.prevPitch = state.pitch
    substep(state, input, FIXED_DT)
    accumulator -= FIXED_DT
  }
  return accumulator / FIXED_DT
}
