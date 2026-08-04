import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Sprite,
  Vector3,
} from 'three'
import { turretControl } from '../../state/turretControl'
import { shipRig } from '../../state/shipRig'

/**
 * Shared PDC fire: the rounds themselves. Every round is a real projectile —
 * spawned at a muzzle with the SHOOTER'S velocity folded in, flying ballistic,
 * dying by age or by passing within kill radius of ITS target. Misses keep
 * sailing into the black, and they sail for a long time on purpose: the wavy
 * stream hanging in space is a physical recording of where the gun used to
 * point (Tirtha's hose), and cutting it short cut the story off. Fire-control
 * lead is computed against the target's velocity so crossing shots connect
 * honestly; per-turret aim error CONVERGES while a mount holds one track, so
 * fresh sprays hose wide and settle on.
 *
 * The streaks are SHORT — small hot bullets, not bars. A 2.6-unit streak was
 * over half a torpedo long and a stream of them read as a beam ("it's like a
 * straight line... not that").
 *
 * REMOTE BATTERIES: the same ballistics fired by somebody else — the Drift's
 * mount, a freighter's own gunner. They use this pool and this integrator but
 * carry NO kill authority (ambient outcomes belong to the activity; these are
 * the visible truth of the Sound Law's silent fireworks) and they shoot like
 * dock gunners, not like you: lower rate, wider error, a degraded solution.
 * Their tracers run hotter-red; yours run gold — you can tell whose fire is
 * whose across a klick of dark.
 *
 * An activity owns a PdcFire object: it writes `sources` (its torpedo pool),
 * `slotSource` (turretControl.targets index → sources index), `firing`,
 * `batteries`, and `onKill`; this component integrates, spawns, hit-tests,
 * and renders the one instanced pool plus per-turret muzzle flashes.
 */

const ROUND_SPEED = 800
const ROUND_LIFE = 2.4 // seconds — misses sail ~1,900 units into the black
/**
 * A round can KILL only for its first 1.7 seconds — the value the three-pass
 * balance was tuned at — and then flies on inert for the rest of its life.
 * Found the hard way: extending life "visually" extended kill RANGE, and a
 * parked ship aced the cert in 25 s flat (the acceptance law demands it die
 * by wave 3). Lethality and visibility are separate budgets now.
 */
const LETHAL_TIME = 1.7
const ROUND_LEN = 1.2
const ROUND_RADIUS = 0.032
const POOL = 512
const ROUNDS_PER_SEC = 12
const KILL_RADIUS = 3.4
const ERR_MAX = 60 // u/s of lateral aim error at track acquisition
// Converged error stays a visible spray, never a laser — tuned so a
// STATIONARY ship leaks hits by wave 2 (the acceptance law): the guns are
// good, not perfect, and flying the geometry is still the pilot's job.
const ERR_MIN = 13
const ERR_TAU = 0.85 // seconds; convergence time constant per held track
// Fire-control lead QUALITY degrades with flight time: distant shots get a
// poor solution (streams visibly lag and spray after the target), close
// shots snap on and shred — PDCs as terminal defense, which is both the
// show's anatomy and the balance law. Full lead everywhere let a PARKED
// ship ace the cert; fixed partial lead made it die in wave 1 (lead against
// a 3.4u kill radius is all-or-nothing). Range-degraded lead restores the
// old economy: kills happen close, saturation leaks past, flying the
// geometry buys the guns their windows.
const LEAD_RANGE_TAU = 0.45 // flight seconds at which the solution is fully degraded

/** dock gunners: slower guns, wider hands, half a solution */
const BATTERY_RATE = 10
const BATTERY_ERR = 45
const BATTERY_SOLUTION = 0.55

const GOLD = new Color(0.98, 0.82, 0.5)
const EMBER = new Color(1.0, 0.55, 0.35)

export interface PdcSource {
  position: Vector3
  velocity: Vector3
  alive: boolean
  launched: boolean
}

/** Somebody else's gun: a live origin, a live shooter velocity, one target. */
export interface RemoteBattery {
  /** live ref — the mount's world position (station point or a moving ship) */
  origin: Vector3
  /** live ref — the shooter's velocity, folded into every round */
  velocity: Vector3
  /** index into `sources`, or -1 to hold fire */
  targetIdx: number
  accum: number
}

