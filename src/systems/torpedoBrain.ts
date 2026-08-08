import { Vector3 } from 'three'

/**
 * The torpedo brain — one guidance intelligence shared by every activity
 * that flies ordnance (the cert range, the Amnia lanes, and whatever hunts
 * later). Before this, every torpedo in the game flew PURE PURSUIT: point
 * at where the target IS, every frame, at constant speed, with a cosmetic
 * sine wobble. That is why they read as dumb — a tail-chase never
 * anticipates, never reacts, never coordinates.
 *
 * What flies now, phase by phase:
 *
 *   BOOST      — a short hard burn straight off the rail. The drive flare
 *                is the launch tell.
 *   MIDCOURSE  — lead-pursuit intercept: aim where the target WILL be
 *                (time-to-go × target velocity, flown at the class's
 *                solution quality). Burn continuously toward vmax — far
 *                launches arrive HOT, the way an Epstein torpedo would.
 *                An optional DOGLEG waypoint bends the approach so a salvo
 *                launched from one bearing arrives from many.
 *   TERMINAL   — solution gain rises and the CORKSCREW arms: a helix
 *                around the intercept line, radius ramping in and then
 *                spiralling down with time-to-go so the miss distance
 *                still converges to zero. This is the show's anti-PDC
 *                maneuver, and the anti-PDC math is real: sustained
 *                unpredictable lateral motion collapses a converged
 *                fire solution's hit rate against a static shooter.
 *   JUKE       — the duel. The activity reports near misses from the
 *                player's own fire; two inside half a second and a smart
 *                torpedo snaps sideways, then must re-converge. You watch
 *                your stream walk on, the torpedo flinch, the stream walk
 *                back.
 *
 * Class parameters, not code, make the ladder: JUNK flies the old pure
 * pursuit (lead 0, no cork) as the deliberate bottom rung; SURPLUS leads
 * and weaves; MIL-SPEC does everything above. Activities own their class
 * tables (each in its own speed regime); this module owns only the math.
 */

export interface TorpClass {
  /** 0..1 — fraction of the intercept lead flown. 0 = the old tail-chase. */
  lead: number
  /** continuous burn, u/s² */
  accel: number
  /** speed off the rail */
  v0: number
  vmax: number
  /** steering authority (velocity-turn budget = turn × speed per second) */
  turn: number
  /** terminal helix radius in units; 0 disables the corkscrew */
  corkRadius: number
  /** helix angular rate, rad/s */
  corkSpin: number
  /** reacts to near misses from the player's fire */
  jukes: boolean
  /** DARK RUNNER: range to target at which the drive cuts (undefined = never) */
  darkAt?: number
  /** range at which a dark runner relights for terminal */
  relightAt?: number
  /** BURN BUDGET, seconds: a torpedo carries no crew — it burns at Gs that
   *  would kill, but not forever. Past this the drive is spent: ballistic
   *  coast at whatever speed it built, steering authority cut to fins
   *  (×0.3). A dark coast doesn't spend the clock — the drive is off.
   *  undefined = the old infinite burn. */
  burnFor?: number
}

export interface TorpBrain {
  cls: TorpClass
  speed: number
  boostLeft: number
  terminal: boolean
  corkAngle: number
  corkDir: number
  corkRamp: number
  jukeLeft: number
  jukeCooldown: number
  /** evasion is finite: after this many flinches the torpedo commits —
   *  bounds the one-torpedo-dances-for-20-seconds tail measured on the
   *  parked harness */
  jukesLeft: number
  jukeDir: Vector3
  /** drive cut: ballistic coast, no burn, no steering, no track */
  dark: boolean
  /** a runner goes dark only once per flight */
  wentDark: boolean
  /** seconds of powered flight spent (dark coast excluded) */
  age: number
  nearMisses: number
  nearWindow: number
  dogleg: Vector3
  hasDogleg: boolean
}

/** time-to-go under which the terminal phase (gain + corkscrew) arms */
const TERMINAL_TGO = 3.2
/** The corkscrew spirals IN: radius scales down with tgo below this.
 *  Tuned on the parked harness 2026-08-05: at 1.4 s every torpedo flew
 *  STRAIGHT for its last 370 units — a clean window converged guns never
 *  missed (twelve mil-specs, zero leaks). At 0.55 s the helix holds until
 *  the round-flight math genuinely degrades, and the shrink that remains
 *  still guarantees the hit itself (radius < hull radius well before
 *  impact). */
