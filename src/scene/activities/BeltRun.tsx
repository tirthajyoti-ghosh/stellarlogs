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
import { registerHudLabel } from '../../hud/hudState'
import { labelsChanged } from '../../hud/LabelLayer'
import { triggerFanfare, triggerGatePing } from '../../audio/engine'
import { BELTRUN_POI } from '../../config/pois'
import { FONT_BOLD } from '../boards/font'

/**
 * F.2 — BELT RUN. A time trial threading the Projects asteroid belt: fly
 * through the START ring and the clock runs; pass ten gates IN ORDER; the
 * finish line stops it. Pure friction-is-fun — the whole challenge is
 * wrestling Newtonian momentum through a curve (drift wide, counter-burn,
 * dive through the band). Finite win = finish the run; beat PAR / your best
 * for the retry loop. Gates are buoy hardware + holographic guidance rings;
 * crossing START again mid-run restarts (racing convention, no menus).
 */

const CENTER = new Vector3(0, 0, -2900) // Projects system / belt center
const BASE_R = 1800 // belt ring radius (band is ±150)
const APERTURE = 60
const PAR = 75
const PANEL_RANGE = 1500 // idle panel + START marker wake-up distance
const CORRIDOR = 1300 // max distance from the next gate before DNF grace
const GRACE_SECONDS = 8
const BEST_KEY = 'stellarlogs-beltrun-best'
const BUOY_URL = '/models/buoy.glb'
const POSTS_PER_GATE = 4

/** Course: (θ° around the belt, radial offset, height). Weaves through the
 *  rock band — outside lane, dive inside, a hairpin kink, climb back out. */
const COURSE: [number, number, number][] = [
  [80, -15, -20], // START
  [70, 0, 40],
  [61, 140, 90],
  [52, -120, 20],
  [43, -160, -70],
  [35, 40, -110],
  [28, -260, -30], // the kink: brake, turn hard
  [19, 120, 60],
  [10, 170, 110],
  [1, 0, 30],
  [-8, -40, -10], // FINISH
]
const LAST = COURSE.length - 1

interface Gate {
  position: Vector3
  normal: Vector3
  up: Vector3
  right: Vector3
  scale: number
}

function buildGates(): Gate[] {
  const positions = COURSE.map(([deg, dr, y]) => {
    const a = (deg * Math.PI) / 180
    return new Vector3(
      CENTER.x + Math.cos(a) * (BASE_R + dr),
      CENTER.y + y,
      CENTER.z + Math.sin(a) * (BASE_R + dr),
    )
  })
  const worldUp = new Vector3(0, 1, 0)
  return positions.map((position, i) => {
    const prev = positions[Math.max(0, i - 1)]
    const next = positions[Math.min(LAST, i + 1)]
    const normal = next.clone().sub(prev).normalize()
    const right = new Vector3().crossVectors(worldUp, normal).normalize()
    const up = new Vector3().crossVectors(normal, right).normalize()
    return { position, normal, up, right, scale: i === 0 || i === LAST ? 1.18 : 1 }
  })
}

type Phase = 'idle' | 'running' | 'over'