export interface PdcFire {
  /** The activity's full torpedo pool (indexed by `slotSource` values) */
  sources: PdcSource[]
  /** Maps turretControl.targets index → index into `sources` */
  slotSource: number[]
  /** Guns hot (activity battle running) */
  firing: boolean
  /** Other people's guns, visual truth only — no kill authority */
  batteries: RemoteBattery[]
  onKill: ((sourceIndex: number, position: Vector3) => void) | null
}

export function createPdcFire(): PdcFire {
  return { sources: [], slotSource: [], firing: false, batteries: [], onKill: null }
}

export function createBattery(origin: Vector3, velocity: Vector3): RemoteBattery {
  return { origin, velocity, targetIdx: -1, accum: 0 }
}

interface Round {
  position: Vector3
  velocity: Vector3
  life: number
  fresh: boolean
  active: boolean
  /** -1: a battery round — renders and flies, never kills */
  sourceIdx: number
  /** 0 = ember (somebody else's), 1 = gold (yours); per-round flicker baked in */
  heat: number
  brightness: number
}

function makeFlashTexture(): CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,240,200,1)')
  g.addColorStop(0.3, 'rgba(255,180,90,0.8)')
  g.addColorStop(1, 'rgba(255,120,40,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new CanvasTexture(canvas)
}

const _m = new Matrix4()
const _q = new Quaternion()
const _v = new Vector3()
const _aim = new Vector3()
const _jitter = new Vector3()
const _scale = new Vector3(1, 1, 1)
const _up = new Vector3(0, 1, 0)
const _c = new Color()

