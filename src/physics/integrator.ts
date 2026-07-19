import { Euler, Quaternion, Vector3 } from 'three'
import type { ShipInput } from './shipInput'
import { applyGravity, resolveCollisions } from './gravity'
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
  /** Smoothed yaw rate, drives visual banking. */
  yawRateSmooth: number
  pitchRateSmooth: number
  boostCharge: number
  boosting: boolean
  /** True after running dry — boost can't re-ignite until recharged enough. */
  boostDepleted: boolean
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
    yawRateSmooth: 0,
    pitchRateSmooth: 0,
    boostCharge: 1,
    boosting: false,
    boostDepleted: false,
    thrusting: false,
    speed: 0,
    speedCeiling: FLIGHT.maxSpeed,
  }
}

const _euler = new Euler()
const _quat = new Quaternion()
const _forward = new Vector3()

export function shipQuaternion(yaw: number, pitch: number, out: Quaternion): Quaternion {
  _euler.set(pitch, yaw, 0, 'YXZ')
  return out.setFromEuler(_euler)
}

function updateBoost(state: ShipState, input: ShipInput, dt: number): void {
  if (state.boostCharge <= 0) state.boostDepleted = true
  if (state.boostDepleted && state.boostCharge >= FLIGHT.boostReigniteCharge) {
    state.boostDepleted = false
  }
  const canIgnite = !state.boostDepleted && state.boostCharge > FLIGHT.boostMinCharge
  if (input.boost && (state.boosting ? state.boostCharge > 0 : canIgnite)) {
    state.boosting = true
    state.boostCharge = Math.max(0, state.boostCharge - dt / FLIGHT.boostDuration)
  } else {
    state.boosting = false
    state.boostCharge = Math.min(1, state.boostCharge + dt / FLIGHT.boostRechargeTime)
  }
}

function substep(state: ShipState, input: ShipInput, dt: number): void {
  // Orientation (kinematic; the damped velocity handles the Newtonian drift)
  const yawRate = input.yaw * FLIGHT.yawSpeed
  const pitchRate = input.pitch * FLIGHT.pitchSpeed
  state.yaw += yawRate * dt
  state.pitch += pitchRate * dt
  state.pitch = Math.max(-FLIGHT.pitchLimit, Math.min(FLIGHT.pitchLimit, state.pitch))
  if (input.pitch === 0) state.pitch *= Math.exp(-FLIGHT.pitchAutolevel * dt)

  // Smoothed rates for the camera/banking (visual only)
  const smoothing = 1 - Math.exp(-8 * dt)
  state.yawRateSmooth += (yawRate - state.yawRateSmooth) * smoothing
  state.pitchRateSmooth += (pitchRate - state.pitchRateSmooth) * smoothing

  updateBoost(state, input, dt)

  // Thrust along the nose
  shipQuaternion(state.yaw, state.pitch, _quat)
  _forward.set(0, 0, -1).applyQuaternion(_quat)
  const accel = FLIGHT.thrustAccel * (state.boosting ? FLIGHT.boostAccelMult : 1)
  state.thrusting = input.thrust > 0
  if (input.thrust > 0) {
    state.velocity.addScaledVector(_forward, input.thrust * accel * dt)
  }
  if (input.brake > 0) {
    const v = state.velocity.length()
    if (v > 0.001) {
      const drop = Math.min(input.brake * FLIGHT.brakeAccel * dt, v)
      state.velocity.multiplyScalar((v - drop) / v)
    }
  }

  applyGravity(state.position, state.velocity, dt)

  state.velocity.multiplyScalar(Math.exp(-FLIGHT.linearDamping * dt))
  const targetCeiling = state.boosting ? FLIGHT.boostMaxSpeed : FLIGHT.maxSpeed
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
