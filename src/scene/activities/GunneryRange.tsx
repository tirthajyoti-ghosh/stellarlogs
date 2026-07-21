import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  CanvasTexture,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  Sprite,
  Vector3,
} from 'three'
import { shipRig } from '../../state/shipRig'
import { cameraLook } from '../../state/cameraLook'
import { turretControl } from '../../state/turretControl'
import { activityState } from '../../state/activityState'
import { registerHudLabel } from '../../hud/hudState'
import { labelsChanged } from '../../hud/LabelLayer'
import { triggerImpact, triggerFanfare } from '../../audio/engine'

/**
 * F.1 v3 — PDC DEFENSE DRILL (experience redesign): a FINITE 3-wave defense
 * exercise you can WIN. Guns are automatic; the pilot's job is flying —
 * wave bearings deliberately probe the turrets' blind arcs so a static ship
 * takes hits by design (rotate the deliberate RCS ship; dodge the runner).
 * 3-hit hull with real impact physics (impulse + tumble + shake). Clearing
 * wave 3 = DRILL COMPLETE + fanfare; a clean fast run sets the best time.
 * See docs/experience-redesign-2026-07.md.
 */

const CENTER = new Vector3(-300, -60, -500)
const ARM_RADIUS = 900 // panel appears / drill can be armed
const LIVE_RADIUS = 2500 // drill keeps running inside this
const GRACE_SECONDS = 10
const TORP_POOL = 12
const TORP_HIT_SHIP = 6
const TORP_KILL_RADIUS = 4
const SPAWN_DISTANCE = 700
const TRACER_SPEED = 800
const TRACER_LIFE = 0.45
const TRACER_LEN = 6
const TRACER_POOL = 96
const ROUNDS_PER_SEC = 10
const BEST_TIME_KEY = 'stellarlogs-defense-best-time'

interface Torpedo {
  position: Vector3
  velocity: Vector3
  speed: number
  turnRate: number
  /** evasive corkscrew amplitude (u/s lateral) — 0 flies straight */
  weave: number
  weavePhase: number
  alive: boolean
  launchAt: number
  launched: boolean
}

interface Tracer {
  position: Vector3
  velocity: Vector3
  life: number
  fresh: boolean
  active: boolean
}

type Phase = 'idle' | 'countdown' | 'wave' | 'breather' | 'over'

/** One torpedo's launch spec: bearing relative to the ship's yaw at launch. */
interface LaunchSpec {
  /** radians off the nose (0 = dead ahead, π = astern) */
  yawOff: number
  /** vertical angle, radians (negative = from below) */
  elev: number
  speedMult?: number
  turnMult?: number
}

/**
 * Wave compositions — the challenge guarantee is SATURATION, not blind spots
 * (six ball turrets cover nearly the full sphere): every wave arrives
 * near-simultaneously, splitting the batteries across axes, at speeds that
 * shrink the engagement window (~300u range) below what a static defense
 * can clear. W1: one axis, slow — the guns handle it, teaching. W2: forward
 * pair + astern-below TRIO vs only 2 aft-covering turrets — a static ship
 * takes a leaker; rotating (or burning to open the range) saves you. W3:
 * three-axis saturation + a fast low-turn runner you dodge, not shoot.
 */
const WAVES: LaunchSpec[][] = [
  [
    { yawOff: -0.25, elev: 0.1 },
    { yawOff: 0.05, elev: -0.12 },
    { yawOff: 0.3, elev: 0.05 },
  ],
  [
    { yawOff: -0.35, elev: 0.08 },
    { yawOff: 0.3, elev: 0.15 },
    { yawOff: Math.PI - 0.5, elev: -0.6 },
    { yawOff: Math.PI, elev: -0.28 },
    { yawOff: Math.PI + 0.5, elev: -0.8 },
  ],
  [
    { yawOff: -1.5, elev: 0.1 },
    { yawOff: -1.75, elev: -0.15 },
    { yawOff: -1.3, elev: -0.3 },
    { yawOff: 1.55, elev: 0.12 },
    { yawOff: 1.8, elev: -0.1 },
    { yawOff: 1.35, elev: 0.3 },
    { yawOff: Math.PI, elev: 0, speedMult: 1.5, turnMult: 0.5 }, // the runner: dodge it
  ],
]
const BASE_SPEED = [60, 112, 125]
const BASE_TURN = [0.9, 1.0, 1.1]

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

