import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, InstancedMesh, Matrix4, Object3D, Quaternion, Vector3 } from 'three'
import { shipRig } from '../../state/shipRig'
import { activityState, say } from '../../state/activityState'
import { turretControl } from '../../state/turretControl'
import { registerHudLabel } from '../../hud/hudState'
import { useRockVariants } from '../Asteroids'
import { PdcRounds, createPdcFire } from '../fx/PdcRounds'
import { RockDust, spawnRockBurst } from '../fx/RockDust'
import { triggerImpact, triggerKlaxon } from '../../audio/engine'
import {
  holeHold,
  holdRepairsUntil,
  SLEET_RADIANT,
  CRIB_POS,
  CRIB_RADIUS,
} from '../../systems/reserve'
import { sleetPhase } from '../../systems/sleetClock'
import { bumpRocksStopped } from '../../systems/tallies'
import { DRIFT_POI } from '../../config/pois'

/**
 * THE KHIONE SLEET (docs/the-storm.md, audit-corrected).
 *
 * A PARALLEL STREAM, not a barrage: every fragment rides the same
 * orbit, so every rock in a pass shares one velocity direction — the
 * true bearing out of Khione — and the colony simply stands in the
 * lane. "On line with the crib" is MEASURED (does this rock's straight
 * path intersect the crib sphere?), never rolled. Fracture a boulder
 * early and the scattered pieces measure clean; fracture it late and
 * the spray still carries in. Range is the lesson and the physics
 * teaches it honestly.
 *
 * The pass itself runs on the global sleet clock — the docks board
 * posts the next one whether you are here or not; the rocks only fly
 * for whoever is standing the picket.
 */

const PICKET_R = 1100
const POOL = 140
const SPAWN_DIST = 2600
/** the stream flows FROM Khione: down this vector */
const STREAM_DIR = SLEET_RADIANT.clone().negate()
const DRIFT = new Vector3(...DRIFT_POI.position)
/** rocks die against the colony body — they do not fly through rock */
const COLONY_R = 240

interface Rock {
  position: Vector3
  velocity: Vector3
  spin: Vector3
  angle: Vector3
  size: number
  metal: boolean
  alive: boolean
  launched: boolean
  tracked: boolean
  variant: number
  onLine: boolean
}

const _m4 = new Matrix4()
const _q = new Quaternion()
const _s = new Vector3()
const _v = new Vector3()
const _w = new Vector3()
const _dummy = new Object3D()

/** MEASURED, not rolled: does this rock's straight path pass through
 *  the crib sphere? The one honest definition of "on line". */
function measureOnLine(rock: Rock): boolean {
  _v.copy(CRIB_POS).sub(rock.position)
  const speed = rock.velocity.length()
  if (speed < 1) return false
  _w.copy(rock.velocity).divideScalar(speed)
  const along = _v.dot(_w)
  if (along < 0) return false // already past her
  const closest2 = _v.lengthSq() - along * along
  const r = CRIB_RADIUS + rock.size
  return closest2 < r * r
}

