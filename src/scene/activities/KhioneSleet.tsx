import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, InstancedMesh, Matrix4, Object3D, Quaternion, Vector3 } from 'three'
import { shipRig } from '../../state/shipRig'
import { activityState, say } from '../../state/activityState'
import { turretControl } from '../../state/turretControl'
import { registerHudLabel } from '../../hud/hudState'
import { useRockVariants } from '../Asteroids'
import { PdcRounds, createPdcFire } from '../fx/PdcRounds'
import { spawnExplosion } from '../fx/Explosions'
import { triggerImpact, triggerKlaxon } from '../../audio/engine'
import { holeHold, SLEET_RADIANT, CRIB_POS, CRIB_RADIUS } from '../../systems/reserve'
import { DRIFT_POI } from '../../config/pois'

/**
 * THE KHIONE SLEET (docs/the-storm.md) — the Drift's civil defence.
 *
 * A charted rubble stream out of KHIONE crosses this lane on a fixed
 * period; the colony has known the dates since the First Charts. It is
 * announced, not ambushed, and it is a DUTY, not a mission: there are
 * never enough hulls to cover the rim, so anyone who is here stands the
 * picket. Behind you are the Nilak's tanks — the colony's water.
 *
 * The only verb is the one this whole game teaches: BE IN THE RIGHT
 * PLACE. Guns stay automatic. Rocks do not steer — they are ballistic
 * and honest — and they FRACTURE rather than die, so a boulder shot
 * late is a spray still carrying through, while one shot early scatters
 * wide and misses. Range is the lesson; the scope already draws it.
 */

/** the pass runs on a real clock — everyone's Sleet, backend-ready */
const PERIOD_S = 240
const STORM_S = 100
const WARN_S = 25
/** the zone you must be inside to be counted as standing the picket */
const PICKET_R = 900
const POOL = 90
const SPAWN_DIST = 2600

interface Rock {
  position: Vector3
  velocity: Vector3
  spin: Vector3
  angle: Vector3
  /** metres — big ones are the hull plate, small ones are gravel */
  size: number
  /** worked metal from whatever died out there: dense, dangerous */
  metal: boolean
  alive: boolean
  launched: boolean
  tracked: boolean
  variant: number
  /** true if this one is actually on line with the tanks */
  onLine: boolean
}

const _m4 = new Matrix4()
const _q = new Quaternion()
const _s = new Vector3()
const _v = new Vector3()
const _dummy = new Object3D()