const CORK_CONVERGE_TGO = 0.55
const CORK_RAMP_S = 0.7
/** terminal steering-gain multiplier */
const TERMINAL_GAIN = 1.6
const DOGLEG_CLEAR = 150
const JUKE_TIME = 0.35
const JUKE_COOLDOWN = 1.9
/** how far sideways the aim point is thrown during a juke */
const JUKE_OFFSET = 60
const NEAR_MISS_WINDOW = 0.5

const _R = new Vector3()
const _rel = new Vector3()
const _aim = new Vector3()
const _des = new Vector3()
const _p1 = new Vector3()
const _p2 = new Vector3()
const _up = new Vector3(0, 1, 0)

export function createBrain(): TorpBrain {
  return {
    cls: { lead: 0, accel: 0, v0: 50, vmax: 50, turn: 1, corkRadius: 0, corkSpin: 0, jukes: false },
    speed: 50,
    boostLeft: 0,
    terminal: false,
    corkAngle: 0,
    corkDir: 1,
    corkRamp: 0,
    jukeLeft: 0,
    jukeCooldown: 0,
    jukesLeft: 0,
    jukeDir: new Vector3(),
    dark: false,
    wentDark: false,
    age: 0,
    nearMisses: 0,
    nearWindow: 0,
    dogleg: new Vector3(),
    hasDogleg: false,
  }
}

/** Re-arm a pooled brain at launch. */
export function armBrain(
  brain: TorpBrain,
  cls: TorpClass,
  opts?: { boost?: number; dogleg?: Vector3 | null; corkPhase?: number },
): void {
  brain.cls = cls
  brain.speed = cls.v0
  brain.boostLeft = opts?.boost ?? 0.7
  brain.terminal = false
  brain.corkAngle = opts?.corkPhase ?? Math.random() * Math.PI * 2
  brain.corkDir = Math.random() < 0.5 ? -1 : 1
  brain.corkRamp = 0
  brain.jukeLeft = 0
  brain.jukeCooldown = 0
  brain.jukesLeft = 3
  brain.dark = false
  brain.wentDark = false
  brain.age = 0
  brain.nearMisses = 0
  brain.nearWindow = 0
  if (opts?.dogleg) {
    brain.dogleg.copy(opts.dogleg)
    brain.hasDogleg = true
  } else {
    brain.hasDogleg = false
  }
}

/**
 * One steering step. Mutates `vel` (and the brain); the caller integrates
 * position. Target velocity is world-frame.
 */