const FLASH_POOL = 8
const _m = new Matrix4()
const _q = new Quaternion()
const _v = new Vector3()
const _up = new Vector3(0, 1, 0)
const _perp = new Vector3()
const _dummy = new Object3D()

export function GunneryRange() {
  const torpMeshRef = useRef<InstancedMesh>(null)
  const plumeMeshRef = useRef<InstancedMesh>(null)
  const tracerMeshRef = useRef<InstancedMesh>(null)
  const beaconRef = useRef<Mesh>(null)
  const flashRefs = useRef<(Sprite | null)[]>([])
  const muzzleFlashRefs = useRef<(Sprite | null)[]>([])
  const sparkRefs = useRef<(Sprite | null)[]>([])
  const flashState = useRef(
    Array.from({ length: FLASH_POOL }, () => ({ at: new Vector3(), start: -10, scale: 1 })),
  )
  const flashTexture = useMemo(() => makeFlashTexture(), [])

  const torpedoes = useMemo<Torpedo[]>(
    () =>
      Array.from({ length: TORP_POOL }, () => ({
        position: new Vector3(),
        velocity: new Vector3(),
        speed: 50,
        turnRate: 1,
        weave: 0,
        weavePhase: 0,
        alive: false,
        launchAt: 0,
        launched: false,
      })),
    [],
  )
  const targetSlots = useMemo(() => torpedoes.map((t) => ({ position: t.position })), [torpedoes])

  const tracers = useMemo<Tracer[]>(
    () =>
      Array.from({ length: TRACER_POOL }, () => ({
        position: new Vector3(),
        velocity: new Vector3(),
        life: 0,
        fresh: false,
        active: false,
      })),
    [],
  )

  const game = useRef({
    phase: 'idle' as Phase,
    wave: 0,
    kills: 0,
    hull: 3,
    veteran: false,
    nextVeteran: false,
    armedAt: 0,
    bestTime: Number(localStorage.getItem(BEST_TIME_KEY) ?? 0),
    phaseUntil: 0,
    graceUntil: 0,
    flashUntil: 0,
    flashText: '',
    fireAccum: [0, 0, 0, 0, 0, 0],
  })

  useEffect(() => {
    const unregister = registerHudLabel({
      id: 'poi-gunnery',
      name: 'GUNNERY RANGE',
      color: '#9adbe8',
      kind: 'poi',
      position: CENTER,
      yOffset: 70,
      el: null,
      detail: 'PDC DEFENSE DRILL',
    })
    labelsChanged()
    return () => {
      unregister()
      labelsChanged()
    }
  }, [])

  // ARM input: Space or click in the zone starts the drill (guns are auto)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      if (activityState.active) {
        e.preventDefault()
        ;(document.activeElement as HTMLElement | null)?.blur?.()
      }
      turretControl.fireIntent = true
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') turretControl.fireIntent = false
    }
    const pointerDown = (e: PointerEvent) => {
      if (!activityState.active) return
      if ((e.target as HTMLElement).closest('[data-ui]')) return
      turretControl.fireIntent = true
    }
    const clear = () => {
      turretControl.fireIntent = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('pointerdown', pointerDown)
    window.addEventListener('pointerup', clear)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('pointerdown', pointerDown)
      window.removeEventListener('pointerup', clear)
      window.removeEventListener('blur', clear)
    }
  }, [])

  useFrame(({ clock }, dt) => {
    const now = clock.elapsedTime
    const g = game.current
    const distToCenter = shipRig.position.distanceTo(CENTER)
    const inArmZone = distToCenter < ARM_RADIUS
    const battleRunning = g.phase === 'countdown' || g.phase === 'wave' || g.phase === 'breather'

    function launchWave(t: number) {
      g.wave++
      g.phase = 'wave'
      const specs = WAVES[g.wave - 1]
      const speedBase = BASE_SPEED[g.wave - 1] * (g.veteran ? 1.35 : 1)
      const turnBase = BASE_TURN[g.wave - 1] * (g.veteran ? 1.2 : 1)
      const shipYaw = shipRig.yaw
      specs.forEach((spec, i) => {
        const torp = torpedoes[i]
        const yaw = shipYaw + spec.yawOff
        // world direction for this bearing (forward = -Z rotated by yaw)
        _v.set(-Math.sin(yaw), 0, -Math.cos(yaw))
        _v.y = Math.tan(spec.elev)
        _v.normalize()
        torp.position
          .copy(shipRig.position)
          .addScaledVector(_v, spec.speedMult ? SPAWN_DISTANCE * 0.8 : SPAWN_DISTANCE)
        torp.speed = speedBase * (spec.speedMult ?? 1)
        torp.turnRate = turnBase * (spec.turnMult ?? 1)
        torp.weave = g.wave === 1 || spec.speedMult ? 0 : 40
        torp.weavePhase = i * 2.1
        torp.velocity.copy(shipRig.position).sub(torp.position).normalize().multiplyScalar(torp.speed)
        torp.alive = true
        torp.launched = i === 0
        torp.launchAt = t + i * 0.15
      })
      for (let i = specs.length; i < TORP_POOL; i++) torpedoes[i].alive = false
      g.flashText = `WAVE ${g.wave} OF 3`
      g.flashUntil = t + 1.4
    }

    function endDrill(result: 'complete' | 'failed' | 'abandoned') {
      const time = now - g.armedAt
      if (result === 'complete') {
        const clean = g.hull === 3
        let text = g.veteran
          ? `VETERAN DRILL COMPLETE — ${time.toFixed(1)}S`
          : `DRILL COMPLETE — ${time.toFixed(1)}S`
        if (clean && !g.veteran && (g.bestTime === 0 || time < g.bestTime)) {
          g.bestTime = time
          localStorage.setItem(BEST_TIME_KEY, time.toFixed(1))
          text += ' · NEW BEST'
        }
        g.flashText = text
        g.nextVeteran = !g.veteran
        triggerFanfare()
        // celebration: ring of detonations around the ship
        for (let i = 0; i < 6; i++) {
          const slot = flashState.current[i % FLASH_POOL]
          const a = (i / 6) * Math.PI * 2
          slot.at
            .copy(shipRig.position)
            .add(_v.set(Math.cos(a) * 28, (Math.random() - 0.5) * 16, Math.sin(a) * 28))
          slot.start = now + i * 0.14
          slot.scale = 1.6
        }
      } else if (result === 'failed') {
        g.flashText = 'HULL CRITICAL — DRILL ABORTED'
      } else {
        g.flashText = 'DRILL ABANDONED'
      }
      g.flashUntil = now + 3
      g.phase = 'over'
      g.phaseUntil = now + 3
      g.graceUntil = 0
      for (const torp of torpedoes) torp.alive = false
    }

    function shipHit(torp: Torpedo) {
      torp.alive = false
      g.hull--
      // physics: shove + tumble the pilot has to recover from
      _v.copy(torp.velocity).normalize()
      shipRig.pendingImpulse.addScaledVector(_v, 85)
      shipRig.tumbleYaw += (Math.random() > 0.5 ? 1 : -1) * (1.1 + Math.random() * 0.7)
      shipRig.tumblePitch += (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.6)
      cameraLook.shake = 1
      triggerImpact()
      document.body.dataset.hit = '1'
      setTimeout(() => {
        delete document.body.dataset.hit
      }, 650)
      const slot = flashState.current.reduce((a, b) => (a.start < b.start ? a : b))
      slot.at.copy(shipRig.position)
      slot.start = now
      slot.scale = 1.4
      if (g.hull <= 0) {
        endDrill('failed')
      } else {
        g.flashText = `HULL ${g.hull === 2 ? '66' : '33'}%`
        g.flashUntil = now + 1.6
      }
    }

    // ---- drill state machine ----
    if (inArmZone && g.phase === 'idle' && turretControl.fireIntent) {
      g.phase = 'countdown'
      g.wave = 0
      g.kills = 0
      g.hull = 3
      g.veteran = g.nextVeteran
      g.armedAt = now
      g.graceUntil = 0
      g.phaseUntil = now + 1.6
      g.flashText = g.veteran ? 'VETERAN DRILL — INCOMING' : 'INCOMING'
      g.flashUntil = now + 1.6
      turretControl.fireIntent = false
    }
    if (g.phase === 'countdown' && now >= g.phaseUntil) launchWave(now)
    if (g.phase === 'breather' && now >= g.phaseUntil) launchWave(now)
    if (g.phase === 'over' && now >= g.phaseUntil) g.phase = 'idle'

    // Arena grace: drifting out warns loudly instead of silently cancelling
    if (battleRunning) {
      if (distToCenter > LIVE_RADIUS) {
        if (g.graceUntil === 0) g.graceUntil = now + GRACE_SECONDS
        const left = Math.max(0, g.graceUntil - now)
        g.flashText = `RETURN TO RANGE — ${Math.ceil(left)}S`
        g.flashUntil = now + 0.4
        if (now >= g.graceUntil) endDrill('abandoned')
      } else if (g.graceUntil !== 0) {
        g.graceUntil = 0
        g.flashUntil = 0
      }
    }

    // ---- torpedoes: staggered launch, homing with capped turn ----
    let incoming = 0
    for (const torp of torpedoes) {
      if (!torp.alive) continue
      if (!torp.launched) {
        if (now >= torp.launchAt) torp.launched = true
        else continue
      }
      incoming++
      _v.copy(shipRig.position).sub(torp.position).normalize()
      if (torp.weave > 0) {
        // evasive corkscrew: lateral sinusoid perpendicular to the approach —
        // defeats gun streams at range, so kills concentrate close-in
        const wob = Math.sin(now * 2.3 + torp.weavePhase) * torp.weave
        const wobV = Math.cos(now * 1.7 + torp.weavePhase) * torp.weave * 0.6
        _perp.set(-_v.z, 0, _v.x).normalize()
        _v.multiplyScalar(torp.speed).addScaledVector(_perp, wob)
        _v.y += wobV
        _v.setLength(torp.speed)
      } else {
        _v.multiplyScalar(torp.speed)
      }
      const maxStep = torp.turnRate * torp.speed * dt
      _v.sub(torp.velocity).clampLength(0, maxStep)
      torp.velocity.add(_v).setLength(torp.speed)
      torp.position.addScaledVector(torp.velocity, dt)
      if (g.phase === 'wave' && torp.position.distanceTo(shipRig.position) < TORP_HIT_SHIP) {
        shipHit(torp)
        if (g.phase !== 'wave') break
        incoming--
      }
    }
    if (g.phase === 'wave' && incoming === 0) {
      if (g.wave >= 3) {
        endDrill('complete')
      } else {
        g.phase = 'breather'
        g.phaseUntil = now + 2.4
        g.flashText = `WAVE ${g.wave} CLEARED`
        g.flashUntil = now + 2
      }
    }

    // ---- HUD panel + battle state ----
    activityState.battle = battleRunning
    activityState.threats = battleRunning ? torpedoes : []
    activityState.active = inArmZone || battleRunning || g.phase === 'over'
    if (activityState.active) {
      activityState.title =
        g.veteran && battleRunning ? 'PDC DEFENSE — VETERAN' : 'PDC DEFENSE DRILL'
      activityState.hint =
        g.phase === 'idle'
          ? g.nextVeteran
            ? 'PRESS SPACE / TAP — VETERAN DRILL. GUNS ARE AUTOMATIC. FLY.'
            : 'PRESS SPACE / TAP TO BEGIN — GUNS ARE AUTOMATIC. FLY.'
          : battleRunning
            ? 'GUNS AUTO — FLY'
            : ''
      activityState.lines = [
        { label: 'WAVE', value: battleRunning ? `${g.wave}/3` : '—' },
        { label: 'INCOMING', value: String(incoming) },
        {
          label: 'HULL',
          value: g.hull === 3 ? '100%' : g.hull === 2 ? '66%' : g.hull === 1 ? '33%' : '0%',
        },
        { label: 'BEST', value: g.bestTime > 0 ? `${g.bestTime.toFixed(1)}S` : '—' },
      ]
      activityState.flash = now < g.flashUntil ? g.flashText : ''
    }

    // ---- feed turrets: guns are AUTOMATIC while the drill runs ----
    if (battleRunning) {
      const targets: { position: Vector3 }[] = []
      for (let i = 0; i < torpedoes.length; i++) {
        if (torpedoes[i].alive && torpedoes[i].launched) targets.push(targetSlots[i])
      }
      turretControl.targets = targets
      turretControl.firing = true
    } else if (turretControl.targets.length > 0) {
      turretControl.targets = []
      turretControl.firing = false
    }

    // ---- tracers: integrate existing first, then hit-test, then spawn ----
    for (const tracer of tracers) {
      if (!tracer.active) continue
      if (tracer.fresh) {
        tracer.fresh = false
      } else {
        tracer.position.addScaledVector(tracer.velocity, dt)
        tracer.life -= dt
      }
      if (tracer.life <= 0) {
        tracer.active = false
        continue
      }
      for (let i = 0; i < torpedoes.length; i++) {
        const torp = torpedoes[i]
        if (!torp.alive || !torp.launched) continue
        if (tracer.position.distanceTo(torp.position) < TORP_KILL_RADIUS) {
          torp.alive = false
          tracer.active = false
          g.kills++
          const slot = flashState.current.reduce((a, b) => (a.start < b.start ? a : b))
          slot.at.copy(torp.position)
          slot.start = now
          slot.scale = 1
          break
        }
      }
    }

    const shooting = battleRunning && turretControl.spin > 0.85
    if (shooting) {
      const muzzles = turretControl.muzzles
      for (let ti = 0; ti < muzzles.length; ti++) {
        const muzzle = muzzles[ti]
        if (muzzle.targetIndex < 0) {
          g.fireAccum[ti] = 0
          continue
        }
        g.fireAccum[ti] += dt * ROUNDS_PER_SEC
        while (g.fireAccum[ti] >= 1) {
          g.fireAccum[ti] -= 1
          const tracer = tracers.find((t) => !t.active)
          if (!tracer) break
          tracer.active = true
          tracer.fresh = true
          tracer.life = TRACER_LIFE
          tracer.velocity
            .copy(muzzle.direction)
            .multiplyScalar(TRACER_SPEED)
            .addScaledVector(shipRig.velocityDir, Math.min(shipRig.speed, 520))
          tracer.velocity.x += (Math.random() - 0.5) * 20
          tracer.velocity.y += (Math.random() - 0.5) * 20
          tracer.velocity.z += (Math.random() - 0.5) * 20
          tracer.position.copy(muzzle.position).addScaledVector(muzzle.direction, TRACER_LEN / 2)
        }
      }
    }

    // ---- render ----
    const torpMesh = torpMeshRef.current
    const plumeMesh = plumeMeshRef.current
    if (torpMesh && plumeMesh) {
      let n = 0
      for (const torp of torpedoes) {
        if (!torp.alive || !torp.launched) continue
        _v.copy(torp.velocity).normalize()
        _q.setFromUnitVectors(_up, _v)
        _dummy.position.copy(torp.position)
        _dummy.quaternion.copy(_q)
        _dummy.scale.setScalar(1)
        _dummy.updateMatrix()
        torpMesh.setMatrixAt(n, _dummy.matrix)
        const flicker = 0.85 + Math.random() * 0.35
        _dummy.position.addScaledVector(_v, -3.2)
        _dummy.scale.set(flicker, flicker * (1 + Math.random() * 0.3), flicker)
        _dummy.updateMatrix()
        plumeMesh.setMatrixAt(n, _dummy.matrix)
        n++
      }
      torpMesh.count = n
      plumeMesh.count = n
      torpMesh.instanceMatrix.needsUpdate = true
      plumeMesh.instanceMatrix.needsUpdate = true
    }
    const tracerMesh = tracerMeshRef.current
    if (tracerMesh) {
      let n = 0
      for (const tracer of tracers) {
        if (!tracer.active) continue
        _v.copy(tracer.velocity).normalize()
        _q.setFromUnitVectors(_up, _v)
        _m.compose(tracer.position, _q, _dummy.scale.set(1, 1, 1))
        tracerMesh.setMatrixAt(n++, _m)
      }
      tracerMesh.count = n
      tracerMesh.instanceMatrix.needsUpdate = true
    }
    for (let ti = 0; ti < 6; ti++) {
      const sprite = muzzleFlashRefs.current[ti]
      if (!sprite) continue
      const muzzle = turretControl.muzzles[ti]
      const on = shooting && muzzle && muzzle.targetIndex >= 0
      sprite.visible = !!on
      if (on) {
        sprite.position.copy(muzzle.position)
        const s = 0.55 + Math.random() * 0.5
        sprite.scale.set(s, s, 1)
      }
    }
    // hull damage sparks: the ship trails sparks while wounded
    const damaged = battleRunning && g.hull < 3
    for (let i = 0; i < sparkRefs.current.length; i++) {
      const sprite = sparkRefs.current[i]
      if (!sprite) continue
      const on = damaged && Math.random() < (g.hull === 1 ? 0.75 : 0.4)
      sprite.visible = on
      if (on) {
        sprite.position
          .copy(shipRig.position)
          .add(_v.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 6))
        const s = 0.5 + Math.random() * 0.9
        sprite.scale.set(s, s, 1)
      }
    }
    if (beaconRef.current) {
      const pulse = Math.pow(Math.max(0, Math.sin(now * 2.4)), 12)
      const material = beaconRef.current.material as MeshBasicMaterial
      material.color.setRGB(1 + pulse * 3, 0.9 + pulse * 2.4, 0.5 + pulse)
    }
    flashState.current.forEach((flash, i) => {
      const sprite = flashRefs.current[i]
      if (!sprite) return
      const age = now - flash.start
      if (age > 0.35 || age < 0) {
        sprite.visible = false
        return
      }
      sprite.visible = true
      sprite.position.copy(flash.at)
      const s = (5 + age * 42) * flash.scale
      sprite.scale.set(s, s, 1)
      ;(sprite.material as { opacity: number }).opacity = 1 - age / 0.35
    })
  })

  return (
    <group>
      {/* Range-control buoy */}
      <group position={CENTER.toArray()}>
        <mesh>
          <cylinderGeometry args={[1.2, 1.8, 26, 6]} />
          <meshStandardMaterial color="#3a424e" metalness={0.65} roughness={0.5} flatShading />
        </mesh>
        {[8, -8].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[6.5, 1.4, 6.5]} />
            <meshStandardMaterial color="#252b34" metalness={0.7} roughness={0.45} flatShading />
          </mesh>
        ))}
        <mesh ref={beaconRef} position={[0, 15.5, 0]}>
          <sphereGeometry args={[1.5, 10, 10]} />
          <meshBasicMaterial color={[1, 0.9, 0.5]} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 20, 0]} color="#ffd9a0" intensity={3} distance={120} decay={1.8} />
      </group>

      {/* Torpedoes: dark body + brilliant drive plume (the show look) */}
      <instancedMesh ref={torpMeshRef} args={[undefined, undefined, TORP_POOL]} frustumCulled={false}>
        <capsuleGeometry args={[0.7, 3.4, 4, 8]} />
        <meshStandardMaterial color="#20242c" metalness={0.7} roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={plumeMeshRef} args={[undefined, undefined, TORP_POOL]} frustumCulled={false}>
        <coneGeometry args={[1.1, 5.5, 8, 1, true]} />
        <meshBasicMaterial
          color={[3.0, 1.9, 0.85]}
          transparent
          opacity={0.9}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Tracer streaks */}
      <instancedMesh ref={tracerMeshRef} args={[undefined, undefined, TRACER_POOL]} frustumCulled={false}>
        <cylinderGeometry args={[0.11, 0.11, TRACER_LEN, 4, 1, true]} />
        <meshBasicMaterial
          color={[1.7, 1.2, 0.55]}
          transparent
          opacity={0.9}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Muzzle flashes (one per turret) */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <sprite
          key={`mf-${i}`}
          visible={false}
          ref={(s) => {
            muzzleFlashRefs.current[i] = s
          }}
        >
          <spriteMaterial
            map={flashTexture}
            transparent
            opacity={0.75}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}

      {/* Hull damage sparks */}
      {[0, 1, 2, 3].map((i) => (
        <sprite
          key={`spark-${i}`}
          visible={false}
          ref={(s) => {
            sparkRefs.current[i] = s
          }}
        >
          <spriteMaterial
            map={flashTexture}
            color="#ffb070"
            transparent
            opacity={0.8}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}

      {/* Detonation / celebration flashes */}
      {Array.from({ length: FLASH_POOL }, (_, i) => (
        <sprite
          key={i}
          visible={false}
          ref={(s) => {
            flashRefs.current[i] = s
          }}
        >
          <spriteMaterial
            map={flashTexture}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  )
}
