import { Vector3 } from 'three'

/**
 * Everspace-style jump drive. A tiny state machine driven from the ship's
 * physics step: align the nose, punch it, arrive with zero velocity.
 */

export type WarpPhase = 'idle' | 'align' | 'jump'

interface WarpState {
  phase: WarpPhase
  target: Vector3
  /** Point we actually stop at (offset from the system core) */
  arrival: Vector3
  progress: number
  jumpDistance: number
}

export const warp: WarpState = {
  phase: 'idle',
  target: new Vector3(),
  arrival: new Vector3(),
  progress: 0,
  jumpDistance: 0,
}

const _dir = new Vector3()

/** Begin a jump toward a destination (system core or station). */
export function startWarp(destination: Vector3, shipPosition: Vector3, standoff: number): void {
  if (warp.phase !== 'idle') return
  warp.target.copy(destination)
  _dir.copy(shipPosition).sub(destination)
  const dist = _dir.length()
  if (dist < standoff * 1.2) return // already there
  warp.arrival.copy(destination).addScaledVector(_dir.normalize(), standoff)
  warp.phase = 'align'
  warp.progress = 0
  warp.jumpDistance = 0
}

export function cancelWarp(): void {
  warp.phase = 'idle'
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

interface WarpableShip {
  position: Vector3
  prevPosition: Vector3
  velocity: Vector3
  yaw: number
  pitch: number
  prevYaw: number
  prevPitch: number
  speed: number
}

/** Drive the ship through a warp frame. Replaces the normal physics step. */
export function stepWarp(state: WarpableShip, dt: number): void {
  state.prevPosition.copy(state.position)
  state.prevYaw = state.yaw
  state.prevPitch = state.pitch

  _dir.copy(warp.arrival).sub(state.position)
  const dist = _dir.length()
  _dir.normalize()

  if (warp.phase === 'align') {
    const yawTarget = Math.atan2(-_dir.x, -_dir.z)
    const pitchTarget = Math.asin(Math.max(-1, Math.min(1, _dir.y)))
    const dy = wrapAngle(yawTarget - state.yaw)
    const dp = pitchTarget - state.pitch
    const k = 1 - Math.exp(-3.5 * dt)
    state.yaw += dy * k
    state.pitch += dp * k
    state.velocity.multiplyScalar(Math.exp(-2.5 * dt))
    state.speed = state.velocity.length()
    state.position.addScaledVector(state.velocity, dt)
    if (Math.abs(dy) < 0.04 && Math.abs(dp) < 0.04) warp.phase = 'jump'
    return
  }

  // jump: speed scales with remaining distance — fast ramp, smooth arrival
  const speed = Math.max(600, Math.min(26000, dist * 1.6))
  const step = Math.min(dist, speed * dt)
  state.position.addScaledVector(_dir, step)
  state.speed = speed
  if (dist - step < 50) {
    warp.phase = 'idle'
    state.velocity.set(0, 0, 0)
    state.speed = 0
  }
}