const _v = new Vector3()
const _q = new Quaternion()
const _zAxis = new Vector3(0, 0, 1)
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
  const gates = useMemo(() => buildGates(), [])
  const ringMeshRef = useRef<InstancedMesh>(null)
  const postMeshRef = useRef<InstancedMesh>(null)
  const textRefs = useRef<(Group | null)[]>([])
  const marqueeRef = useRef<Group>(null)
  const buoyBody = useBuoyBody()

  const game = useRef({
    phase: 'idle' as Phase,
    next: 1,
    startAt: 0,
    phaseUntil: 0,
    graceUntil: 0,
    flashUntil: 0,
    flashText: '',
    best: Number(localStorage.getItem(BEST_KEY) ?? 0),
    prevShip: new Vector3(),
    prevValid: false,
  })

  useEffect(() => {
    const unregister = registerHudLabel({
      id: 'poi-beltrun',
      name: 'BELT RUN',
      color: '#7fe0f0',
      kind: 'poi',
      position: gates[0].position,
      yOffset: 110,
      el: null,
      detail: 'TIME TRIAL · CROSS THE START GATE',
      jumpStandoff: BELTRUN_POI.standoff,
    })
    labelsChanged()
    return () => {
      unregister()
      labelsChanged()
    }
  }, [gates])

  // Static gate hardware: guidance rings + buoy posts at each ring's edge
  useEffect(() => {
    const ringMesh = ringMeshRef.current
    const postMesh = postMeshRef.current
    if (!ringMesh || !postMesh) return
    gates.forEach((gate, i) => {
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
    })
    _dummy.rotation.set(0, 0, 0)
    ringMesh.instanceMatrix.needsUpdate = true
    postMesh.instanceMatrix.needsUpdate = true
  }, [gates])

  useFrame(({ clock }) => {
    const now = clock.elapsedTime
    const g = game.current
    const distToStart = shipRig.position.distanceTo(gates[0].position)
    const running = g.phase === 'running'

    function crossed(gate: Gate): boolean {
      const s0 = _v.copy(g.prevShip).sub(gate.position).dot(gate.normal)
      const s1 = _v.copy(shipRig.position).sub(gate.position).dot(gate.normal)
      if (s0 * s1 >= 0) return false
      const t = s0 / (s0 - s1)
      _v.copy(shipRig.position).sub(g.prevShip).multiplyScalar(t).add(g.prevShip)
      return _v.distanceTo(gate.position) < APERTURE * gate.scale
    }

    function startRun(restart: boolean) {
      g.phase = 'running'
      g.next = 1
      g.startAt = now
      g.graceUntil = 0
      triggerGatePing(0)
      activityState.banner = {
        text: restart ? 'RESTART — GATE 1' : 'GO — 10 GATES',
        kind: 'info',
        until: now + 1.8,
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

    // Course corridor: wandering off the line warns, then abandons
    if (running) {
      if (shipRig.position.distanceTo(gates[g.next].position) > CORRIDOR) {
        if (g.graceUntil === 0) g.graceUntil = now + GRACE_SECONDS
        const left = Math.max(0, g.graceUntil - now)
        activityState.banner = {
          text: `RETURN TO COURSE — ${Math.ceil(left)}S`,
          kind: 'fail',
          until: now + 0.4,
        }
        if (now >= g.graceUntil) {
          g.phase = 'idle'
          g.graceUntil = 0
          activityState.banner = { text: 'RUN ABANDONED', kind: 'info', until: now + 2.2 }
        }
      } else if (g.graceUntil !== 0) {
        g.graceUntil = 0
      }
    }

    // ---- shared HUD state (claim the panel only while engaged) ----
    const engaged = running || g.phase === 'over' || distToStart < PANEL_RANGE
    if (engaged) {
      activityState.owner = 'beltrun'
      activityState.active = true
      activityState.title = 'BELT RUN — TIME TRIAL'
      activityState.hint =
        g.phase === 'idle' ? 'FLY THROUGH THE START GATE — THE CLOCK RUNS AT THE LINE' : ''
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
    } else if (activityState.owner === 'beltrun') {
      activityState.owner = ''
      activityState.active = false
      activityState.raceTarget = null
    }

    // ---- gate ring colors: passed / NEXT (pulsing) / upcoming ----
    const ringMesh = ringMeshRef.current
    if (ringMesh) {
      const pulse = 0.65 + Math.sin(now * 5) * 0.35
      for (let i = 0; i < gates.length; i++) {
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
      }
      if (ringMesh.instanceColor) ringMesh.instanceColor.needsUpdate = true
    }

    // Gate labels + marquee face the pilot (geostationary law)
    textRefs.current.forEach((group, i) => {
      if (!group) return
      const gate = gates[i]
      group.rotation.y = Math.atan2(
        shipRig.position.x - gate.position.x,
        shipRig.position.z - gate.position.z,
      )
    })
    const marquee = marqueeRef.current
    if (marquee) {
      marquee.rotation.y = Math.atan2(
        shipRig.position.x - gates[0].position.x,
        shipRig.position.z - gates[0].position.z,
      )
    }

    g.prevShip.copy(shipRig.position)
    g.prevValid = true
  })

  return (
    <group>
      {/* Holo guidance rings (per-instance status colors) */}
      <instancedMesh
        ref={ringMeshRef}
        args={[undefined, undefined, COURSE.length]}
        frustumCulled={false}
      >
        <torusGeometry args={[APERTURE, 1.5, 8, 64]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.9} />
      </instancedMesh>

      {/* Buoy posts marking each gate (same hardware as the gunnery boundary) */}
      <instancedMesh
        ref={postMeshRef}
        args={[buoyBody.geometry, buoyBody.material, COURSE.length * POSTS_PER_GATE]}
        frustumCulled={false}
      />

      {/* Gate labels */}
      {gates.map((gate, i) => (
        <group
          key={i}
          position={[gate.position.x, gate.position.y + APERTURE * gate.scale + 22, gate.position.z]}
          ref={(el) => {
            textRefs.current[i] = el
          }}
        >
          <Text
            font={FONT_BOLD}
            fontSize={i === 0 || i === LAST ? 17 : 24}
            letterSpacing={0.14}
            color={i === 0 || i === LAST ? '#7fe8b8' : '#7fd9e8'}
            anchorX="center"
            anchorY="middle"
            material-toneMapped={false}
            material-transparent
            fillOpacity={0.85}
          >
            {i === 0 ? 'START' : i === LAST ? 'FINISH' : String(i)}
          </Text>
        </group>
      ))}

      {/* Marquee above the START gate — the landmark */}
      <group
        ref={marqueeRef}
        position={[gates[0].position.x, gates[0].position.y + 165, gates[0].position.z]}
      >
        <Text
          font={FONT_BOLD}
          fontSize={40}
          letterSpacing={0.16}
          color="#7fe0f0"
          anchorX="center"
          anchorY="middle"
          material-toneMapped={false}
          material-transparent
          fillOpacity={0.9}
        >
          BELT RUN
        </Text>
        <Text
          font={FONT_BOLD}
          fontSize={10}
          letterSpacing={0.42}
          color="#9fc4de"
          anchorX="center"
          anchorY="middle"
          position={[0, -33, 0]}
          material-toneMapped={false}
          material-transparent
          fillOpacity={0.85}
        >
          TIME TRIAL · 10 GATES · CROSS START TO BEGIN
        </Text>
      </group>
    </group>
  )
}

useGLTF.preload(BUOY_URL)
