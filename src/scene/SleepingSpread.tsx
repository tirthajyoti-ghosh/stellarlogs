import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import {
  AdditiveBlending,
  BufferGeometry,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  Object3D,
  Quaternion,
  Vector3,
} from 'three'
import { shipRig } from '../state/shipRig'
import { ALL_SYSTEMS } from '../config/systems'
import { DRIFT_POI, WRECK_POI } from '../config/pois'
import { PROBES } from '../config/probes'

/**
 * THE SLEEPING SPREAD (docs/the-neighborhood.md §1, locked 2026-08-09).
 *
 * Every torpedo fiction in this game rests on one claim: the lanes are
 * seeded with sleeping ordnance. This module makes the claim PHYSICAL —
 * a dozen dormant torpedoes scattered through the systems, cold hulls
 * tumbling dead slow, found with the eyes or not at all. Rarely, one
 * WAKES near a witness: a launch flash, a hard burn off toward the Drift
 * or the lanes, a spark shrinking to nothing.
 *
 * LAWS (Tirtha's, verbatim in spirit):
 * - SHOW-ONLY. No brain, no pooling, no code shared with combat
 *   ordnance. Gameplay torpedoes are not touched by this file.
 * - Never toward the player, never targetable, no marker, no banner —
 *   the flare in the black IS the event (show-don't-tell law).
 * - Danger law: its first motion is lateral, away from the witness's
 *   line — "you are not my errand" — and the burn path is bent if it
 *   would pass anywhere near the player.
 */

const TORPEDO_URL = '/models/torpedo.glb'
const COUNT_EXTRA_DRIFT = 3
const WAKE_RANGE = 700
/** at most one show per this many seconds, sessionwide */
const WAKE_COOLDOWN = 180
/** expected loiter time near a sleeper before it stirs, ~25 s */
const WAKE_DICE_RATE = 0.04
const DRIFT = new Vector3(...DRIFT_POI.position)
const BURN_DESPAWN = 6000

interface Sleeper {
  pos: Vector3
  vel: Vector3
  burnDir: Vector3
  spin: Vector3
  angle: Vector3
  /** 0 sleeping · 1 waking (lateral drift) · 2 burning · 3 gone */
  phase: number
  wakeT: number
}

/** the same hull the combat pools fly — geometry only, no behavior */
function useSleeperBody(): { geometry: BufferGeometry; material: Material } {
  const gltf = useGLTF(TORPEDO_URL)
  return useMemo(() => {
    gltf.scene.updateMatrixWorld(true)
    let found: Mesh | null = null
    gltf.scene.traverse((obj) => {
      const m = obj as Mesh
      if (m.isMesh && !found) found = m
    })
    const source = found as unknown as Mesh
    const geometry = source.geometry.clone()
    geometry.applyMatrix4(source.matrixWorld)
    geometry.computeBoundingBox()
    const center = geometry.boundingBox!.getCenter(new Vector3())
    const size = geometry.boundingBox!.getSize(new Vector3())
    const scale = 4.6 / Math.max(size.x, size.y, size.z)
    geometry.applyMatrix4(
      new Matrix4()
        .makeRotationX(-Math.PI / 2)
        .multiply(new Matrix4().makeScale(scale, scale, scale))
        .multiply(new Matrix4().makeTranslation(-center.x, -center.y, -center.z)),
    )
    const material = Array.isArray(source.material) ? source.material[0] : source.material
    return { geometry, material }
  }, [gltf])
}

const _dummy = new Object3D()
const _v = new Vector3()
const _v2 = new Vector3()
const _q = new Quaternion()
const _up = new Vector3(0, 1, 0)
const _xAxis = new Vector3(1, 0, 0)
/** session seed: rolled once at module load — per-visit scatter without
 *  impure calls inside render */
const SESSION_SEED = (Math.floor(Math.random() * 0x7fffffff) | 1) >>> 0

