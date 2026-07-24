import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, useGLTF } from '@react-three/drei'
import {
  BufferGeometry,
  Color,
  Group,
  InstancedMesh,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from 'three'
import { shipRig } from '../../state/shipRig'
import { activityState } from '../../state/activityState'
import { registerHudLabel, hudLabels } from '../../hud/hudState'
import { labelsChanged } from '../../hud/LabelLayer'
import { triggerFanfare, triggerGatePing } from '../../audio/engine'
import { driveLock } from '../../physics/driveLock'
import { flightAssist } from '../../physics/flightAssist'
import { TRACK_POI } from '../../config/pois'
import { FONT_BOLD } from '../boards/font'

/**
 * F.2 — THE TRACK, drive-dark. The canon sport, flown the canon way: build
 * your speed in the LAUNCH CORRIDOR under full burn, and at the START line
 * the main drive LOCKS — from there it is gravity and attitude thrusters
 * only. Five gates across an entire outer system: sling KAAT (a gate that
 * RIDES the moving moon), dive the Jovian's cloud tops, take the trailing
 * boost off VEYU, and coast the long cold leg to the finish off the ice
 * giant. Every meter per second after the line is stolen from the planets.
 */

const SYSTEM = new Vector3(10500, 300, -10500) // the Track system core
const APERTURE = 95
const PAR = 90
const PANEL_RANGE = 1300 // idle panel + START marker wake-up distance
const CORRIDOR = 2600 // max distance from the next gate before DNF grace
const GRACE_SECONDS = 10
const DEAD_DRIFT_SPEED = 20 // below this for DEAD_DRIFT_SECONDS → run void
const DEAD_DRIFT_SECONDS = 6
const BEST_KEY = 'stellarlogs-track-best-v2'
const BUOY_URL = '/models/buoy.glb'
const POSTS_PER_GATE = 4

/** Planets' parked local positions (must match config/systems TRACK_SYSTEM) */
const SATURN_L = new Vector3(2600 * Math.cos((240 * Math.PI) / 180), 0, 2600 * Math.sin((240 * Math.PI) / 180))
const JOVIAN_L = new Vector3(4600 * Math.cos((320 * Math.PI) / 180), 0, 4600 * Math.sin((320 * Math.PI) / 180))
const ICE_L = new Vector3(7400 * Math.cos((335 * Math.PI) / 180), 0, 7400 * Math.sin((335 * Math.PI) / 180))

/** Course anchors, system-local. Gates 1 and 3 RIDE the moons (live). */
const STAGING_L = new Vector3(-4400, 0, -900)
const START_L = new Vector3(-2800, 0, -1250)
const G2_L = new Vector3(JOVIAN_L.x, 40, JOVIAN_L.z + 340) // Jovian periapsis: 130u off the cloud tops
const FINISH_L = new Vector3(ICE_L.x - 600, 20, ICE_L.z + 30)

interface Gate {
  position: Vector3
  normal: Vector3
  up: Vector3
  right: Vector3
  scale: number
  /** HUD label name of the moon this gate rides, if any */
  rides?: string
}

type Phase = 'idle' | 'running' | 'over'

const _v = new Vector3()
const _q = new Quaternion()
const _zAxis = new Vector3(0, 0, 1)
const _worldUp = new Vector3(0, 1, 0)
const _dummy = new Object3D()
const _color = new Color()

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

export function BeltRun() {
  const gates = useMemo<Gate[]>(() => {
    const mk = (local: Vector3, scale: number, rides?: string): Gate => ({
      position: local.clone().add(SYSTEM),
      normal: new Vector3(1, 0, 0),
      up: new Vector3(0, 1, 0),
      right: new Vector3(0, 0, 1),
      scale,
      rides,
    })
    return [
      mk(START_L, 1.26),
      mk(SATURN_L, 1.0, 'KAAT'), // live position patched per frame
      mk(G2_L, 1.0),
      mk(JOVIAN_L, 1.0, 'VEYU'), // live position patched per frame
      mk(FINISH_L, 1.26),
    ]
  }, [])
  const LAST = gates.length - 1
  const staging = useMemo(() => STAGING_L.clone().add(SYSTEM), [])
  const moonRefs = useRef<(Vector3 | null)[]>([])
  const ringMeshRef = useRef<InstancedMesh>(null)
  const postMeshRef = useRef<InstancedMesh>(null)
  const stagingRingRef = useRef<Mesh>(null)
  const textRefs = useRef<(Group | null)[]>([])
  const marqueeRef = useRef<Group>(null)
  const buoyMeshRef = useRef<InstancedMesh>(null)
  const buoyBody = useBuoyBody()

  const game = useRef({
    phase: 'idle' as Phase,
    next: 1,
    startAt: 0,
    phaseUntil: 0,
    graceUntil: 0,
    deadSince: 0,
    flashUntil: 0,
    flashText: '',
    best: Number(localStorage.getItem(BEST_KEY) ?? 0),
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
      detail: 'DRIVE-DARK SLINGSHOT RACING · BUILD SPEED IN THE CORRIDOR',
      jumpStandoff: TRACK_POI.standoff,
    })
    labelsChanged()
    return () => {
      unregister()
      labelsChanged()
      driveLock.locked = false
      flightAssist.enabled = true
    }
  }, [staging])

  // Launch-corridor buoys: the runway from STAGING to the START line
  useEffect(() => {
    const mesh = buoyMeshRef.current
    if (!mesh) return
    for (let i = 0; i < 6; i++) {
      const t = i / 5
      _dummy.position.lerpVectors(staging, gates[0].position, t)
      _dummy.position.y += i % 2 === 0 ? 70 : -70
      _dummy.rotation.set(0, i * 1.3, 0)
      _dummy.scale.setScalar(0.85)
      _dummy.updateMatrix()
      mesh.setMatrixAt(i, _dummy.matrix)
    }
    _dummy.rotation.set(0, 0, 0)
    mesh.instanceMatrix.needsUpdate = true
  }, [gates, staging])

  useFrame(({ clock }) => {
    const now = clock.elapsedTime
    const g = game.current
    const running = g.phase === 'running'

    // Moon-riding gates chase their moons (live label positions from the
    // system registry); normals re-derive from the live chain each frame
    for (let i = 0; i <= LAST; i++) {
      const gate = gates[i]
      if (!gate.rides) continue
      let ref = moonRefs.current[i]
      if (!ref) {
        const label = hudLabels.find((l) => l.name === gate.rides)
        if (label) {
          ref = label.position
          moonRefs.current[i] = ref
        }
      }
      if (ref) gate.position.copy(ref)
    }
    for (let i = 0; i <= LAST; i++) {
      const gate = gates[i]
      const prev = gates[Math.max(0, i - 1)]
      const next = gates[Math.min(LAST, i + 1)]
      gate.normal.copy(next.position).sub(prev.position).normalize()
      gate.right.crossVectors(_worldUp, gate.normal).normalize()
      gate.up.crossVectors(gate.normal, gate.right).normalize()
    }

    const distToStart = shipRig.position.distanceTo(gates[0].position)
    const distToStaging = shipRig.position.distanceTo(staging)

    function crossed(gate: Gate): boolean {
      const s0 = _v.copy(g.prevShip).sub(gate.position).dot(gate.normal)
      const s1 = _v.copy(shipRig.position).sub(gate.position).dot(gate.normal)
      if (s0 * s1 >= 0) return false
      const t = s0 / (s0 - s1)
      _v.copy(shipRig.position).sub(g.prevShip).multiplyScalar(t).add(g.prevShip)
      return _v.distanceTo(gate.position) < APERTURE * gate.scale
    }

    function endRun(banner: string, kind: 'info' | 'fail') {
      g.phase = 'idle'
      g.graceUntil = 0
      g.deadSince = 0
      driveLock.locked = false
      flightAssist.enabled = true
      activityState.banner = { text: banner, kind, until: now + 2.4 }
    }

    function startRun(restart: boolean) {
      g.phase = 'running'
      g.next = 1
      g.startAt = now
      g.graceUntil = 0
      g.deadSince = 0
      driveLock.locked = true
      flightAssist.enabled = false
      triggerGatePing(0)
      activityState.banner = {
        text: restart
          ? 'RESTART — DRIVE DARK'
          : `DRIVE DARK — ${Math.round(shipRig.speed)} M/S ENTRY`,
        kind: 'battle',
        until: now + 2.2,
      }
      g.flashText = ''
      g.flashUntil = 0
    }

    // Gate crossings (skip on teleport/warp frames — huge segments lie)
    const step = g.prevValid ? shipRig.position.distanceTo(g.prevShip) : Infinity
    if (step < 400 && !shipRig.warping) {
      if (g.phase !== 'running' && g.phase !== 'over' && crossed(gates[0])) {
        startRun(false)
      } else if (running) {
        if (g.next > 1 && crossed(gates[0])) {
          startRun(true)
        } else if (crossed(gates[g.next])) {
          triggerGatePing(g.next)
          if (g.next === LAST) {
            const time = now - g.startAt
            let text = `${time.toFixed(1)}S`
            if (time <= PAR) text += ' · UNDER PAR'
            if (g.best === 0 || time < g.best) {
              g.best = time
              localStorage.setItem(BEST_KEY, time.toFixed(1))
              text += ' · NEW BEST'
            }
            g.flashText = text
            g.flashUntil = now + 4
            triggerFanfare()
            driveLock.locked = false
            flightAssist.enabled = true
            activityState.banner = {
              text: `RUN COMPLETE — ${time.toFixed(1)}S`,
              kind: 'win',
              until: now + 3.2,
            }
            g.phase = 'over'
            g.phaseUntil = now + 4
          } else {
            g.next++
            g.flashText = `GATE ${g.next - 1} / ${LAST - 1}`
            g.flashUntil = now + 1.1
          }
        }
      }
    }
    if (g.phase === 'over' && now >= g.phaseUntil) g.phase = 'idle'

    if (running) {
      if (shipRig.warping) {
        // Jumping away mid-run voids it immediately — no dangling lock
        endRun('RUN VOID — LEFT THE COURSE', 'info')
      } else {
        // Course corridor: wandering off the line warns, then voids the run
        if (shipRig.position.distanceTo(gates[g.next].position) > CORRIDOR) {
          if (g.graceUntil === 0) g.graceUntil = now + GRACE_SECONDS
          const left = Math.max(0, g.graceUntil - now)
          activityState.banner = {
            text: `RETURN TO COURSE — ${Math.ceil(left)}S`,
            kind: 'fail',
            until: now + 0.4,
          }
          if (now >= g.graceUntil) endRun('RUN ABANDONED', 'info')
        } else if (g.graceUntil !== 0) {
          g.graceUntil = 0
        }
        // Dead drift: too slow to finish with the drive dark — void the run
        if (shipRig.speed < DEAD_DRIFT_SPEED) {
          if (g.deadSince === 0) g.deadSince = now
          else if (now - g.deadSince > DEAD_DRIFT_SECONDS) endRun('DEAD DRIFT — RUN VOID', 'fail')
        } else {
          g.deadSince = 0
        }
      }
    }

    // ---- shared HUD state (claim the panel only while engaged) ----
    const engaged = running || g.phase === 'over' || distToStart < PANEL_RANGE || distToStaging < PANEL_RANGE
    if (engaged) {
      activityState.owner = 'track'
      activityState.active = true
      activityState.title = 'THE TRACK — DRIVE-DARK SLINGSHOT'
      activityState.hint = running
        ? ''
        : g.phase === 'idle'
          ? 'FULL BURN THROUGH THE CORRIDOR — DRIVE AND AUTO-BRAKE CUT AT THE LINE'
          : ''
      activityState.lines = [
        { label: 'TIME', value: running ? `${(now - g.startAt).toFixed(1)}S` : '—' },
        { label: 'GATE', value: running ? `${g.next}/${LAST}` : '—' },
        { label: 'PAR', value: `${PAR}S` },
        { label: 'BEST', value: g.best > 0 ? `${g.best.toFixed(1)}S` : '—' },
      ]
      activityState.flash = now < g.flashUntil ? g.flashText : ''
      if (running) {
        activityState.raceTarget = gates[g.next].position
        activityState.raceTargetLabel = g.next === LAST ? 'FINISH' : `GATE ${g.next}`
      } else if (g.phase === 'idle') {
        activityState.raceTarget = gates[0].position
        activityState.raceTargetLabel = 'START'
      } else {
        activityState.raceTarget = null
      }
    } else if (activityState.owner === 'track') {
      activityState.owner = ''
      activityState.active = false
      activityState.raceTarget = null
    }

    // ---- gate hardware follows the moving course ----
    const ringMesh = ringMeshRef.current
    const postMesh = postMeshRef.current
    if (ringMesh && postMesh) {
      const pulse = 0.65 + Math.sin(now * 5) * 0.35
      for (let i = 0; i <= LAST; i++) {
        const gate = gates[i]
        _q.setFromUnitVectors(_zAxis, gate.normal)
        _dummy.position.copy(gate.position)
        _dummy.quaternion.copy(_q)
        _dummy.scale.setScalar(gate.scale)
        _dummy.updateMatrix()
        ringMesh.setMatrixAt(i, _dummy.matrix)
        const r = APERTURE * gate.scale + 6
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
        // colors: passed / NEXT pulsing / upcoming
        if (running) {
          if (i === g.next) {
            if (i === LAST) _color.setRGB(0.4 * pulse + 0.3, 2.1 * pulse, 0.9 * pulse)
            else _color.setRGB(0.45 * pulse, 1.7 * pulse + 0.4, 2.1 * pulse + 0.4)
          } else if (i < g.next || (i === 0 && g.next > 1)) {
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
        // gate labels track their gates
        const text = textRefs.current[i]
        if (text) {
          text.position.set(
            gate.position.x,
            gate.position.y + APERTURE * gate.scale + 26,
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
    // staging ring: steady white-green invitation
    const stag = stagingRingRef.current
    if (stag) stag.rotation.z = now * 0.05

    // Marquee faces the pilot
    const marquee = marqueeRef.current
    if (marquee) {
      marquee.rotation.y = Math.atan2(
        shipRig.position.x - staging.x,
        shipRig.position.z - staging.z,
      )
    }

    g.prevShip.copy(shipRig.position)
    g.prevValid = true
  })

  return (
    <group>
      {/* Holo guidance rings (per-instance status colors, live positions) */}
      <instancedMesh ref={ringMeshRef} args={[undefined, undefined, gates.length]} frustumCulled={false}>
        <torusGeometry args={[APERTURE, 2.2, 8, 64]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.9} />
      </instancedMesh>

      {/* Buoy posts at each ring's edge */}
      <instancedMesh
        ref={postMeshRef}
        args={[buoyBody.geometry, buoyBody.material, gates.length * POSTS_PER_GATE]}
        frustumCulled={false}
      />

      {/* STAGING: the corridor mouth — full burn from here to the line */}
      <group position={staging.toArray()}>
        <mesh
          ref={stagingRingRef}
          quaternion={new Quaternion().setFromUnitVectors(
            new Vector3(0, 0, 1),
            gates[0].position.clone().sub(staging).normalize(),
          )}
        >
          <torusGeometry args={[130, 2, 8, 64]} />
          <meshBasicMaterial
            color={[0.5, 1.6, 0.8]}
            toneMapped={false}
            transparent
            opacity={0.55}
          />
        </mesh>
      </group>

      {/* Corridor buoys */}
      <instancedMesh ref={buoyMeshRef} args={[buoyBody.geometry, buoyBody.material, 6]} frustumCulled={false} />

      {/* Gate labels */}
      {gates.map((_gate, i) => (
        <group
          key={i}
          ref={(el) => {
            textRefs.current[i] = el
          }}
        >
          <Text
            font={FONT_BOLD}
            fontSize={i === 0 || i === gates.length - 1 ? 22 : 30}
            letterSpacing={0.14}
            color={i === 0 || i === gates.length - 1 ? '#7fe8b8' : '#7fd9e8'}
            anchorX="center"
            anchorY="middle"
            material-toneMapped={false}
            material-transparent
            fillOpacity={0.85}
          >
            {i === 0 ? 'START' : i === gates.length - 1 ? 'FINISH' : String(i)}
          </Text>
        </group>
      ))}

      {/* Marquee above the staging mouth — the landmark */}
      <group
        ref={marqueeRef}
        position={[staging.x, staging.y + 220, staging.z]}
      >
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
          THE TRACK
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
          DRIVE-DARK SLINGSHOT RACING · BUILD SPEED · NO BRAKES PAST THE LINE
        </Text>
      </group>
    </group>
  )
}

useGLTF.preload(BUOY_URL)
