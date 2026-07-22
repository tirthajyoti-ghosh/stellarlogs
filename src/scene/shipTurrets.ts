import { MathUtils, Object3D, Quaternion, Vector3 } from 'three'
import { turretControl } from '../state/turretControl'

/**
 * The Roci's six PDC ball turrets. The build script (scripts/build-tachi.mjs)
 * outputs pivot nodes `pdc_1..pdc_6` at the ball-mount centers, each with a
 * `pdc_N_ball` child (movable gun assembly) and `pdc_N_barrels` grandchild
 * (Gatling cluster), plus `extras.restDir` — the parked barrel axis in model
 * space. Here we discover those rigs and drive them: acquire the nearest
 * target inside each turret's arc + range, slew the ball with a rate limit,
 * spin the barrels while firing, and report muzzles/locks/motion back through
 * turretControl.
 */

const SLEW_RATE = 2.6 // rad/s — CIWS-fast but visibly mechanical
const ARC_HALF = MathUtils.degToRad(75) // cone half-angle around each arc axis
const RANGE = 300 // world units
const MUZZLE_LEN = 34 // raw model units from pivot to muzzle tip
const SPIN_UP = 3.2 // 1/s barrel spin-up rate
const SPIN_DOWN = 1.4
const HEAT_TIME = 6 // seconds of sustained fire to overheat (when enabled)
const COOL_TIME = 3.5 // seconds from full heat back to cold
const OVERHEAT_CLEAR = 0.35 // hysteresis: lockout ends once cooled to here

interface TurretRig {
  pivot: Object3D
  ball: Object3D
  barrels: Object3D
  /** Parked barrel axis, pivot-local (= model space) */
  restDir: Vector3
  /** Arc cone axis, pivot-local — where this mount can cover */
  arcDir: Vector3
  spinAngle: number
  targetIndex: number
  heat: number
  overheated: boolean
}

let rigs: TurretRig[] = []

const _dirLocal = new Vector3()
const _pivotWorld = new Vector3()
const _desired = new Quaternion()
const _prev = new Quaternion()
const _muzzleLocal = new Vector3()
const _aimWorld = new Vector3()
/** Fire-control scratch: how many mounts are already on each target */
const _assignCounts = new Uint8Array(32)

/** Call once after the ship GLB mounts. Safe to call again (re-discovers). */
export function discoverTurrets(model: Object3D): void {
  rigs = []
  for (let i = 1; i <= 6; i++) {
    const pivot = model.getObjectByName(`pdc_${i}`)
    const ball = model.getObjectByName(`pdc_${i}_ball`)
    const barrels = model.getObjectByName(`pdc_${i}_barrels`)
    const restArr = pivot?.userData?.restDir as number[] | undefined
    if (!pivot || !ball || !barrels || !restArr) continue
    const restDir = new Vector3(...restArr).normalize()
    // Arc axis: away from the hull centerline (model long axis = Z), blended
    // with the parked direction so bow mounts cover the forward arc.
    const p = pivot.position
    const outward = new Vector3(p.x, p.y, 0)
    if (outward.lengthSq() < 1) outward.set(0, 1, 0)
    outward.normalize()
    const arcDir = outward.add(restDir).normalize()
    rigs.push({
      pivot,
      ball,
      barrels,
      restDir,
      arcDir,
      spinAngle: 0,
      targetIndex: -1,
      heat: 0,
      overheated: false,
    })
  }
  turretControl.muzzles = rigs.map(() => ({
    position: new Vector3(),
    direction: new Vector3(),
    targetIndex: -1,
    heat: 0,
    overheated: false,
  }))
}

export function turretCount(): number {
  return rigs.length
}