export function SleepingSpread() {
  const body = useSleeperBody()
  const meshRef = useRef<InstancedMesh>(null)
  const plumeRef = useRef<Mesh>(null)
  const flashRef = useRef<Mesh>(null)

  const sleepers = useMemo(() => {
    // per-session scatter: the spread is different every visit — you
    // stumble, you don't farm
    let sd = SESSION_SEED
    const rng = () => {
      sd = (sd * 1103515245 + 12345) & 0x7fffffff
      return sd / 0x7fffffff
    }
    const out: Sleeper[] = []
    const add = (cx: number, cy: number, cz: number, rMin: number, rSpan: number) => {
      const a = rng() * Math.PI * 2
      const r = rMin + rng() * rSpan
      out.push({
        pos: new Vector3(
          cx + Math.cos(a) * r,
          cy + (rng() - 0.5) * 800,
          cz + Math.sin(a) * r,
        ),
        vel: new Vector3(),
        burnDir: new Vector3(1, 0, 0),
        spin: new Vector3(0.05 + rng() * 0.12, 0.04 + rng() * 0.1, 0.03 + rng() * 0.08),
        angle: new Vector3(rng() * 6.28, rng() * 6.28, rng() * 6.28),
        phase: 0,
        wakeT: 0,
      })
    }
    for (const sys of ALL_SYSTEMS) add(sys.position[0], sys.position[1], sys.position[2], 700, 1000)
    for (let i = 0; i < COUNT_EXTRA_DRIFT; i++)
      add(DRIFT_POI.position[0], DRIFT_POI.position[1], DRIFT_POI.position[2], 900, 900)
    add(WRECK_POI.position[0], WRECK_POI.position[1], WRECK_POI.position[2], 500, 500)
    return out
  }, [])

  const g = useRef({ burning: -1, cooldownUntil: 0, probed: false })

  useFrame(({ clock }, dt) => {
    if (PROBES && !g.current.probed) {
      g.current.probed = true
      const w = window as unknown as Record<string, unknown>
      w.__sleepingSpread = { sleepers, state: g }
    }
    const now = clock.elapsedTime
    const s = g.current
    const mesh = meshRef.current
    if (!mesh) return

    // the wake dice: one witness, one show, long silences between
    if (s.burning === -1 && now > s.cooldownUntil) {
      for (let i = 0; i < sleepers.length; i++) {
        const sl = sleepers[i]
        if (sl.phase !== 0) continue
        const d = sl.pos.distanceTo(shipRig.position)
        if (d > WAKE_RANGE) continue
        if (Math.random() > dt * WAKE_DICE_RATE) continue
        sl.phase = 1
        sl.wakeT = now
        s.burning = i
        // first motion: lateral, AWAY from the witness's line
        _v.copy(sl.pos).sub(shipRig.position).normalize()
        sl.vel.crossVectors(_v, _up)
        if (sl.vel.lengthSq() < 1e-4) sl.vel.set(1, 0, 0)
        sl.vel.normalize().multiplyScalar(9)
        // the errand: the Drift — bent away if the line grazes the player
        sl.burnDir.copy(DRIFT).sub(sl.pos).normalize()
        _v2.copy(shipRig.position).sub(sl.pos)
        const closest = _v.copy(_v2).cross(sl.burnDir).length()
        if (closest < 250) {
          _q.setFromAxisAngle(_up, 0.6)
          sl.burnDir.applyQuaternion(_q)
        }
        break
      }
    }

    for (let i = 0; i < sleepers.length; i++) {
      const sl = sleepers[i]
      if (sl.phase === 3) continue
      if (sl.phase === 0) {
        // asleep: dead-slow tumble, going nowhere
        sl.angle.x += sl.spin.x * dt
        sl.angle.y += sl.spin.y * dt
        _dummy.rotation.set(sl.angle.x, sl.angle.y, sl.angle.z)
      } else {
        const t = now - sl.wakeT
        if (sl.phase === 1 && t > 1.4) sl.phase = 2
        if (sl.phase === 2) {
          // the burn: hard, and visibly not about you
          _v.copy(sl.burnDir).multiplyScalar(240 * dt)
          sl.vel.add(_v)
          if (sl.vel.length() > 900) sl.vel.setLength(900)
        }
        sl.pos.addScaledVector(sl.vel, dt)
        // attitude swings onto the burn line as she lights
        _q.setFromUnitVectors(_xAxis, sl.vel.lengthSq() > 1 ? _v2.copy(sl.vel).normalize() : sl.burnDir)
        _dummy.quaternion.slerp(_q, Math.min(1, dt * 3))
        _dummy.rotation.setFromQuaternion(_dummy.quaternion)
        if (sl.pos.distanceTo(shipRig.position) > BURN_DESPAWN) {
          sl.phase = 3
          g.current.burning = -1
          g.current.cooldownUntil = now + WAKE_COOLDOWN
        }
      }
      _dummy.position.copy(sl.pos)
      _dummy.scale.setScalar(1)
      _dummy.updateMatrix()
      mesh.setMatrixAt(i, _dummy.matrix)
    }
    // hide the departed
    for (let i = 0; i < sleepers.length; i++) {
      if (sleepers[i].phase === 3) {
        _dummy.position.set(0, -1e7, 0)
        _dummy.scale.setScalar(0.001)
        _dummy.updateMatrix()
        mesh.setMatrixAt(i, _dummy.matrix)
      }
    }
    mesh.count = sleepers.length
    mesh.instanceMatrix.needsUpdate = true

    // the one plume + the launch flash ride whichever sleeper is awake
    const plume = plumeRef.current
    const flash = flashRef.current
    const bi = s.burning
    const b = bi >= 0 ? sleepers[bi] : null
    if (plume) {
      const burning = !!b && b.phase === 2
      plume.visible = burning
      if (b && burning) {
        _v.copy(b.vel).normalize()
        plume.position.copy(b.pos).addScaledVector(_v, -3.6)
        _q.setFromUnitVectors(_up, _v)
        plume.quaternion.copy(_q)
        const f = (0.85 + Math.random() * 0.3) * Math.min(1.6, b.vel.length() / 400 + 0.4)
        plume.scale.set(f, f * (1 + Math.random() * 0.25), f)
      }
    }
    if (flash) {
      const t = b ? now - b.wakeT : 99
      const flashing = !!b && t > 1.2 && t < 1.8
      flash.visible = flashing
      if (b && flashing) {
        flash.position.copy(b.pos)
        const k = 1 - Math.abs((t - 1.5) / 0.3)
        flash.scale.setScalar(2 + k * 9)
      }
    }
  })

  return (
    <group>
      {/* pool sized from the scatter itself — a hardcoded 16 overflowed
          the moment the inert stars joined ALL_SYSTEMS (17 sleepers) and
          the driver complained once per frame */}
      <instancedMesh
        ref={meshRef}
        args={[body.geometry, body.material, sleepers.length]}
        frustumCulled={false}
      />
      <mesh ref={plumeRef} visible={false} frustumCulled={false}>
        <coneGeometry args={[1.1, 5.5, 8, 1, true]} />
        <meshBasicMaterial
          color={[3.0, 1.9, 0.85]}
          transparent
          opacity={0.9}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={flashRef} visible={false} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial
          color={[3.4, 2.6, 1.6]}
          transparent
          opacity={0.85}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

useGLTF.preload(TORPEDO_URL)