export function PdcRounds({ fire }: { fire: PdcFire }) {
  const meshRef = useRef<InstancedMesh>(null)
  const flashRefs = useRef<(Sprite | null)[]>([])
  const flashTexture = useMemo(() => makeFlashTexture(), [])

  const state = useRef({
    rounds: Array.from(
      { length: POOL },
      (): Round => ({
        position: new Vector3(),
        velocity: new Vector3(),
        life: 0,
        fresh: false,
        active: false,
        sourceIdx: -1,
        heat: 1,
        brightness: 1,
      }),
    ),
    fireAccum: [0, 0, 0, 0, 0, 0],
    /** Per-turret fire-control convergence: held-track identity + duration */
    trackSource: [-1, -1, -1, -1, -1, -1],
    trackTime: [0, 0, 0, 0, 0, 0],
  })

  useFrame((_, dt) => {
    const s = state.current
    const { sources, slotSource, firing, batteries, onKill } = fire

    // ---- integrate + hit-test existing rounds ----
    for (const round of s.rounds) {
      if (!round.active) continue
      if (round.fresh) {
        round.fresh = false
      } else {
        round.position.addScaledVector(round.velocity, dt)
        round.life -= dt
      }
      if (round.life <= 0) {
        round.active = false
        continue
      }
      // battery rounds carry sourceIdx -1: they fly, they never adjudicate;
      // and every round goes inert past LETHAL_TIME — tracer, not bullet
      if (ROUND_LIFE - round.life > LETHAL_TIME) continue
      const src = sources[round.sourceIdx]
      if (src && src.alive && src.launched) {
        if (round.position.distanceTo(src.position) < KILL_RADIUS) {
          round.active = false
          onKill?.(round.sourceIdx, src.position)
        }
      }
    }

    const spawn = (
      origin: Vector3,
      shooterVel: Vector3 | null,
      shooterSpeedCap: number,
      src: PdcSource,
      sourceIdx: number,
      err: number,
      solution: number,
      heat: number,
    ) => {
      const round = s.rounds.find((r) => !r.active)
      if (!round) return
      // Fire-control lead: aim where the target WILL be for a round
      // launched from a moving shooter (relative-velocity solution, one pass)
      const flight = origin.distanceTo(src.position) / ROUND_SPEED
      _aim.copy(src.velocity)
      if (shooterVel) _aim.sub(shooterVel)
      _aim.multiplyScalar(flight * solution).add(src.position)
      _v.copy(_aim).sub(origin).normalize()
      _jitter
        .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
        .multiplyScalar(2 * err)
      round.sourceIdx = sourceIdx
      round.active = true
      round.fresh = true
      round.life = ROUND_LIFE
      round.heat = heat
      round.brightness = 0.7 + Math.random() * 0.5
      round.velocity.copy(_v).multiplyScalar(ROUND_SPEED).add(_jitter)
      if (shooterVel) {
        _v2spawn.copy(shooterVel).clampLength(0, shooterSpeedCap)
        round.velocity.add(_v2spawn)
      }
      round.position.copy(origin).addScaledVector(_v, ROUND_LEN / 2)
    }

    // ---- your turrets: aim error converges while a mount holds one track ----
    const shooting = firing && turretControl.spin > 0.85
    const muzzles = turretControl.muzzles
    for (let ti = 0; ti < muzzles.length; ti++) {
      const muzzle = muzzles[ti]
      const sourceIdx = muzzle && muzzle.targetIndex >= 0 ? (slotSource[muzzle.targetIndex] ?? -1) : -1
      if (sourceIdx !== s.trackSource[ti]) {
        s.trackSource[ti] = sourceIdx
        s.trackTime[ti] = 0
      } else if (sourceIdx >= 0) {
        s.trackTime[ti] += dt
      }
      if (!shooting || sourceIdx < 0) {
        s.fireAccum[ti] = 0
        continue
      }
      const src = sources[sourceIdx]
      if (!src || !src.alive || !src.launched) continue
      s.fireAccum[ti] += dt * ROUNDS_PER_SEC
      while (s.fireAccum[ti] >= 1) {
        s.fireAccum[ti] -= 1
        const flight = muzzle.position.distanceTo(src.position) / ROUND_SPEED
        const solution = Math.max(0, 1 - flight / LEAD_RANGE_TAU)
        const err = ERR_MIN + (ERR_MAX - ERR_MIN) * Math.exp(-s.trackTime[ti] / ERR_TAU)
        _shooterVel.copy(shipRig.velocityDir).multiplyScalar(Math.min(shipRig.speed, 520))
        spawn(muzzle.position, _shooterVel, 520, src, sourceIdx, err, solution, 1)
      }
    }

    // ---- everyone else's guns: visible truth, no verdicts ----
    for (const battery of batteries) {
      if (battery.targetIdx < 0) {
        battery.accum = 0
        continue
      }
      const src = sources[battery.targetIdx]
      if (!src || !src.alive || !src.launched) {
        battery.accum = 0
        continue
      }
      battery.accum += dt * BATTERY_RATE
      while (battery.accum >= 1) {
        battery.accum -= 1
        spawn(battery.origin, battery.velocity, 1200, src, -1, BATTERY_ERR, BATTERY_SOLUTION, 0)
      }
    }

    // ---- render: one pool, per-round color (gold = yours, ember = theirs) ----
    const mesh = meshRef.current
    if (mesh) {
      let n = 0
      for (const round of s.rounds) {
        if (!round.active) continue
        _v.copy(round.velocity).normalize()
        _q.setFromUnitVectors(_up, _v)
        // Battery tracers render longer and hotter: they are watched from
        // hundreds of units away, where a bullet-length streak reads as dust.
        // Your own rounds stay short — they are seen from the gun.
        _scale.set(1, round.heat < 0.5 ? 2.6 : 1, 1)
        _m.compose(round.position, _q, _scale)
        mesh.setMatrixAt(n, _m)
        _c.copy(EMBER).lerp(GOLD, round.heat).multiplyScalar(
          round.brightness * (round.heat < 0.5 ? 1.35 : 1),
        )
        mesh.setColorAt(n, _c)
        n++
      }
      mesh.count = n
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
    // ---- muzzle flashes: pulse with the burst, not a held lamp ----
    for (let ti = 0; ti < 6; ti++) {
      const sprite = flashRefs.current[ti]
      if (!sprite) continue
      const muzzle = muzzles[ti]
      const on = shooting && muzzle && muzzle.targetIndex >= 0
      sprite.visible = !!on && Math.random() > 0.25
      if (sprite.visible) {
        sprite.position.copy(muzzle.position)
        const sc = 0.18 + Math.random() * 0.34
        sprite.scale.set(sc, sc, 1)
      }
    }
  })

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, POOL]} frustumCulled={false}>
        <cylinderGeometry args={[ROUND_RADIUS, ROUND_RADIUS, ROUND_LEN, 4, 1, true]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <sprite
          key={`pdc-flash-${i}`}
          visible={false}
          ref={(sp) => {
            flashRefs.current[i] = sp
          }}
        >
          <spriteMaterial
            map={flashTexture}
            transparent
            opacity={0.7}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  )
}

const _shooterVel = new Vector3()
const _v2spawn = new Vector3()