export function KhioneSleet() {
  const variants = useRockVariants()
  const pdcFire = useMemo(() => createPdcFire(), [])
  const groupRef = useRef<Group>(null)
  const meshRefs = useRef<(InstancedMesh | null)[]>([])

  const rocks = useMemo<Rock[]>(
    () =>
      Array.from({ length: POOL }, () => ({
        position: new Vector3(),
        velocity: new Vector3(),
        spin: new Vector3(),
        angle: new Vector3(),
        size: 6,
        metal: false,
        alive: false,
        launched: false,
        tracked: false,
        variant: 0,
        onLine: false,
      })),
    [],
  )
  const slots = useMemo(() => rocks.map((r) => ({ position: r.position })), [rocks])
  const onLineList = useMemo<Rock[]>(() => [], [])

  const g = useRef({
    running: false,
    nextSpawnAt: 0,
    stopped: 0,
    holed: 0,
    warned: false,
    hull: 3,
    hullCoached: false,
    endAt: 0,
  })

  /** one fragment of the stream. All velocities parallel (± a hair of
   *  orbital dispersion); ABOUT A THIRD are seeded to pass through the
   *  crib sphere — the rest cross the sky wide. onLine is then
   *  measured off the actual line either way. */
  const launch = (rock: Rock) => {
    const threat = Math.random() < 0.34
    // perpendicular basis of the stream
    _v.set(-STREAM_DIR.z, 0, STREAM_DIR.x).normalize()
    const perpA = _w.copy(_v)
    const perpB = _v.crossVectors(STREAM_DIR, perpA).normalize()
    // where its parallel track crosses the colony's plane
    const a = threat ? (Math.random() - 0.5) * CRIB_RADIUS * 1.5 : (Math.random() - 0.5) * 1900
    const b = threat ? (Math.random() - 0.5) * CRIB_RADIUS * 1.5 : (Math.random() - 0.5) * 1100
    rock.position
      .copy(threat ? CRIB_POS : DRIFT)
      .addScaledVector(STREAM_DIR, -SPAWN_DIST)
      .addScaledVector(perpA, a)
      .addScaledVector(perpB, b)
    // one stream, one direction — a breath of dispersion, never a turn
    rock.velocity
      .copy(STREAM_DIR)
      .addScaledVector(perpA, (Math.random() - 0.5) * 0.012)
      .addScaledVector(perpB, (Math.random() - 0.5) * 0.012)
      .normalize()
      .multiplyScalar(140 + Math.random() * 80)
    rock.metal = threat ? Math.random() < 0.5 : Math.random() < 0.1
    rock.size = (threat ? 8 + Math.random() * 9 : 3 + Math.random() * 6) * (rock.metal ? 0.85 : 1)
    rock.spin.set((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1)
    rock.angle.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)
    rock.variant = Math.floor(Math.random() * Math.max(1, variants.length))
    rock.alive = true
    rock.launched = true
    rock.tracked = false
    rock.onLine = measureOnLine(rock)
  }

  /** fracture: children keep most of the parent's momentum plus a
   *  radial kick, and each child's threat status is RE-MEASURED —
   *  break her early and the pieces scatter clean, break her late and
   *  the spray still carries in. Physics, not a label. */
  const fracture = (rock: Rock) => {
    if (rock.size < 5) return
    const kids = rock.metal ? 2 : 2 + Math.floor(Math.random() * 2)
    let made = 0
    for (const child of rocks) {
      if (made >= kids) break
      if (child.alive) continue
      child.position.copy(rock.position)
      child.velocity
        .copy(rock.velocity)
        .multiplyScalar(0.9)
        .add(
          _v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(34),
        )
      child.size = rock.size * (0.42 + Math.random() * 0.16)
      child.metal = rock.metal
      child.spin.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3)
      child.angle.copy(rock.angle)
      child.variant = Math.floor(Math.random() * Math.max(1, variants.length))
      child.alive = true
      child.launched = true
      child.tracked = false
      child.onLine = measureOnLine(child)
      made++
    }
  }

  useEffect(() => {
    pdcFire.sources = rocks
    pdcFire.onKill = (idx: number, position: Vector3) => {
      const rock = rocks[pdcFire.slotSource[idx] ?? idx]
      if (!rock || !rock.alive) return
      rock.alive = false
      g.current.stopped++
      bumpRocksStopped()
      spawnRockBurst(position, Math.max(0.6, rock.size * 0.1), !rock.metal)
      fracture(rock)
    }
    const off = registerHudLabel({
      id: 'poi-sleet',
      name: 'THE KHIONE SLEET',
      color: '#8fa8bd',
      kind: 'poi',
      position: CRIB_POS,
      yOffset: 96,
      el: null,
      detail: 'CHARTED STREAM — FIRST CHARTS SCHEDULE',
      jumpStandoff: 700,
    })
    return () => {
      off()
      pdcFire.onKill = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdcFire, rocks])

  useFrame((_, dt) => {
    const st = g.current
    const now = performance.now() / 1000
    const clock = sleetPhase()
    const nearPicket = shipRig.position.distanceTo(CRIB_POS) < PICKET_R
    const free = !activityState.contractLive
    // the pass exists on the clock; the ROCKS fly only for a present
    // picket — the world stays kind to whoever is elsewhere
    const active = clock.phase === 'storm' && nearPicket && free

    if (active && !st.running) {
      st.running = true
      st.stopped = 0
      st.holed = 0
      st.hull = 3
      st.nextSpawnAt = now
      st.endAt = now + clock.left
      triggerKlaxon()
      say(1, 'KHIONE PASS OVERHEAD — STAND THE PICKET', 'info', 5)
    } else if (clock.phase === 'warn' && nearPicket && free && !st.warned) {
      st.warned = true
      triggerKlaxon()
      say(1, `KHIONE PASS INBOUND — T-${Math.ceil(clock.toPass)}S`, 'info', 5)
    }
    if (clock.phase !== 'warn') st.warned = false

    if (st.running && (!active || clock.left < 0.2)) {
      // the pass ends (or the picket left it)
      st.running = false
      if (clock.phase !== 'storm') {
        const line =
          st.holed === 0
            ? `PASS CLEAR — ${st.stopped} STOPPED · THE CRIB IS WHOLE`
            : `PASS OVER — ${st.stopped} STOPPED · ${st.holed} HOLD${st.holed > 1 ? 'S' : ''} OPEN — SKIFFS MUSTERING`
        say(1, line, st.holed === 0 ? 'win' : 'fail', 6)
      }
    }

    // ---- spawn while the storm runs ----
    if (st.running) {
      if (now >= st.nextSpawnAt) {
        const density = 0.35 + Math.sin(Math.min(1, clock.t) * Math.PI) * 0.9
        st.nextSpawnAt = now + (0.26 + Math.random() * 0.3) / density
        // keep headroom so fractures always have somewhere to be born
        let freeSlots = 0
        for (const r of rocks) if (!r.alive) freeSlots++
        if (freeSlots > 14) {
          const rock = rocks.find((r) => !r.alive)
          if (rock) launch(rock)
        }
      }
    }

    // ---- fly the rocks ----
    let live = 0
    for (const rock of rocks) {
      if (!rock.alive) continue
      rock.position.addScaledVector(rock.velocity, dt)
      rock.angle.x += rock.spin.x * dt
      rock.angle.y += rock.spin.y * dt
      rock.angle.z += rock.spin.z * dt
      live++
      // the crib: a strike is the Dry Weeks knocking
      if (rock.position.distanceTo(CRIB_POS) < CRIB_RADIUS + rock.size) {
        rock.alive = false
        spawnRockBurst(rock.position, Math.max(0.8, rock.size * 0.12), true)
        if (rock.size > 4.5) {
          st.holed++
          holeHold()
          holdRepairsUntil(Date.now() + clock.left * 1000)
          triggerImpact()
          say(2, 'HOLD OPEN — SHE IS VENTING ICE', 'fail', 4)
        }
        continue
      }
      // the colony is rock too: strikes flash on the dark side, and
      // nothing flies THROUGH the asteroid
      if (rock.position.distanceTo(DRIFT) < COLONY_R) {
        rock.alive = false
        spawnRockBurst(rock.position, Math.max(0.5, rock.size * 0.08), false)
        continue
      }
      // the picket stands IN the lane: a rock can find your hull too
      if (rock.position.distanceTo(shipRig.position) < rock.size + 7) {
        rock.alive = false
        spawnRockBurst(rock.position, Math.max(0.5, rock.size * 0.1), !rock.metal)
        triggerImpact()
        if (st.hull > 0) st.hull--
        if (!st.hullCoached) {
          st.hullCoached = true
          say(2, 'ROCK STRIKE — YOU ARE STANDING IN THE STREAM', 'fail', 4)
        }
        continue
      }
      if (rock.position.distanceTo(DRIFT) > SPAWN_DIST * 1.3) rock.alive = false
    }

    // ---- hand the picture to the guns, the scope and the HUD ----
    const owner = activityState.owner
    const wantOwn = st.running || (clock.phase === 'warn' && nearPicket && free)
    activityState.sleetLive = wantOwn
    if (wantOwn && (owner === '' || owner === 'sleet' || owner === 'iceroute')) {
      activityState.owner = 'sleet'
      activityState.battle = st.running && live > 0
      activityState.threatNoun = 'ROCK'
      activityState.hull = st.hull
      activityState.hullMax = 3
      onLineList.length = 0
      for (const rock of rocks) if (rock.alive && rock.onLine) onLineList.push(rock)
      activityState.threats = onLineList as unknown as typeof activityState.threats
      pdcFire.firing = st.running
      if (st.running) {
        const targets: { position: Vector3 }[] = []
        pdcFire.slotSource.length = 0
        for (let i = 0; i < rocks.length; i++) {
          // the guns spend themselves ONLY on what is measured to be
          // coming for the tanks — gravel passes, and so does the ice
          if (!rocks[i].alive || !rocks[i].onLine) continue
          targets.push(slots[i])
          pdcFire.slotSource.push(i)
        }
        turretControl.targets = targets
        turretControl.firing = true
        turretControl.heatEnabled = true
      }
    } else if (owner === 'sleet' && !wantOwn) {
      activityState.owner = ''
      activityState.battle = false
      activityState.threats = []
      activityState.threatNoun = 'TORPEDO'
      turretControl.targets = []
      turretControl.firing = false
      turretControl.heatEnabled = false
      pdcFire.firing = false
    }

    // ---- draw ----
    const group = groupRef.current
    if (group) group.visible = live > 0
    for (let v = 0; v < meshRefs.current.length; v++) {
      const mesh = meshRefs.current[v]
      if (!mesh) continue
      let n = 0
      for (const rock of rocks) {
        if (!rock.alive || rock.variant !== v) continue
        _q.setFromEuler(_dummy.rotation.set(rock.angle.x, rock.angle.y, rock.angle.z))
        _s.setScalar(rock.size * variants[v].norm * 2)
        _m4.compose(rock.position, _q, _s).multiply(variants[v].base)
        mesh.setMatrixAt(n, _m4)
        n++
        if (n >= POOL) break
      }
      mesh.count = n
      mesh.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      <group ref={groupRef}>
        {variants.map((v, i) => (
          <instancedMesh
            key={i}
            ref={(el) => {
              meshRefs.current[i] = el
            }}
            args={[v.geometry, v.material, POOL]}
            frustumCulled={false}
          />
        ))}
      </group>
      <PdcRounds fire={pdcFire} />
      <RockDust />
    </>
  )
}