export function steerTorpedo(
  brain: TorpBrain,
  pos: Vector3,
  vel: Vector3,
  targetPos: Vector3,
  targetVel: Vector3,
  dt: number,
): void {
  const cls = brain.cls
  _R.copy(targetPos).sub(pos)
  const r = Math.max(_R.length(), 1e-6)

  // DARK RUNNER: between darkAt and relight the drive is CUT — pure
  // ballistic coast, no burn, no steering, and (the activity's half) no
  // track for the guns or the scope. THE HUNT's signature ordnance.
  if (brain.dark) {
    if (r < (cls.relightAt ?? 420)) brain.dark = false
    else return
  } else if (cls.darkAt !== undefined && !brain.wentDark && brain.boostLeft <= 0 && r < cls.darkAt) {
    brain.dark = true
    brain.wentDark = true
    return
  }

  // the burn budget: powered flight spends it; a dark coast does not
  brain.age += dt
  const spent = cls.burnFor !== undefined && brain.age > cls.burnFor
  if (!spent) brain.speed = Math.min(cls.vmax, brain.speed + cls.accel * dt)

  // BOOST: hold the rail bearing, just burn
  if (brain.boostLeft > 0) {
    brain.boostLeft -= dt
    vel.setLength(brain.speed)
    return
  }

  _rel.copy(vel).sub(targetVel)
  // closing speed along the line of sight; floored so tgo stays sane when
  // geometry momentarily opens (a juking torpedo can point away briefly)
  const closing = Math.max(_rel.dot(_R) / r, 0.3 * brain.speed)
  const tgo = r / closing
  if (tgo < TERMINAL_TGO) brain.terminal = true

  // the intercept solution, flown at class quality
  _aim.copy(targetVel).multiplyScalar(tgo * cls.lead).add(targetPos)

  // dogleg: bend the midcourse so the salvo fans; cleared on arrival or terminal
  if (brain.hasDogleg && !brain.terminal) {
    if (pos.distanceTo(brain.dogleg) < DOGLEG_CLEAR) brain.hasDogleg = false
    else _aim.copy(brain.dogleg)
  }

  // terminal corkscrew: a helix around the intercept line that spirals in
  if (brain.terminal && cls.corkRadius > 0) {
    brain.corkRamp = Math.min(1, brain.corkRamp + dt / CORK_RAMP_S)
    const radius = cls.corkRadius * brain.corkRamp * Math.min(1, tgo / CORK_CONVERGE_TGO)
    _R.multiplyScalar(1 / r) // now the LOS direction
    _p1.crossVectors(_R, _up)
    if (_p1.lengthSq() < 1e-6) _p1.set(1, 0, 0)
    _p1.normalize()
    _p2.crossVectors(_R, _p1).normalize()
    brain.corkAngle += cls.corkSpin * brain.corkDir * dt
    _aim.addScaledVector(_p1, Math.cos(brain.corkAngle) * radius)
    _aim.addScaledVector(_p2, Math.sin(brain.corkAngle) * radius)
  }

  // juke: throw the aim sideways for a beat, then live with the recovery
  if (brain.jukeLeft > 0) {
    brain.jukeLeft -= dt
    _aim.addScaledVector(brain.jukeDir, JUKE_OFFSET)
  } else if (brain.jukeCooldown > 0) {
    brain.jukeCooldown -= dt
  }
  if (brain.nearWindow > 0) brain.nearWindow -= dt
  else brain.nearMisses = 0

  // steer with a turn budget (an acceleration clamp, same idiom the old
  // integrators used) — terminal phase gets more authority
  _des.copy(_aim).sub(pos).normalize().multiplyScalar(brain.speed)
  let maxStep = cls.turn * brain.speed * dt * (brain.terminal ? TERMINAL_GAIN : 1)
  if (spent) maxStep *= 0.3 // spent drive: fins only
  _des.sub(vel).clampLength(0, maxStep)
  vel.add(_des).setLength(brain.speed)
}

/**
 * The activity calls this when a player round passes close without
 * killing. Two near misses inside half a second and a juking class snaps
 * perpendicular to its flight line.
 */
export function reportNearMiss(brain: TorpBrain, vel: Vector3): void {
  if (!brain.cls.jukes || brain.jukeCooldown > 0 || brain.jukesLeft <= 0) return
  if (brain.nearWindow <= 0) {
    brain.nearMisses = 0
    brain.nearWindow = NEAR_MISS_WINDOW
  }
  brain.nearMisses++
  if (brain.nearMisses < 2) return
  // perpendicular to flight, random clock angle
  _p1.crossVectors(vel, _up)
  if (_p1.lengthSq() < 1e-6) _p1.set(1, 0, 0)
  _p1.normalize()
  _p2.crossVectors(vel, _p1).normalize()
  const a = Math.random() * Math.PI * 2
  brain.jukeDir.copy(_p1).multiplyScalar(Math.cos(a)).addScaledVector(_p2, Math.sin(a))
  brain.jukeLeft = JUKE_TIME
  brain.jukeCooldown = JUKE_COOLDOWN
  brain.jukesLeft--
  brain.nearMisses = 0
  brain.nearWindow = 0
}

/** Rough flight time under the class's burn profile — for salvo shaping. */
export function estimateFlightTime(dist: number, cls: TorpClass): number {
  const tBurn = (cls.vmax - cls.v0) / Math.max(cls.accel, 1e-6)
  const dBurn = cls.v0 * tBurn + 0.5 * cls.accel * tBurn * tBurn
  if (dBurn >= dist) {
    return (-cls.v0 + Math.sqrt(cls.v0 * cls.v0 + 2 * cls.accel * dist)) / cls.accel
  }
  return tBurn + (dist - dBurn) / cls.vmax
}