/** Per-frame turret drive. Call from the ship's frame loop after physics. */
export function updateTurrets(dt: number): void {
  const targets = turretControl.targets
  let locks = 0
  let traverse = 0
  _assignCounts.fill(0, 0, Math.min(targets.length, _assignCounts.length))

  for (let i = 0; i < rigs.length; i++) {
    const rig = rigs[i]
    rig.pivot.getWorldPosition(_pivotWorld)

    // Fire control (TEWA): each mount takes the LEAST-COVERED valid threat,
    // nearest first among equals — spreading six guns across the raid
    // instead of piling every barrel on whichever torpedo leads the pack.
    // An overheated mount is out of the fight until it cools.
    rig.targetIndex = -1
    if (!rig.overheated) {
      let bestScore = Infinity
      for (let t = 0; t < targets.length; t++) {
        const d = targets[t].position.distanceTo(_pivotWorld)
        if (d >= RANGE) continue
        _dirLocal.copy(targets[t].position)
        rig.pivot.worldToLocal(_dirLocal).normalize()
        if (_dirLocal.angleTo(rig.arcDir) > ARC_HALF) continue
        // load dominates, distance tiebreaks: an unengaged threat far out
        // beats a double-covered one at the muzzle
        const score = _assignCounts[t] * RANGE + d
        if (score < bestScore) {
          bestScore = score
          rig.targetIndex = t
        }
      }
      if (rig.targetIndex >= 0) _assignCounts[rig.targetIndex]++
    }

    // Desired ball orientation: rotate the parked axis onto the target dir
    if (rig.targetIndex >= 0) {
      locks++
      _dirLocal.copy(targets[rig.targetIndex].position)
      rig.pivot.worldToLocal(_dirLocal).normalize()
      _desired.setFromUnitVectors(rig.restDir, _dirLocal)
    } else {
      _desired.identity() // ease back to parked
    }

    // Rate-limited slew toward the desired orientation
    _prev.copy(rig.ball.quaternion)
    const angle = rig.ball.quaternion.angleTo(_desired)
    if (angle > 1e-4) {
      const step = Math.min(1, (SLEW_RATE * dt) / angle)
      rig.ball.quaternion.slerp(_desired, step)
      traverse += Math.min(angle, SLEW_RATE * dt) / Math.max(dt, 1e-4)
    }

    // Thermal model: sustained fire cooks the mount; it locks out at full
    // heat and rejoins once cooled past the hysteresis point
    const firingThis =
      turretControl.heatEnabled &&
      turretControl.firing &&
      rig.targetIndex >= 0 &&
      turretControl.spin > 0.85
    if (firingThis) {
      rig.heat = Math.min(1, rig.heat + dt / HEAT_TIME)
      if (rig.heat >= 1) rig.overheated = true
    } else {
      rig.heat = Math.max(0, rig.heat - dt / COOL_TIME)
      if (rig.overheated && rig.heat <= OVERHEAT_CLEAR) rig.overheated = false
    }
    if (!turretControl.heatEnabled && rig.heat === 0) rig.overheated = false

    // Muzzle world transform for tracers
    const muzzle = turretControl.muzzles[i]
    if (muzzle) {
      _muzzleLocal.copy(rig.restDir).multiplyScalar(MUZZLE_LEN)
      muzzle.position.copy(_muzzleLocal)
      rig.ball.localToWorld(muzzle.position)
      _aimWorld.copy(rig.restDir).applyQuaternion(rig.ball.getWorldQuaternion(_desired))
      muzzle.direction.copy(_aimWorld).normalize()
      muzzle.targetIndex = rig.targetIndex
      muzzle.heat = rig.heat
      muzzle.overheated = rig.overheated
    }
  }

  // Barrel spin: up while firing with locks, down otherwise
  const wantSpin = turretControl.firing && locks > 0 ? 1 : 0
  turretControl.spin = MathUtils.clamp(
    turretControl.spin + (wantSpin > turretControl.spin ? SPIN_UP : -SPIN_DOWN) * dt,
    0,
    1,
  )
  const spinSpeed = turretControl.spin * 40 // rad/s at full spin
  for (const rig of rigs) {
    rig.spinAngle += spinSpeed * dt
    rig.barrels.quaternion.setFromAxisAngle(rig.restDir, rig.spinAngle)
  }

  turretControl.locks = locks
  turretControl.traverseSpeed = traverse
}

/** Dev helper: world point all turrets should try to track (null = stand down). */
export function devAimAt(point: Vector3 | null): void {
  turretControl.targets = point ? [{ position: point }] : []
}

const _arcWorld = new Vector3()
export interface TurretArc {
  /** World-space horizontal direction of the arc axis */
  dx: number
  dz: number
  engaged: boolean
}
const _arcs: TurretArc[] = []

/** World-space horizontal turret coverage, for the battle radar's arc wedges. */
export function turretArcsWorld(): TurretArc[] {
  _arcs.length = 0
  for (const rig of rigs) {
    _arcWorld.copy(rig.arcDir).transformDirection(rig.pivot.matrixWorld)
    _arcs.push({ dx: _arcWorld.x, dz: _arcWorld.z, engaged: rig.targetIndex >= 0 })
  }
  return _arcs
}
