import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, useGLTF } from '@react-three/drei'
import {
  BufferGeometry,
  Float32BufferAttribute,
  Color,
  Group,
  InstancedMesh,
  Line as ThreeLine,
  LineDashedMaterial,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from 'three'
import { shipRig } from '../../state/shipRig'
import { IS_TOUCH } from '../../config/quality'
import { activityState, say } from '../../state/activityState'
import { registerHudLabel } from '../../hud/hudState'
import { labelsChanged } from '../../hud/LabelLayer'
import { triggerFanfare, triggerGatePing } from '../../audio/engine'
import { bbEvent } from '../../systems/blackbox'
import { TRACK_POI } from '../../config/pois'
import { FONT_BOLD } from '../boards/font'

/**
 * THE WATER RUN (docs/the-track.md, all three passes — his GO 2026-08-27).
 *
 * The old drive-dark slingshot was impossible as taught (a 520 entry
 * against an 8,132-unit turn radius) and nobody ever raced it — zero
 * starts in the trove. This is the rebuild on the fiction that was
 * always waiting: during the Dry Weeks the racing club ran raw ice,
 * lap after lap, so the Drift never went dry. Now they run the route
 * for time.
 *
 * The laws, from the exploration:
 * - THE DRIVE STAYS LIT — you race the ship you already fly.
 * - Eight gates, a closed loop, every gate parented to LIVE bodies
 *   (moon gates LEAD their moon; nothing can ever sink into a planet).
 * - A miss NEVER ends the run — and never advances it either: the gate
 *   stays the target until you roll it. The clock is the only judge
 *   (his ruling 2026-08-31). Only Backspace/the pill or warping out
 *   ends a run early.
 * - Instant restart (Backspace / the pill).
 * - Three named times: THE KIDS' TIME, THE CLUB TIME, THE SURVEYOR'S
 *   TIME. Every finisher writes the board.
 * - The dive past the giant steals TURNING, not speed — gravity as a
 *   cornering assist is the one thing this physics honestly delivers.
 */

const SYSTEM = new Vector3(10100, -1170, -10100)
const APERTURE = 95
const NEEDLE_APERTURE = 80
const KIDS = 90
const CLUB = 65
const SURVEYOR = 50
const PANEL_RANGE = 1300
const BEST_KEY = 'stellarlogs-waterrun-best'
const LAST_KEY = 'stellarlogs-waterrun-last'
const TAUGHT_KEY = 'stellarlogs-waterrun-taught'
const BUOY_URL = '/models/buoy.glb'
const POSTS_PER_GATE = 4

/** Track-system bodies (mirror of config/systems TRACK_SYSTEM — computed
 *  live with the same angle formula StarSystem uses, so the gates and the
 *  rendered planets can never drift apart) */
const BODIES = {
  saturn: { r: 2600, w: 0.00004, phase: (240 * Math.PI) / 180, parent: null as null | 'jovian' },
  jovian: { r: 4600, w: 0.00003, phase: (320 * Math.PI) / 180, parent: null },
  kaat: { r: 420, w: 0.03, phase: 0.8, parent: 'saturn' as const },
  veyu: { r: 540, w: 0.024, phase: 2.4, parent: 'jovian' as const },
  oso: { r: 860, w: 0.014, phase: 4.9, parent: 'jovian' as const },
}
type BodyName = keyof typeof BODIES

/** START/FINISH and the corridor, aimed DOWN THE FIRST LEG (the old
 *  buoys pointed 21° wrong — the first lie a newbie was told) */
const START_L = new Vector3(-2800, 0, -1250)
const STAGING_L = new Vector3(-4288, 0, -668)
const G6_L = new Vector3(900, 60, -2100) // the return sweep anchor

interface GateDef {
  /** live anchor body, or null for static */
  body: BodyName | null
  /** fixed offset (world axes) for planet gates */
  offset?: Vector3
  /** lead distance along the moon's orbital motion for flyby gates */
  lead?: number
  aperture: number
  label: string
}

const GATE_DEFS: GateDef[] = [
  { body: null, aperture: 120, label: 'START' }, // 0 — also the finish
  { body: 'kaat', lead: 200, aperture: APERTURE, label: '1' },
  { body: 'jovian', offset: new Vector3(-620, 130, 60), aperture: APERTURE, label: '2' }, // the high board
  { body: 'jovian', offset: new Vector3(-40, 40, 430), aperture: APERTURE, label: '3' }, // THE DIVE
  { body: 'veyu', lead: 200, aperture: APERTURE, label: '4' },
  { body: 'oso', lead: 130, aperture: NEEDLE_APERTURE, label: '5' }, // the needle
  { body: null, aperture: APERTURE, label: '6' }, // return sweep
]
/** the lap closes at the start ring */
const GATE_COUNT = GATE_DEFS.length + 1 // + finish (gate 0 again)
const LAST = GATE_COUNT - 1

interface Gate {
  position: Vector3
  normal: Vector3
  up: Vector3
  right: Vector3
  aperture: number
}

type Phase = 'idle' | 'running' | 'over'

const _v = new Vector3()
const _q = new Quaternion()
const _zAxis = new Vector3(0, 0, 1)
const _worldUp = new Vector3(0, 1, 0)
const _dummy = new Object3D()
const _color = new Color()
const _bodyPos: Record<BodyName, Vector3> = {
  saturn: new Vector3(),
  jovian: new Vector3(),
  kaat: new Vector3(),
  veyu: new Vector3(),
  oso: new Vector3(),
}
const _bodyLast: Record<BodyName, Vector3> = {
  saturn: new Vector3(),
  jovian: new Vector3(),
  kaat: new Vector3(),
  veyu: new Vector3(),
  oso: new Vector3(),
}
const _tangent = new Vector3()

function useBuoyBody(): { geometry: BufferGeometry; material: Material } {
  const gltf = useGLTF(BUOY_URL)
  return useMemo(() => {
    let found: Mesh | null = null
    gltf.scene.traverse((obj) => {
      const m = obj as Mesh
      if (m.isMesh && !found) found = m
    })
    const source = found as unknown as Mesh
    return { geometry: source.geometry, material: source.material as MeshStandardMaterial }
  }, [gltf])
}

/** live body positions from the shared orbit formula */
function computeBodies(t: number): void {
  for (const name of Object.keys(BODIES) as BodyName[]) {
    const b = BODIES[name]
    const angle = b.phase + t * b.w
    const p = _bodyPos[name]
    p.set(Math.cos(angle) * b.r, 0, Math.sin(angle) * b.r)
    if (b.parent) p.add(_bodyPos[b.parent])
    else p.add(SYSTEM)
  }
}

export function WaterRun() {
  const gates = useMemo<Gate[]>(
    () =>
      Array.from({ length: GATE_COUNT }, () => ({
        position: new Vector3(),
        normal: new Vector3(1, 0, 0),
        up: new Vector3(0, 1, 0),
        right: new Vector3(0, 0, 1),
        aperture: APERTURE,
      })),
    [],
  )
  const staging = useMemo(() => STAGING_L.clone().add(SYSTEM), [])
  const startPos = useMemo(() => START_L.clone().add(SYSTEM), [])
  const ringMeshRef = useRef<InstancedMesh>(null)
  const postMeshRef = useRef<InstancedMesh>(null)
  const stagingRingRef = useRef<Mesh>(null)
  const textRefs = useRef<(Group | null)[]>([])
  const marqueeRef = useRef<Group>(null)
  const boardRef = useRef<Group>(null)
  const boardBestRef = useRef<{ text: string; sync?: () => void } | null>(null)
  const boardLastRef = useRef<{ text: string; sync?: () => void } | null>(null)
  const buoyMeshRef = useRef<InstancedMesh>(null)
  const buoyBody = useBuoyBody()
  const crumb = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(6), 3))
    const line = new ThreeLine(
      geo,
      new LineDashedMaterial({
        color: '#5fd0c0',
        transparent: true,
        opacity: 0.3,
        dashSize: 40,
        gapSize: 60,
        toneMapped: false,
      }),
    )
    line.visible = false
    line.frustumCulled = false
    return line
  }, [])

  const game = useRef({
    phase: 'idle' as Phase,
    next: 1,
    startAt: 0,
    phaseUntil: 0,
    flashUntil: 0,
    flashText: '',
    missGate: -1,
    best: Number(localStorage.getItem(BEST_KEY) ?? 0),
    last: Number(localStorage.getItem(LAST_KEY) ?? 0),
    taught: !!localStorage.getItem(TAUGHT_KEY),
    teachAt: 0,
    teachStep: 0,
    prevShip: new Vector3(),
    prevValid: false,
  })

  useEffect(() => {
    const unregister = registerHudLabel({
      id: 'poi-track',
      name: 'THE TRACK',
      color: '#7fe0f0',
      kind: 'poi',
      position: staging,
      yOffset: 130,
      el: null,
      detail: 'THE WATER RUN · THE CLUB RUNS SO SHE IS NEVER DRY',
      jumpStandoff: TRACK_POI.standoff,
    })
    labelsChanged()
    // Backspace restarts, any time on the course. NOT R — R is pitch-up
    // (useShipControls), and racing pitch inputs were killing runs.
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Backspace' && !e.repeat && activityState.owner === 'track') {
        e.preventDefault()
        activityState.restartRequest = true
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      unregister()
      labelsChanged()
      window.removeEventListener('keydown', onKey)
    }
  }, [staging])

  // corridor buoys: the runway, aimed down the first leg
  useEffect(() => {
    const mesh = buoyMeshRef.current
    if (!mesh) return
    for (let i = 0; i < 6; i++) {
      const t = i / 5
      _dummy.position.lerpVectors(staging, startPos, t)
      _dummy.position.y += i % 2 === 0 ? 70 : -70
      _dummy.rotation.set(0, i * 1.3, 0)
      _dummy.scale.setScalar(0.85)
      _dummy.updateMatrix()
      mesh.setMatrixAt(i, _dummy.matrix)
    }
    _dummy.rotation.set(0, 0, 0)
    mesh.instanceMatrix.needsUpdate = true
  }, [staging, startPos])

  useFrame(({ clock }) => {
    const now = clock.elapsedTime
    const g = game.current
    const running = g.phase === 'running'

    // ---- the course breathes: every gate from live bodies ----
    computeBodies(now)
    for (let i = 0; i < GATE_COUNT; i++) {
      const def = GATE_DEFS[i === LAST ? 0 : i]
      const gate = gates[i]
      gate.aperture = def.aperture
      if (i === 0 || i === LAST) {
        gate.position.copy(startPos)
      } else if (def.body && def.lead !== undefined) {
        // flyby: the ring LEADS the moon along its motion — clean space
        // beside the rock, never centered on it
        const p = _bodyPos[def.body]
        const last = _bodyLast[def.body]
        _tangent.copy(p).sub(last)
        if (_tangent.lengthSq() < 1e-6) _tangent.set(-p.z + SYSTEM.z, 0, p.x - SYSTEM.x)
        _tangent.normalize()
        gate.position.copy(p).addScaledVector(_tangent, def.lead)
      } else if (def.body && def.offset) {
        gate.position.copy(_bodyPos[def.body]).add(def.offset)
      } else {
        gate.position.copy(G6_L).add(SYSTEM)
      }
    }
    for (const name of Object.keys(BODIES) as BodyName[]) _bodyLast[name].copy(_bodyPos[name])
    // normals from the live chain
    for (let i = 0; i < GATE_COUNT; i++) {
      const gate = gates[i]
      const prev = gates[Math.max(0, i - 1)]
      const next = gates[Math.min(LAST, i + 1)]
      gate.normal.copy(next.position).sub(prev.position).normalize()
      gate.right.crossVectors(_worldUp, gate.normal).normalize()
      gate.up.crossVectors(gate.normal, gate.right).normalize()
    }

    const distToStart = shipRig.position.distanceTo(startPos)
    const distToStaging = shipRig.position.distanceTo(staging)

    function planeCross(gate: Gate): number {
      // -1 = no crossing; else radial distance at the crossing point
      const s0 = _v.copy(g.prevShip).sub(gate.position).dot(gate.normal)
      const s1 = _v.copy(shipRig.position).sub(gate.position).dot(gate.normal)
      if (s0 * s1 >= 0) return -1
      const t = s0 / (s0 - s1)
      _v.copy(shipRig.position).sub(g.prevShip).multiplyScalar(t).add(g.prevShip)
      return _v.distanceTo(gate.position)
    }

    function endRun(banner: string, kind: 'info' | 'fail', reason: string) {
      if (g.phase === 'running') bbEvent('race-dnf', { reason, gate: g.next })
      g.phase = 'idle'
      g.missGate = -1
      say(2, banner, kind, 2.4)
    }

    function startRun(restart: boolean) {
      g.phase = 'running'
      g.next = 1
      g.startAt = now
      g.missGate = -1
      triggerGatePing(0)
      bbEvent('race-start', { restart })
      say(1, restart ? 'AGAIN — THE CLOCK RUNS' : 'THE WATER RUN — THE CLOCK RUNS', 'battle', 2.2)
      g.flashText = ''
      g.flashUntil = 0
    }

    function finishRun() {
      const time = now - g.startAt
      const tier =
        time <= SURVEYOR ? 'surveyor' : time <= CLUB ? 'club' : time <= KIDS ? 'kids' : 'ran'
      let text = `${time.toFixed(1)}S`
      if (tier === 'surveyor') text += " · THE SURVEYOR'S TIME"
      else if (tier === 'club') text += ' · THE CLUB TIME'
      else if (tier === 'kids') text += " · THE KIDS' TIME"
      else text += ' · YOU RAN THE ROUTE'
      g.last = time
      localStorage.setItem(LAST_KEY, time.toFixed(1))
      if (g.best === 0 || time < g.best) {
        g.best = time
        localStorage.setItem(BEST_KEY, time.toFixed(1))
        text += ' · NEW BEST'
      }
      g.flashText = text
      g.flashUntil = now + 4.5
      bbEvent('race-finish', { time: +time.toFixed(1), tier })
      if (tier === 'surveyor' || tier === 'club') triggerFanfare()
      say(2, `THE BOARD REMEMBERS — ${time.toFixed(1)}S`, 'win', 3.2)
      g.phase = 'over'
      g.phaseUntil = now + 4
    }

    // ---- restart: the TrackMania loop (R key or the pill) ----
    if (activityState.restartRequest && activityState.owner === 'track') {
      activityState.restartRequest = false
      if (running) endRun('RESTART', 'info', 'restart')
      g.phase = 'idle'
      say(1, 'ROLL THE START RING WHEN READY', 'info', 2)
      bbEvent('race-restart-req', {})
    }

    // ---- gate crossings ----
    const step = g.prevValid ? shipRig.position.distanceTo(g.prevShip) : Infinity
    if (step < 400 && !shipRig.warping) {
      if (g.phase !== 'running' && g.phase !== 'over') {
        const r = planeCross(gates[0])
        if (r >= 0 && r < gates[0].aperture) startRun(false)
      } else if (running) {
        const target = gates[g.next]
        const r = planeCross(target)
        if (r >= 0 && r < target.aperture) {
          // clean pass (also clears a pending miss on this gate)
          g.missGate = -1
          triggerGatePing(g.next)
          bbEvent('race-gate', { i: g.next, split: +(now - g.startAt).toFixed(1) })
          if (g.next === LAST) {
            finishRun()
          } else {
            g.next++
            g.flashText = `GATE ${g.next - 1} / ${LAST - 1}`
            g.flashUntil = now + 1.1
          }
        } else if (r >= 0 && r < 1400 && g.missGate !== g.next) {
          // THE MISS: the gate stays the target — circling back IS the cost
          g.missGate = g.next
          bbEvent('race-miss', { i: g.next })
          say(0, 'MISSED — CIRCLE BACK AND ROLL IT', 'fail', 2.2)
        }
      }
    }
    if (g.phase === 'over' && now >= g.phaseUntil) g.phase = 'idle'

    if (running) {
      if (shipRig.warping) {
        endRun('RUN VOID — LEFT THE COURSE', 'info', 'warped')
      } else {
        // far off the leg: a reminder, never an ending — the clock is the
        // only judge, and Backspace/warp are the only ways out of a run
        const prevGate = gates[g.next - 1]
        const legLen = prevGate.position.distanceTo(gates[g.next].position)
        const corridor = Math.max(2600, legLen * 1.15)
        const gateDist = shipRig.position.distanceTo(gates[g.next].position)
        if (gateDist > corridor) say(0, 'THE COURSE IS BEHIND YOU', 'fail', 0.4)
      }
    }

    // ---- first-visit coach (three lines, once ever) ----
    const engaged = running || g.phase === 'over' || distToStart < PANEL_RANGE || distToStaging < PANEL_RANGE
    if (engaged && !g.taught) {
      if (g.teachAt === 0) g.teachAt = now
      const lines = [
        'FOLLOW THE RINGS',
        'MISSES COST TIME — NOT RUNS',
        'THE LOW LINE PAST THE GIANT IS FASTER. AND MEANER.',
      ]
      const idx = Math.floor((now - g.teachAt) / 3.2)
      if (idx > g.teachStep - 1 && idx < lines.length) {
        g.teachStep = idx + 1
        say(1, lines[idx], 'info', 2.8)
      }
      if (idx >= lines.length) {
        g.taught = true
        localStorage.setItem(TAUGHT_KEY, '1')
      }
    }

    // ---- shared HUD state ----
    if (engaged) {
      activityState.owner = 'track'
      activityState.active = true
      activityState.title = 'THE WATER RUN'
      activityState.canRestart = true
      activityState.restartLabel = 'RESTART'
      activityState.hint = running
        ? ''
        : g.phase === 'idle'
          ? 'ROLL THE START RING'
          : g.phase === 'over' && !IS_TOUCH
            ? '⌫ RESTART'
            : ''
      const tierTarget = g.best === 0 ? KIDS : g.best > CLUB ? CLUB : SURVEYOR
      activityState.lines = [
        {
          label: 'TIME',
          value: running
            ? `${(now - g.startAt).toFixed(1)}S`
            : '—',
        },
        { label: 'GATE', value: running ? `${g.next}/${LAST}` : '—' },
        { label: 'NEXT MARK', value: `${tierTarget}S` },
        { label: 'BEST', value: g.best > 0 ? `${g.best.toFixed(1)}S` : '—' },
      ]
      activityState.flash = now < g.flashUntil ? g.flashText : ''
      if (running) {
        activityState.raceTarget = gates[g.next].position
        activityState.raceTargetLabel = g.next === LAST ? 'FINISH' : `GATE ${g.next}`
        activityState.raceNext = g.next < LAST ? gates[g.next + 1].position : null
      } else if (g.phase === 'idle') {
        activityState.raceTarget = gates[0].position
        activityState.raceTargetLabel = 'START'
        activityState.raceNext = gates[1].position
      } else {
        activityState.raceTarget = null
        activityState.raceNext = null
      }
    } else if (activityState.owner === 'track') {
      activityState.owner = ''
      activityState.active = false
      activityState.raceTarget = null
      activityState.raceNext = null
      activityState.canRestart = false
      activityState.restartLabel = ''
    }

    // ---- gate hardware ----
    const ringMesh = ringMeshRef.current
    const postMesh = postMeshRef.current
    if (ringMesh && postMesh) {
      const pulse = 0.65 + Math.sin(now * 5) * 0.35
      for (let i = 0; i < GATE_COUNT; i++) {
        const gate = gates[i]
        _q.setFromUnitVectors(_zAxis, gate.normal)
        _dummy.position.copy(gate.position)
        _dummy.quaternion.copy(_q)
        _dummy.scale.setScalar(gate.aperture / APERTURE)
        _dummy.updateMatrix()
        ringMesh.setMatrixAt(i, _dummy.matrix)
        const r = gate.aperture + 6
        for (let p = 0; p < POSTS_PER_GATE; p++) {
          const a = (p / POSTS_PER_GATE) * Math.PI * 2 + Math.PI / 4
          _dummy.position
            .copy(gate.position)
            .addScaledVector(gate.right, Math.cos(a) * r)
            .addScaledVector(gate.up, Math.sin(a) * r)
          _dummy.quaternion.set(0, 0, 0, 1)
          _dummy.rotation.set(0, i * 1.7 + p, 0)
          _dummy.scale.setScalar(0.7)
          _dummy.updateMatrix()
          postMesh.setMatrixAt(i * POSTS_PER_GATE + p, _dummy.matrix)
        }
        // colors: passed / MISSED amber / next pulsing / after-next dim
        if (running && i === g.next && g.missGate === g.next) {
          _color.setRGB(2.0 * pulse + 0.4, 1.1 * pulse, 0.2)
        } else if (running) {
          if (i === g.next) {
            if (i === LAST) _color.setRGB(0.4 * pulse + 0.3, 2.1 * pulse, 0.9 * pulse)
            else _color.setRGB(0.45 * pulse, 1.7 * pulse + 0.4, 2.1 * pulse + 0.4)
          } else if (i < g.next) {
            _color.setRGB(0.1, 0.16, 0.2)
          } else if (i === g.next + 1) {
            _color.setRGB(0.7, 0.52, 0.24)
          } else {
            _color.setRGB(0.3, 0.24, 0.12)
          }
        } else if (i === 0) {
          _color.setRGB(0.35 * pulse + 0.2, 1.9 * pulse + 0.3, 0.85 * pulse + 0.15)
        } else {
          _color.setRGB(0.3, 0.24, 0.12)
        }
        ringMesh.setColorAt(i, _color)
        const text = textRefs.current[i]
        if (text) {
          text.position.set(
            gate.position.x,
            gate.position.y + gate.aperture + 26,
            gate.position.z,
          )
          text.rotation.y = Math.atan2(
            shipRig.position.x - gate.position.x,
            shipRig.position.z - gate.position.z,
          )
        }
      }
      ringMesh.instanceMatrix.needsUpdate = true
      postMesh.instanceMatrix.needsUpdate = true
      if (ringMesh.instanceColor) ringMesh.instanceColor.needsUpdate = true
    }

    // breadcrumb: a faint dashed line current gate → next gate
    {
      const show = running && g.next < LAST
      crumb.visible = show
      if (show) {
        const pos = crumb.geometry.getAttribute('position')
        const a = gates[g.next].position
        const b = gates[g.next + 1].position
        pos.setXYZ(0, a.x, a.y, a.z)
        pos.setXYZ(1, b.x, b.y, b.z)
        pos.needsUpdate = true
        crumb.computeLineDistances()
      }
    }

    const stag = stagingRingRef.current
    if (stag) stag.rotation.z = now * 0.05
    const marquee = marqueeRef.current
    if (marquee) {
      marquee.rotation.y = Math.atan2(
        shipRig.position.x - staging.x,
        shipRig.position.z - staging.z,
      )
    }
    // THE BOARD at staging: live numbers, the kill-board pattern
    const board = boardRef.current
    if (board) {
      board.rotation.y = Math.atan2(
        shipRig.position.x - (staging.x + 260),
        shipRig.position.z - (staging.z + 180),
      )
      const bb = boardBestRef.current
      if (bb) {
        const t = g.best > 0 ? `BEST ${g.best.toFixed(1)}S` : 'BEST —'
        if (bb.text !== t) {
          bb.text = t
          bb.sync?.()
        }
      }
      const bl = boardLastRef.current
      if (bl) {
        const t = g.last > 0 ? `LAST RUN ${g.last.toFixed(1)}S` : 'LAST RUN —'
        if (bl.text !== t) {
          bl.text = t
          bl.sync?.()
        }
      }
    }

    g.prevShip.copy(shipRig.position)
    g.prevValid = true
  })

  return (
    <group>
      <instancedMesh ref={ringMeshRef} args={[undefined, undefined, GATE_COUNT]} frustumCulled={false}>
        <torusGeometry args={[APERTURE, 2.2, 8, 64]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.9} />
      </instancedMesh>

      <instancedMesh
        ref={postMeshRef}
        args={[buoyBody.geometry, buoyBody.material, GATE_COUNT * POSTS_PER_GATE]}
        frustumCulled={false}
      />

      {/* the breadcrumb line: where you go AFTER the next ring */}
      <primitive object={crumb} />

      {/* STAGING: the corridor mouth, aimed down the first leg */}
      <group position={staging.toArray()}>
        <mesh
          ref={stagingRingRef}
          quaternion={new Quaternion().setFromUnitVectors(
            new Vector3(0, 0, 1),
            startPos.clone().sub(staging).normalize(),
          )}
        >
          <torusGeometry args={[130, 2, 8, 64]} />
          <meshBasicMaterial color={[0.5, 1.6, 0.8]} toneMapped={false} transparent opacity={0.55} />
        </mesh>
      </group>

      <instancedMesh ref={buoyMeshRef} args={[buoyBody.geometry, buoyBody.material, 6]} frustumCulled={false} />

      {/* gate labels */}
      {Array.from({ length: GATE_COUNT }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            textRefs.current[i] = el
          }}
        >
          <Text
            font={FONT_BOLD}
            fontSize={i === 0 || i === LAST ? 22 : 30}
            letterSpacing={0.14}
            color={i === 0 || i === LAST ? '#7fe8b8' : '#7fd9e8'}
            anchorX="center"
            anchorY="middle"
            material-toneMapped={false}
            material-transparent
            fillOpacity={0.85}
          >
            {i === 0 ? 'START' : i === LAST ? 'FINISH' : GATE_DEFS[i].label}
          </Text>
        </group>
      ))}

      {/* the marquee */}
      <group ref={marqueeRef} position={[staging.x, staging.y + 220, staging.z]}>
        <Text
          font={FONT_BOLD}
          fontSize={44}
          letterSpacing={0.16}
          color="#7fe0f0"
          anchorX="center"
          anchorY="middle"
          material-toneMapped={false}
          material-transparent
          fillOpacity={0.9}
        >
          THE WATER RUN
        </Text>
        <Text
          font={FONT_BOLD}
          fontSize={11}
          letterSpacing={0.42}
          color="#9fc4de"
          anchorX="center"
          anchorY="middle"
          position={[0, -35, 0]}
          material-toneMapped={false}
          material-transparent
          fillOpacity={0.85}
        >
          EIGHT RINGS · THE LAP ENDS WHERE IT BEGINS
        </Text>
      </group>

      {/* THE BOARD — a record wall says two numbers, nothing else */}
      <group ref={boardRef} position={[staging.x + 260, staging.y + 70, staging.z + 180]}>
        <mesh>
          <boxGeometry args={[120, 54, 2]} />
          <meshStandardMaterial color="#161d27" metalness={0.55} roughness={0.6} flatShading />
        </mesh>
        <Text
          font={FONT_BOLD}
          fontSize={8}
          letterSpacing={0.24}
          color="#9fd8ef"
          anchorX="center"
          anchorY="middle"
          position={[0, 18, 1.4]}
          material-toneMapped={false}
        >
          THE BOARD
        </Text>
        <Text
          ref={((el: { text: string; sync?: () => void } | null) => {
            boardBestRef.current = el
          }) as never}
          font={FONT_BOLD}
          fontSize={15}
          letterSpacing={0.12}
          color="#ffc06e"
          anchorX="center"
          anchorY="middle"
          position={[0, 2, 1.4]}
          material-toneMapped={false}
        >
          {''}
        </Text>
        <Text
          ref={((el: { text: string; sync?: () => void } | null) => {
            boardLastRef.current = el
          }) as never}
          font={FONT_BOLD}
          fontSize={8.5}
          letterSpacing={0.16}
          color="#8fb8d8"
          anchorX="center"
          anchorY="middle"
          position={[0, -15, 1.4]}
          material-toneMapped={false}
        >
          {''}
        </Text>
      </group>
    </group>
  )
}

useGLTF.preload(BUOY_URL)