/** seconds until the next pass, from the wall clock */
function nextPassIn(): number {
  const t = Date.now() / 1000
  return PERIOD_S - (t % PERIOD_S)
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
  const onLine = useMemo<Rock[]>(() => [], [])

  const g = useRef({
    phase: 'idle' as 'idle' | 'warn' | 'storm' | 'over',
    until: 0,
    nextSpawnAt: 0,
    stopped: 0,
    holed: 0,
    announced: false,
    overUntil: 0,
  })

  /** one rock, aimed from the radiant across the colony */
  const launch = (rock: Rock, now: number, onLine: boolean) => {
    // birth out along the radiant, scattered across the stream's width
    const perpA = _v.set(-SLEET_RADIANT.z, 0, SLEET_RADIANT.x).normalize().clone()
    const perpB = new Vector3().crossVectors(SLEET_RADIANT, perpA).normalize()
    const spreadA = (Math.random() - 0.5) * (onLine ? 90 : 900)
    const spreadB = (Math.random() - 0.5) * (onLine ? 70 : 520)
    rock.position
      .copy(onLine ? CRIB_POS : new Vector3(...DRIFT_POI.position))
      .addScaledVector(SLEET_RADIANT, SPAWN_DIST)
      .addScaledVector(perpA, spreadA)
      .addScaledVector(perpB, spreadB)

    // aim: the on-line ones are the handful that will actually hole a tank
    const aim = onLine
      ? _v.copy(CRIB_POS).sub(rock.position)
      : _v
          .copy(new Vector3(...DRIFT_POI.position))
          .add(new Vector3((Math.random() - 0.5) * 1500, (Math.random() - 0.5) * 900, (Math.random() - 0.5) * 1500))
          .sub(rock.position)
    const speed = 150 + Math.random() * 90 + (onLine ? 30 : 0)
    rock.velocity.copy(aim).normalize().multiplyScalar(speed)

    rock.metal = onLine ? Math.random() < 0.55 : Math.random() < 0.12
    rock.size = (onLine ? 9 + Math.random() * 9 : 3 + Math.random() * 6) * (rock.metal ? 0.85 : 1)
    rock.spin.set((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1)
    rock.angle.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)
    rock.variant = Math.floor(Math.random() * Math.max(1, variants.length))
    rock.alive = true
    rock.launched = true
    rock.tracked = false
    rock.onLine = onLine
    void now
  }

  /** FRACTURE, never fireworks: a broken rock becomes smaller rocks that
   *  keep going. Break it late and the spray still carries through. */
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
        .multiplyScalar(0.82)
        .add(
          new Vector3(
            (Math.random() - 0.5) * 46,
            (Math.random() - 0.5) * 46,
            (Math.random() - 0.5) * 46,
          ),
        )
      child.size = rock.size * (0.42 + Math.random() * 0.16)
      child.metal = rock.metal
      child.spin.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3)
      child.angle.copy(rock.angle)
      child.variant = Math.floor(Math.random() * Math.max(1, variants.length))
      child.alive = true
      child.launched = true
      child.tracked = false
      child.onLine = rock.onLine
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
      spawnExplosion(position, rock.metal ? 0.5 : 0.32)
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
      detail: 'CHARTED STREAM — STAND THE PICKET',
      jumpStandoff: 700,
    })
    return () => {
      off()
      pdcFire.onKill = null
    }
  }, [pdcFire, rocks, slots])

  useFrame((_, dt) => {
    const st = g.current
    const now = performance.now() / 1000
    const nearPicket = shipRig.position.distanceTo(CRIB_POS) < PICKET_R
    const owner = activityState.owner
    const free = !activityState.contractLive && (owner === '' || owner === 'sleet' || owner === 'iceroute')

    // ---- the clock: the pass comes whether you are here or not ----
    const till = nextPassIn()
    if (st.phase === 'idle') {
      if (till < WARN_S && nearPicket && free) {
        st.phase = 'warn'
        st.until = now + till
        activityState.owner = 'sleet'
        triggerKlaxon()
        say(1, 'KHIONE PASS INBOUND — STAND THE PICKET', 'info', 5)
      }
    } else if (st.phase === 'warn') {
      if (now >= st.until) {
        st.phase = 'storm'
        st.until = now + STORM_S
        st.nextSpawnAt = now
        st.stopped = 0
        st.holed = 0
      }
    } else if (st.phase === 'storm') {
      if (now >= st.until) {
        st.phase = 'over'
        st.overUntil = now + 6
        const line =
          st.holed === 0
            ? `PASS CLEAR — ${st.stopped} STOPPED, THE CRIB IS WHOLE`
            : `PASS OVER — ${st.stopped} STOPPED · ${st.holed} HOLD${st.holed > 1 ? 'S' : ''} OPEN`
        say(1, line, st.holed === 0 ? 'win' : 'fail', 6)
      } else {
        // the stream: mostly gravel, a handful genuinely on line
        if (now >= st.nextSpawnAt) {
          const t = 1 - (st.until - now) / STORM_S
          // it builds, peaks in the middle, thins out
          const density = 0.35 + Math.sin(Math.min(1, t) * Math.PI) * 0.9
          st.nextSpawnAt = now + (0.24 + Math.random() * 0.3) / density
          const rock = rocks.find((r) => !r.alive)
          if (rock) launch(rock, now, Math.random() < 0.16)
        }
      }
    } else if (st.phase === 'over' && now >= st.overUntil) {
      st.phase = 'idle'
      if (activityState.owner === 'sleet') activityState.owner = ''
    }

    const running = st.phase === 'warn' || st.phase === 'storm' || st.phase === 'over'
    activityState.sleetLive = running

    // ---- fly the rocks ----
    let live = 0
    for (const rock of rocks) {
      if (!rock.alive) continue
      rock.position.addScaledVector(rock.velocity, dt)
      rock.angle.x += rock.spin.x * dt
      rock.angle.y += rock.spin.y * dt
      rock.angle.z += rock.spin.z * dt
      live++
      // a tank holed: the Dry Weeks, happening again
      if (rock.position.distanceTo(CRIB_POS) < CRIB_RADIUS + rock.size) {
        rock.alive = false
        if (rock.size > 4.5) {
          st.holed++
          holeHold()
          triggerImpact()
          spawnExplosion(rock.position, 0.9)
          say(2, 'HOLD OPEN — SHE IS VENTING ICE', 'fail', 4)
        }
        continue
      }
      // past the colony and gone
      if (rock.position.distanceTo(new Vector3(...DRIFT_POI.position)) > SPAWN_DIST * 1.25) {
        rock.alive = false
      }
    }

    // ---- hand the picture to the guns, the scope and the HUD ----
    if (running && free) {
      activityState.owner = 'sleet'
      activityState.battle = st.phase === 'storm' && live > 0
      // gravel is scenery, not a threat: the scope and the warning strip
      // only ever speak about the handful actually on line with the crib
      onLine.length = 0
      if (st.phase !== 'idle') {
        for (const rock of rocks) if (rock.alive && rock.onLine) onLine.push(rock)
      }
      activityState.threats = onLine as unknown as typeof activityState.threats
      activityState.threatNoun = 'ROCK'
      pdcFire.firing = st.phase === 'storm'
      if (st.phase === 'storm') {
        const targets: { position: Vector3 }[] = []
        pdcFire.slotSource.length = 0
        for (let i = 0; i < rocks.length; i++) {
          // the guns spend themselves on what is actually coming for the
          // tanks — gravel is left to pass, which is also why the ice
          // that rides this stream is never shot at
          if (!rocks[i].alive || !rocks[i].onLine) continue
          targets.push(slots[i])
          pdcFire.slotSource.push(i)
        }
        turretControl.targets = targets
        turretControl.firing = true
        turretControl.heatEnabled = true
      } else if (turretControl.targets.length > 0) {
        turretControl.targets = []
        turretControl.firing = false
        turretControl.heatEnabled = false
      }
    } else if (owner === 'sleet' && !running) {
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
    </>
  )
}
