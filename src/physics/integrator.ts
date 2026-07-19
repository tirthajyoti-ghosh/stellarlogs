import { Euler, Quaternion, Vector3 } from 'three'
import type { ShipInput } from './shipInput'
import { applyGravity, resolveCollisions } from './gravity'

const SHIP_RADIUS = 3

export const FIXED_DT = 1 / 120

// Flight tuning — the feel of the whole game lives in these numbers.
const THRUST_ACCEL = 70
const BRAKE_ACCEL = 55
const MAX_SPEED = 90
const BOOST_MAX_SPEED = 240
const BOOST_ACCEL_MULT = 3.2
const LINEAR_DAMPING = 0.35 // s^-1, exponential velocity decay
const YAW_SPEED = 1.7 // rad/s at full input
const PITCH_SPEED = 1.15
const PITCH_LIMIT = 1.25 // rad, keeps the horizon findable
const PITCH_AUTOLEVEL = 0.12 // s^-1, gentle pull of the nose back to level
const BOOST_DRAIN = 1 / 1.4 // full charge lasts 1.4s
const BOOST_RECHARGE = 1 / 2.5
const BOOST_MIN_CHARGE = 0.15 // needed to (re)ignite boost

export interface ShipState {
  position: Vector3
  prevPosition: Vector3
  velocity: Vector3
  yaw: number
  pitch: number
  prevYaw: number
  prevPitch: number
  /** Smoothed yaw rate, drives visual banking. */
  yawRateSmooth: number
  pitchRateSmooth: number
  boostCharge: number
  boosting: boolean
  thrusting: boolean
  speed: number
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
    yawRateSmooth: 0,
    pitchRateSmooth: 0,
    boostCharge: 1,
    boosting: false,
    thrusting: false,
    speed: 0,
  }
}

const _euler = new Euler()
const _quat = new Quaternion()
const _forward = new Vector3()

export function shipQuaternion(yaw: number, pitch: number, out: Quaternion): Quaternion {
  _euler.set(pitch, yaw, 0, 'YXZ')
  return out.setFromEuler(_euler)
}

function substep(state: ShipState, input: ShipInput, dt: number): void {
  // Orientation (kinematic, damped velocity handles the "Newtonian" drift)
  const yawRate = input.yaw * YAW_SPEED
  const pitchRate = input.pitch * PITCH_SPEED
  state.yaw += yawRate * dt
  state.pitch += pitchRate * dt
  state.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, state.pitch))
  if (input.pitch === 0) state.pitch *= Math.exp(-PITCH_AUTOLEVEL * dt)

  // Smoothed rates for the camera/banking (visual only)
  const smoothing = 1 - Math.exp(-8 * dt)
  state.yawRateSmooth += (yawRate - state.yawRateSmooth) * smoothing
  state.pitchRateSmooth += (pitchRate - state.pitchRateSmooth) * smoothing

  // Boost state machine with hysteresis so it doesn't stutter near empty
  if (input.boost && (state.boosting ? state.boostCharge > 0 : state.boostCharge > BOOST_MIN_CHARGE)) {
    state.boosting = true
    state.boostCharge = Math.max(0, state.boostCharge - BOOST_DRAIN * dt)
  } else {
    state.boosting = false
    state.boostCharge = Math.min(1, state.boostCharge + BOOST_RECHARGE * dt)
  }

  // Thrust along the nose
  shipQuaternion(state.yaw, state.pitch, _quat)
  _forward.set(0, 0, -1).applyQuaternion(_quat)
  const accel = THRUST_ACCEL * (state.boosting ? BOOST_ACCEL_MULT : 1)
  state.thrusting = input.thrust > 0
  if (input.thrust > 0) {
    state.velocity.addScaledVector(_forward, input.thrust * accel * dt)
  }
  if (input.brake > 0) {
    const v = state.velocity.length()
    if (v > 0.001) {
      const drop = Math.min(input.brake * BRAKE_ACCEL * dt, v)
      state.velocity.multiplyScalar((v - drop) / v)
    }
  }

  applyGravity(state.position, state.velocity, dt)

  // Damping + soft speed cap
  state.velocity.multiplyScalar(Math.exp(-LINEAR_DAMPING * dt))
  const maxSpeed = state.boosting ? BOOST_MAX_SPEED : MAX_SPEED
  const speed = state.velocity.length()
  if (speed > maxSpeed) {
    const over = 1 - Math.min(1, 4 * dt) * (1 - maxSpeed / speed)
    state.velocity.multiplyScalar(over)
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
