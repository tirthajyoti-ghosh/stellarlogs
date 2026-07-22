import { Vector3 } from 'three'

/**
 * Brachistochrone jump drive — no FTL in this universe. Commit to a
 * destination and the flight computer flies the honest profile: align the
 * nose, hard continuous BURN to the midpoint, cut thrust and FLIP
 * end-over-end, then burn retro all the way down — arriving at rest,
 * tail-first, the way physics says you must. The HUD gets the franchise's
 * most iconic readout: TIME TO FLIP.
 */

export type WarpPhase = 'idle' | 'align' | 'burn' | 'flip' | 'brake' | 'turnback'

const FLIP_SECONDS = 1.35

interface WarpState {
  phase: WarpPhase
  target: Vector3
  /** Point we actually stop at (offset from the system core) */
  arrival: Vector3
  /** Unit travel direction, fixed at burn start */
  dir: Vector3
  /** Time inside the current powered/coast phase */
  t: number
  /** Duration of each powered leg (burn == brake) */
  legT: number
  accel: number
  peakSpeed: number
}

export const warp: WarpState = {
  phase: 'idle',
  target: new Vector3(),
  arrival: new Vector3(),
  dir: new Vector3(),
  t: 0,
  legT: 0,
  accel: 0,
  peakSpeed: 0,
}

/** Remaining auto-rotation, radians — drives the RCS thruster visuals. */
export const warpTurn = { yaw: 0, pitch: 0 }

/** Seconds until the flip (during burn), NaN otherwise — for the HUD. */
export function timeToFlip(): number {
  return warp.phase === 'burn' ? Math.max(0, warp.legT - warp.t) : NaN
}

/** Seconds until arrival (during brake), NaN otherwise — for the HUD. */
export function timeToArrival(): number {
  return warp.phase === 'brake' ? Math.max(0, warp.legT - warp.t) : NaN
}

/** The main drive is lit (plume + rumble). */
export function warpBurning(): boolean {
  return warp.phase === 'burn' || warp.phase === 'brake'
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
  warp.t = 0
}

export function cancelWarp(): void {
  warp.phase = 'idle'
  warpTurn.yaw = 0
  warpTurn.pitch = 0
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

/** Slew attitude toward a target at a capped rate with a smooth settle. */
function slewTo(state: WarpableShip, yawTarget: number, pitchTarget: number, rate: number, dt: number): boolean {
  const dy = wrapAngle(yawTarget - state.yaw)
  const dp = wrapAngle(pitchTarget - state.pitch)
  warpTurn.yaw = dy
  warpTurn.pitch = dp
  state.yaw += Math.sign(dy) * Math.min(Math.abs(dy) * 3 * dt, rate * dt)
  state.pitch += Math.sign(dp) * Math.min(Math.abs(dp) * 3 * dt, rate * dt)
  return Math.abs(dy) < 0.04 && Math.abs(dp) < 0.04
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
    // Deliberate RCS turn onto the outbound vector, bleeding residual drift
    const settled = slewTo(
      state,
      Math.atan2(-_dir.x, -_dir.z),
      Math.asin(Math.max(-1, Math.min(1, _dir.y))),
      1.15,
      dt,
    )
    state.velocity.multiplyScalar(Math.exp(-2.5 * dt))
    state.speed = state.velocity.length()
    state.position.addScaledVector(state.velocity, dt)
    if (settled) {
      warpTurn.yaw = 0
      warpTurn.pitch = 0
      // Plot the profile: equal powered legs around a fixed-length flip coast
      warp.dir.copy(_dir)
      const T = Math.min(11, Math.max(6, 4 + dist / 2200))
      warp.legT = (T - FLIP_SECONDS) / 2
      warp.accel = dist / (warp.legT * warp.legT + warp.legT * FLIP_SECONDS)
      warp.peakSpeed = warp.accel * warp.legT
      warp.t = 0
      warp.phase = 'burn'
    }
    return
  }

  if (warp.phase === 'burn') {
    warp.t += dt
    state.speed = Math.min(warp.peakSpeed, warp.accel * warp.t)
    state.position.addScaledVector(warp.dir, state.speed * dt)
    if (warp.t >= warp.legT) {
      warp.t = 0
      warp.phase = 'flip'
    }
    return
  }

  if (warp.phase === 'flip') {
    // Thrust cut: coast at peak speed while the hull swings end-over-end
    warp.t += dt
    state.speed = warp.peakSpeed
    state.position.addScaledVector(warp.dir, state.speed * dt)
    const settled = slewTo(
      state,
      Math.atan2(warp.dir.x, warp.dir.z),
      Math.asin(Math.max(-1, Math.min(1, -warp.dir.y))),
      Math.PI / FLIP_SECONDS + 0.6,
      dt,
    )
    if (settled && warp.t >= FLIP_SECONDS * 0.7) {
      warpTurn.yaw = 0
      warpTurn.pitch = 0
      warp.t = 0
      warp.phase = 'brake'
    }
    return
  }

  if (warp.phase === 'brake') {
    // retro burn all the way down to rest
    warp.t += dt
    state.speed = Math.max(0, warp.peakSpeed - warp.accel * warp.t)
    state.position.addScaledVector(warp.dir, state.speed * dt)
    if (state.speed <= 2 || dist < 30) {
      state.velocity.set(0, 0, 0)
      state.speed = 0
      warp.t = 0
      warp.phase = 'turnback'
    }
    return
  }

  // turnback: at rest, come about — nose swings from retrograde back onto
  // the destination so the pilot is handed the ship pointed the right way
  state.speed = 0
  const settled = slewTo(
    state,
    Math.atan2(-warp.dir.x, -warp.dir.z),
    Math.asin(Math.max(-1, Math.min(1, warp.dir.y))),
    2.4,
    dt,
  )
  if (settled) {
    warpTurn.yaw = 0
    warpTurn.pitch = 0
    warp.phase = 'idle'
  }
}
