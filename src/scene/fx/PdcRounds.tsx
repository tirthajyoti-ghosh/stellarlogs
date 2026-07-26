import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  CanvasTexture,
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
 * spawned at a muzzle, flying at ROUND_SPEED, dying by age or by passing
 * within kill radius of ITS target. Misses keep flying into the black, which
 * is the point: with per-turret aim error that CONVERGES while a mount holds
 * the same track, the visible spray "walks onto" the torpedo exactly like a
 * hose stream catching up to where you're pointing. Fire-control lead is
 * computed against the target's velocity so crossing shots (escort work)
 * connect honestly.
 *
 * An activity owns a PdcFire object: it writes `sources` (its torpedo pool),
 * `slotSource` (turretControl.targets index → sources index), `firing`, and
 * `onKill`; this component integrates, spawns, hit-tests, and renders the
 * instanced rounds plus the per-turret muzzle flashes.
 */

const ROUND_SPEED = 800
const ROUND_LIFE = 1.7 // seconds — misses visibly sail on
const ROUND_LEN = 2.6
const POOL = 320
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

export interface PdcSource {
  position: Vector3
  velocity: Vector3
  alive: boolean
  launched: boolean
}

export interface PdcFire {
  /** The activity's full torpedo pool (indexed by `slotSource` values) */
  sources: PdcSource[]
  /** Maps turretControl.targets index → index into `sources` */
  slotSource: number[]
  /** Guns hot (activity battle running) */
  firing: boolean
  onKill: ((sourceIndex: number, position: Vector3) => void) | null
}

export function createPdcFire(): PdcFire {
  return { sources: [], slotSource: [], firing: false, onKill: null }
}

interface Round {
  position: Vector3
  velocity: Vector3
  life: number
  fresh: boolean
  active: boolean
  sourceIdx: number
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
      }),
    ),
    fireAccum: [0, 0, 0, 0, 0, 0],
    /** Per-turret fire-control convergence: held-track identity + duration */
    trackSource: [-1, -1, -1, -1, -1, -1],
    trackTime: [0, 0, 0, 0, 0, 0],
  })

  useFrame((_, dt) => {
    const s = state.current
    const { sources, slotSource, firing, onKill } = fire

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
      const src = sources[round.sourceIdx]
      if (src && src.alive && src.launched) {
        if (round.position.distanceTo(src.position) < KILL_RADIUS) {
          round.active = false
          onKill?.(round.sourceIdx, src.position)
        }
      }
    }

    // ---- spawn: aim error converges while a mount holds the same track ----
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
        const round = s.rounds.find((r) => !r.active)
        if (!round) break
        // Fire-control lead: aim where the target WILL be for a round
        // launched from a moving ship (relative-velocity solution, one pass)
        const flight = muzzle.position.distanceTo(src.position) / ROUND_SPEED
        const solution = Math.max(0, 1 - flight / LEAD_RANGE_TAU)
        _aim
          .copy(src.velocity)
          .addScaledVector(shipRig.velocityDir, -Math.min(shipRig.speed, 520))
          .multiplyScalar(flight * solution)
          .add(src.position)
        _v.copy(_aim).sub(muzzle.position).normalize()
        // Converging spray: fresh tracks hose wide, held tracks tighten
        const err = ERR_MIN + (ERR_MAX - ERR_MIN) * Math.exp(-s.trackTime[ti] / ERR_TAU)
        _jitter
          .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
          .multiplyScalar(2 * err)
        round.sourceIdx = sourceIdx
        round.active = true
        round.fresh = true
        round.life = ROUND_LIFE
        round.velocity
          .copy(_v)
          .multiplyScalar(ROUND_SPEED)
          .addScaledVector(shipRig.velocityDir, Math.min(shipRig.speed, 520))
          .add(_jitter)
        round.position.copy(muzzle.position).addScaledVector(_v, ROUND_LEN / 2)
      }
    }

    // ---- render rounds ----
    const mesh = meshRef.current
    if (mesh) {
      let n = 0
      for (const round of s.rounds) {
        if (!round.active) continue
        _v.copy(round.velocity).normalize()
        _q.setFromUnitVectors(_up, _v)
        _m.compose(round.position, _q, _scale)
        mesh.setMatrixAt(n++, _m)
      }
      mesh.count = n
      mesh.instanceMatrix.needsUpdate = true
    }
    // ---- muzzle flashes ----
    for (let ti = 0; ti < 6; ti++) {
      const sprite = flashRefs.current[ti]
      if (!sprite) continue
      const muzzle = muzzles[ti]
      const on = shooting && muzzle && muzzle.targetIndex >= 0
      sprite.visible = !!on
      if (on) {
        sprite.position.copy(muzzle.position)
        const sc = 0.28 + Math.random() * 0.22
        sprite.scale.set(sc, sc, 1)
      }
    }
  })

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, POOL]} frustumCulled={false}>
        <cylinderGeometry args={[0.045, 0.045, ROUND_LEN, 4, 1, true]} />
        <meshBasicMaterial
          color={[0.98, 0.82, 0.5]}
          transparent
          opacity={0.85}
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
