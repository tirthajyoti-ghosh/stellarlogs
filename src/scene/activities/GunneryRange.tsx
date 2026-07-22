import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, useGLTF } from '@react-three/drei'
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
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
import { triggerImpact, triggerFanfare, triggerKlaxon } from '../../audio/engine'
import { spawnExplosion } from '../fx/Explosions'
import { TorpedoTrails } from '../fx/TorpedoTrails'
import { HullDamage, damageFx } from '../fx/HullDamage'
import { GUNNERY_POI } from '../../config/pois'
import { IS_TOUCH } from '../../config/quality'
import { FONT_BOLD } from '../boards/font'

/**
 * F.1 — PDC DEFENSE DRILL. Finite 3-wave defense exercise you WIN. Guns are
 * automatic; the pilot's job is flying. The drill AUTO-STARTS when the ship
 * crosses the marked boundary ring — no arming step; re-runs need Space /
 * the touch button or an exit-and-return. Wave design forces action from the
 * first second: W1 attacks from ASTERN (turn the ship — the coach line says
 * so), W2 splits axes, W3 saturates three axes plus a runner you dodge.
 * Torpedoes (real missile model) weave evasively and drag white path trails.
 * 3-hit hull with full impact feedback. See docs/experience-redesign-2026-07.
 */

const CENTER = new Vector3(...GUNNERY_POI.position)
const ARM_RADIUS = 1400
const LIVE_RADIUS = 2600
const GRACE_SECONDS = 10
const TORP_POOL = 12
const TORP_HIT_SHIP = 6.5
const TORP_KILL_RADIUS = 3.4
const SPAWN_DISTANCE = 600
const TRACER_SPEED = 800
const TRACER_LIFE = 0.45
const TRACER_LEN = 2.6
const TRACER_POOL = 96
const ROUNDS_PER_SEC = 10
const BEST_TIME_KEY = 'stellarlogs-defense-best-time'
const TORPEDO_URL = '/models/torpedo.glb'
const BUOY_URL = '/models/buoy.glb'
const BUOY_COUNT = 22
/** Local Y of the buoy's warning-light column (12u-tall normalized model) */
const BUOY_LIGHT_Y = 3.4

interface Torpedo {
  position: Vector3
  velocity: Vector3
  speed: number
  turnRate: number
  weave: number
  weavePhase: number
  alive: boolean
  launchAt: number
  launched: boolean
  /** A turret currently holds a lock on this torpedo (HUD TRK tag) */
  tracked: boolean
}

interface Tracer {
  position: Vector3
  velocity: Vector3
  life: number
  fresh: boolean
  active: boolean
  /** Torpedo index this round was fired at — dumb rounds miss everything else */
  targetIdx: number
}

type Phase = 'idle' | 'countdown' | 'wave' | 'breather' | 'over'

interface LaunchSpec {
  yawOff: number
  elev: number
  speedMult?: number
  turnMult?: number
}

/**
 * Wave design: saturation + evasion create the challenge (six ball turrets
 * cover the sphere, so blind spots don't exist). W1: four from ASTERN so the
 * very first act is turning the ship. W2: seven split forward/astern fans.
 * W3: ten across four axes + a fast low-turn runner that must be dodged.
 * A stationary ship takes hits by wave 2 (verified acceptance test).
 */
const WAVES: LaunchSpec[][] = [
  [
    { yawOff: Math.PI - 0.35, elev: 0.12 },
    { yawOff: Math.PI - 0.12, elev: -0.22 },
    { yawOff: Math.PI + 0.12, elev: 0.3 },
    { yawOff: Math.PI + 0.35, elev: 0.02 },
  ],
  [
    { yawOff: -0.4, elev: 0.08 },
    { yawOff: 0.02, elev: -0.3 },
    { yawOff: 0.38, elev: 0.18 },
    { yawOff: Math.PI - 0.55, elev: 0.55 },
    { yawOff: Math.PI - 0.18, elev: -0.28 },
    { yawOff: Math.PI + 0.18, elev: 0.35 },
    { yawOff: Math.PI + 0.55, elev: -0.8 },
  ],
  [
    { yawOff: -1.5, elev: 0.1 },
    { yawOff: -1.75, elev: -0.15 },
    { yawOff: -1.3, elev: -0.3 },
    { yawOff: 1.55, elev: 0.12 },
    { yawOff: 1.8, elev: -0.1 },
    { yawOff: 1.35, elev: 0.3 },
    { yawOff: Math.PI - 0.3, elev: 0.6 },
    { yawOff: Math.PI + 0.3, elev: -0.55 },
    { yawOff: 0.05, elev: 0.25 },
    { yawOff: Math.PI, elev: 0, speedMult: 1.5, turnMult: 0.5 }, // the runner: dodge it
  ],
]
const BASE_SPEED = [95, 165, 185]
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

const _m = new Matrix4()
const _q = new Quaternion()
const _v = new Vector3()
const _color = new Color()
const _up = new Vector3(0, 1, 0)
const _perp = new Vector3()
const _dummy = new Object3D()

/**
 * Torpedo body from "Low Poly Missiles and Torpedos" by sakigakefuruzawa
 * (Sketchfab, CC BY 4.0) — one missile extracted offline
 * (scripts/extract-torpedo.mjs), float geometry (no quantization), baked here
 * to +Y-forward, ~4.6u long for our instancing convention.
 */
function useTorpedoBody(): { geometry: BufferGeometry; material: Material } {
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
    const bake = new Matrix4()
      .makeRotationX(-Math.PI / 2) // long axis Z → our +Y-forward convention
      .multiply(new Matrix4().makeScale(scale, scale, scale))
      .multiply(new Matrix4().makeTranslation(-center.x, -center.y, -center.z))
    geometry.applyMatrix4(bake)
    const material = (
      Array.isArray(source.material) ? source.material[0] : source.material
    ) as MeshStandardMaterial
    material.envMapIntensity = 1.1
    return { geometry, material }
  }, [gltf])
}

/**
 * Boundary buoy from "Sci-Fi Beacon/Way Point Marker Free Model" by
 * AMMediaGames (Sketchfab, CC BY 4.0) — baked/normalized offline
 * (scripts/build-buoy.mjs) to origin-centered, 12u tall. A ring of these at
 * the auto-start radius IS the arena boundary, runway-light style.
 */
function useBuoyBody(): { geometry: BufferGeometry; material: Material } {
  const gltf = useGLTF(BUOY_URL)
  return useMemo(() => {
    let found: Mesh | null = null
    gltf.scene.traverse((obj) => {
      const m = obj as Mesh
      if (m.isMesh && !found) found = m
    })
    const source = found as unknown as Mesh
    const material = (
      Array.isArray(source.material) ? source.material[0] : source.material
    ) as MeshStandardMaterial
    // the warning-light column should read at range (and feed the bloom)
    material.emissiveIntensity = Math.max(material.emissiveIntensity, 2.4)
    return { geometry: source.geometry, material }
  }, [gltf])
}

export function GunneryRange() {
  const torpMeshRef = useRef<InstancedMesh>(null)
  const plumeMeshRef = useRef<InstancedMesh>(null)
  const tracerMeshRef = useRef<InstancedMesh>(null)
  const strobeRefs = useRef<(Mesh | null)[]>([])
  const muzzleFlashRefs = useRef<(Sprite | null)[]>([])
  const holoRef = useRef<Group>(null)
  const buoyMeshRef = useRef<InstancedMesh>(null)
  const orbMeshRef = useRef<InstancedMesh>(null)
  const flashTexture = useMemo(() => makeFlashTexture(), [])
  const torpedoBody = useTorpedoBody()
  const buoyBody = useBuoyBody()

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
        tracked: false,
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
        targetIdx: -1,
      })),
    [],
  )

  const game = useRef({
    phase: 'idle' as Phase,
    lastPhase: 'idle' as Phase,
    wave: 0,
    kills: 0,
    hull: 3,
    veteran: false,
    nextVeteran: false,
    /** Drill just ended inside the zone — wait for an explicit re-run */
    awaitRestart: false,
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
      color: '#ffb454',
      kind: 'poi',
      position: CENTER,
      yOffset: 95,
      el: null,
      detail: 'PDC DEFENSE DRILL · AUTO-ENGAGES ON ENTRY',
      jumpStandoff: GUNNERY_POI.standoff,
    })
    labelsChanged()
    return () => {
      unregister()
      labelsChanged()
    }
  }, [])

  // Space = re-run request after a finished drill (the drill itself
  // auto-starts on zone entry — there is no arming step).
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      if (activityState.active) {
        e.preventDefault()
        ;(document.activeElement as HTMLElement | null)?.blur?.()
      }
      if (activityState.canRestart) activityState.restartRequest = true
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  useFrame(({ clock, camera }, dt) => {
    const now = clock.elapsedTime
    const g = game.current
    activityState.bannerClock = now
    const distToCenter = shipRig.position.distanceTo(CENTER)
    const inArmZone = distToCenter < ARM_RADIUS
    const battleRunning = g.phase === 'countdown' || g.phase === 'wave' || g.phase === 'breather'

    function startDrill() {
      g.phase = 'countdown'
      g.wave = 0
      g.kills = 0
      g.hull = 3
      g.veteran = g.nextVeteran
      g.armedAt = now
      g.graceUntil = 0
      g.awaitRestart = false
      g.phaseUntil = now + 3.0
      triggerKlaxon()
      activityState.banner = {
        text: g.veteran ? 'VETERAN DRILL — TORPEDOES INBOUND' : 'GUNNERY RANGE — TORPEDOES INBOUND',
        kind: 'battle',
        until: now + 2.7,
      }
      g.flashText = ''
      g.flashUntil = 0
    }

    function launchWave(t: number) {
      g.wave++
      g.phase = 'wave'
      if (g.wave > 1) triggerKlaxon()
      activityState.banner = { text: `WAVE ${g.wave} / 3`, kind: 'battle', until: t + 1.7 }
      const specs = WAVES[g.wave - 1]
      const speedBase = BASE_SPEED[g.wave - 1] * (g.veteran ? 1.35 : 1)
      const turnBase = BASE_TURN[g.wave - 1] * (g.veteran ? 1.2 : 1)
      const shipYaw = shipRig.yaw
      specs.forEach((spec, i) => {
        const torp = torpedoes[i]
        const yaw = shipYaw + spec.yawOff
        _v.set(-Math.sin(yaw), 0, -Math.cos(yaw))
        _v.y = Math.tan(spec.elev)
        _v.normalize()
        torp.position
          .copy(shipRig.position)
          .addScaledVector(_v, spec.speedMult ? SPAWN_DISTANCE * 0.8 : SPAWN_DISTANCE)
        torp.speed = speedBase * (spec.speedMult ?? 1)
        torp.turnRate = turnBase * (spec.turnMult ?? 1)
        torp.weave = g.wave === 1 || spec.speedMult ? 0 : 48
        torp.weavePhase = i * 2.1
        torp.velocity.copy(shipRig.position).sub(torp.position).normalize().multiplyScalar(torp.speed)
        torp.alive = true
        torp.launched = i === 0
        torp.launchAt = t + i * 0.15
        torp.tracked = false
      })
      for (let i = specs.length; i < TORP_POOL; i++) torpedoes[i].alive = false
    }

    function endDrill(result: 'complete' | 'failed' | 'abandoned') {
      const time = now - g.armedAt
      if (result === 'complete') {
        const clean = g.hull === 3
        let text = `${time.toFixed(1)}S`
        if (clean && !g.veteran && (g.bestTime === 0 || time < g.bestTime)) {
          g.bestTime = time
          localStorage.setItem(BEST_TIME_KEY, time.toFixed(1))
          text += ' · NEW BEST'
        }
        g.flashText = text
        g.nextVeteran = !g.veteran
        triggerFanfare()
        activityState.banner = {
          text: g.veteran ? 'VETERAN DRILL COMPLETE' : 'DRILL COMPLETE',
          kind: 'win',
          until: now + 3,
        }
        // celebration: ring of fireballs around the ship
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2
          _v.set(Math.cos(a) * 30, (Math.random() - 0.5) * 18, Math.sin(a) * 30).add(shipRig.position)
          spawnExplosion(_v, 1.1, i * 0.16)
        }
      } else if (result === 'failed') {
        g.flashText = 'DRILL ABORTED'
        activityState.banner = { text: 'HULL CRITICAL', kind: 'fail', until: now + 3 }
      } else {
        g.flashText = ''
        activityState.banner = { text: 'DRILL ABANDONED', kind: 'info', until: now + 2.2 }
      }
      g.flashUntil = now + 3
      g.phase = 'over'
      g.phaseUntil = now + 3
      g.graceUntil = 0
      g.awaitRestart = true
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
      // damage-direction indicator: where did that come from?
      _v.copy(torp.velocity).normalize().multiplyScalar(-60).add(shipRig.position)
      _v.project(camera)
      activityState.hitDirDeg = (Math.atan2(_v.x, _v.y) * 180) / Math.PI
      activityState.hitDirUntil = now + 1.0
      // fireball ON the hull + a breach that keeps venting where it hit
      _v.copy(torp.velocity).normalize().multiplyScalar(-4).add(shipRig.position)
      spawnExplosion(_v, 1.6)
      damageFx.add(torp.velocity)
      if (g.hull <= 0) {
        endDrill('failed')
      } else if (g.hull === 1) {
        activityState.banner = { text: 'HULL CRITICAL', kind: 'fail', until: now + 1.8 }
      }
    }

    // ---- drill state machine: entering the ring IS the start ----
    if (g.phase === 'idle') {
      if (!inArmZone) {
        g.awaitRestart = false
      } else if (!g.awaitRestart) {
        startDrill()
      } else if (activityState.restartRequest) {
        activityState.restartRequest = false
        startDrill()
      }
    }
    if (activityState.restartRequest && (g.phase !== 'idle' || !inArmZone)) {
      activityState.restartRequest = false
    }
    if (g.phase === 'countdown' && now >= g.phaseUntil) launchWave(now)
    if (g.phase === 'breather' && now >= g.phaseUntil) launchWave(now)
    if (g.phase === 'over' && now >= g.phaseUntil) g.phase = 'idle'

    // Breach venting tracks the wound level; patched on RETURNING to idle
    // (edge-triggered so DEV staging and the over-phase leak survive)
    if (g.phase === 'idle' && g.lastPhase !== 'idle') damageFx.clear()
    else if (g.phase !== 'idle') damageFx.severity = Math.min(1, (3 - g.hull) / 2)
    g.lastPhase = g.phase

    // Arena grace: drifting out warns loudly instead of silently cancelling
    if (battleRunning) {
      if (distToCenter > LIVE_RADIUS) {
        if (g.graceUntil === 0) g.graceUntil = now + GRACE_SECONDS
        const left = Math.max(0, g.graceUntil - now)
        activityState.banner = {
          text: `RETURN TO RANGE — ${Math.ceil(left)}S`,
          kind: 'fail',
          until: now + 0.4,
        }
        if (now >= g.graceUntil) endDrill('abandoned')
      } else if (g.graceUntil !== 0) {
        g.graceUntil = 0
      }
    }

    // ---- torpedoes: staggered launch, weaving pursuit ----
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
        g.phaseUntil = now + 4.0
        activityState.banner = { text: `WAVE ${g.wave} CLEARED`, kind: 'info', until: now + 2 }
      }
    }

    // ---- HUD state (claim the shared panel only while engaged) ----
    activityState.battle = battleRunning
    activityState.threats = battleRunning ? torpedoes : []
    const engaged = inArmZone || battleRunning || g.phase === 'over'
    if (engaged) {
      activityState.owner = 'gunnery'
      activityState.active = true
    } else if (activityState.owner === 'gunnery') {
      activityState.owner = ''
      activityState.active = false
    }
    activityState.hull = g.hull
    activityState.hullMax = 3
    activityState.wave = battleRunning ? g.wave : 0
    activityState.waveMax = 3
    activityState.canRestart = g.phase === 'idle' && inArmZone && g.awaitRestart
    if (engaged) {
      activityState.title =
        g.veteran && battleRunning ? 'PDC DEFENSE — VETERAN' : 'PDC DEFENSE DRILL'
      const coach =
        battleRunning && g.wave === 1 && g.phase === 'wave' && turretControl.locks === 0 && incoming > 0
      activityState.hint = activityState.canRestart
        ? g.nextVeteran
          ? `${IS_TOUCH ? 'TAP RE-RUN' : 'PRESS SPACE'} — VETERAN DRILL AWAITS`
          : `${IS_TOUCH ? 'TAP RE-RUN' : 'PRESS SPACE'} — RUN IT AGAIN`
        : coach
          ? `THREATS AFT — TURN THE SHIP${IS_TOUCH ? '' : ' (A / D)'}`
          : ''
      activityState.lines = [
        { label: 'BEST TIME', value: g.bestTime > 0 ? `${g.bestTime.toFixed(1)}S` : '—' },
        { label: 'KILLS', value: String(g.kills) },
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

    // TRK tags: which torpedoes have a turret locked on right now
    for (const torp of torpedoes) torp.tracked = false
    if (battleRunning) {
      for (const muzzle of turretControl.muzzles) {
        if (muzzle.targetIndex < 0) continue
        const slot = turretControl.targets[muzzle.targetIndex]
        if (!slot) continue
        const idx = targetSlots.indexOf(slot as (typeof targetSlots)[number])
        if (idx >= 0) torpedoes[idx].tracked = true
      }
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
      const torp = torpedoes[tracer.targetIdx]
      if (torp && torp.alive && torp.launched) {
        if (tracer.position.distanceTo(torp.position) < TORP_KILL_RADIUS) {
          torp.alive = false
          tracer.active = false
          g.kills++
          spawnExplosion(torp.position, 0.9)
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
          const slot = turretControl.targets[muzzle.targetIndex]
          tracer.targetIdx = targetSlots.findIndex((ts) => ts === slot)
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
        _dummy.position.addScaledVector(_v, -3.4)
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
        const s = 0.28 + Math.random() * 0.22
        sprite.scale.set(s, s, 1)
      }
    }
    // beacon strobes: staggered blink up the column
    strobeRefs.current.forEach((strobe, i) => {
      if (!strobe) return
      const pulse = Math.pow(Math.max(0, Math.sin(now * 2.4 + i * 1.1)), 14)
      const material = strobe.material as MeshBasicMaterial
      material.color.setRGB(1 + pulse * 3.4, 0.85 + pulse * 2.4, 0.45 + pulse * 0.9)
    })
    // boundary buoys: staggered strobe pulses running around the ring
    const orbMesh = orbMeshRef.current
    if (orbMesh) {
      for (let i = 0; i < BUOY_COUNT; i++) {
        const pulse = Math.pow(Math.max(0, Math.sin(now * 2.0 + i * 1.31)), 12)
        _color.setRGB(0.5 + pulse * 4.2, 0.38 + pulse * 3.0, 0.18 + pulse * 1.1)
        orbMesh.setColorAt(i, _color)
      }
      if (orbMesh.instanceColor) orbMesh.instanceColor.needsUpdate = true
    }
    // giant holo sign: always face the approaching pilot (geostationary law)
    const holo = holoRef.current
    if (holo) {
      holo.rotation.y = Math.atan2(
        shipRig.position.x - CENTER.x,
        shipRig.position.z - CENTER.z,
      )
    }
  })

  const buoyTransforms = useMemo(
    () =>
      Array.from({ length: BUOY_COUNT }, (_, i) => {
        const a = (i / BUOY_COUNT) * Math.PI * 2
        return {
          x: CENTER.x + Math.cos(a) * ARM_RADIUS,
          y: CENTER.y - 6 + Math.sin(i * 2.7) * 4,
          z: CENTER.z + Math.sin(a) * ARM_RADIUS,
          yaw: i * 2.399,
        }
      }),
    [],
  )

  // Static instance matrices for the boundary buoy ring + their strobe orbs
  useEffect(() => {
    const buoyMesh = buoyMeshRef.current
    const orbMesh = orbMeshRef.current
    if (!buoyMesh || !orbMesh) return
    buoyTransforms.forEach((t, i) => {
      _dummy.position.set(t.x, t.y, t.z)
      _dummy.rotation.set(0, t.yaw, 0)
      _dummy.scale.setScalar(1)
      _dummy.updateMatrix()
      buoyMesh.setMatrixAt(i, _dummy.matrix)
      _dummy.position.y += BUOY_LIGHT_Y
      _dummy.updateMatrix()
      orbMesh.setMatrixAt(i, _dummy.matrix)
    })
    _dummy.rotation.set(0, 0, 0)
    buoyMesh.instanceMatrix.needsUpdate = true
    orbMesh.instanceMatrix.needsUpdate = true
  }, [buoyTransforms])

  return (
    <group>
      {/* THE LANDMARK: strobed beacon column + a HUGE holographic marquee
          readable from thousands of units out, facing the pilot */}
      <group position={CENTER.toArray()}>
        <mesh>
          <cylinderGeometry args={[1.6, 2.6, 150, 8]} />
          <meshStandardMaterial color="#333b47" metalness={0.7} roughness={0.45} flatShading />
        </mesh>
        {[-40, 0, 40].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation-y={Math.PI / 4}>
            <boxGeometry args={[10, 1.6, 1.6]} />
            <meshStandardMaterial color="#242b35" metalness={0.7} roughness={0.5} flatShading />
          </mesh>
        ))}
        {[-55, -5, 45].map((y, i) => (
          <mesh
            key={y}
            position={[0, y, 0]}
            ref={(m) => {
              strobeRefs.current[i] = m
            }}
          >
            <sphereGeometry args={[1.7, 8, 8]} />
            <meshBasicMaterial color={[1, 0.85, 0.45]} toneMapped={false} />
          </mesh>
        ))}
        {/* Giant holo marquee — THE "you found a playzone" sign */}
        <group ref={holoRef} position={[0, 205, 0]}>
          <Text
            font={FONT_BOLD}
            fontSize={46}
            letterSpacing={0.16}
            color="#ffb454"
            anchorX="center"
            anchorY="middle"
            material-toneMapped={false}
            material-transparent
            fillOpacity={0.9}
          >
            GUNNERY RANGE
          </Text>
          <Text
            font={FONT_BOLD}
            fontSize={11}
            letterSpacing={0.42}
            color="#9fc4de"
            anchorX="center"
            anchorY="middle"
            position={[0, -38, 0]}
            material-toneMapped={false}
            material-transparent
            fillOpacity={0.85}
          >
            PDC DEFENSE DRILL · LIVE FIRE · AUTO-ENGAGE
          </Text>
        </group>
        {/* Close-up sign on the column, readable both sides */}
        <group position={[0, 66, 0]}>
          <mesh>
            <boxGeometry args={[54, 16, 1.6]} />
            <meshStandardMaterial color="#1a212c" metalness={0.6} roughness={0.5} flatShading />
          </mesh>
          {[1, -1].map((side) => (
            <group key={side} position={[0, 0, side * 1.0]} rotation-y={side === 1 ? 0 : Math.PI}>
              <Text
                font={FONT_BOLD}
                fontSize={6.4}
                letterSpacing={0.12}
                color="#ffb454"
                anchorX="center"
                anchorY="middle"
                position={[0, 2.4, 0.2]}
              >
                GUNNERY RANGE
              </Text>
              <Text
                font={FONT_BOLD}
                fontSize={2.4}
                letterSpacing={0.3}
                color="#8fb8d8"
                anchorX="center"
                anchorY="middle"
                position={[0, -4.4, 0.2]}
              >
                PDC DEFENSE DRILL
              </Text>
            </group>
          ))}
        </group>
        <pointLight position={[0, 80, 0]} color="#ffd9a0" intensity={5} distance={220} decay={1.7} />
      </group>

      {/* The auto-start boundary drawn with real hardware: a ring of nav
          buoys at ARM_RADIUS, strobes chasing around it runway-light style */}
      <instancedMesh
        ref={buoyMeshRef}
        args={[buoyBody.geometry, buoyBody.material, BUOY_COUNT]}
        frustumCulled={false}
      />
      <instancedMesh ref={orbMeshRef} args={[undefined, undefined, BUOY_COUNT]} frustumCulled={false}>
        <sphereGeometry args={[1.5, 8, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* Torpedoes: real missile body + brilliant drive plume + path trails */}
      <instancedMesh
        ref={torpMeshRef}
        args={[torpedoBody.geometry, torpedoBody.material, TORP_POOL]}
        frustumCulled={false}
      />
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
      <TorpedoTrails sources={torpedoes} />

      {/* Tracer streaks — thin PDC rounds, sized to the turret barrels */}
      <instancedMesh ref={tracerMeshRef} args={[undefined, undefined, TRACER_POOL]} frustumCulled={false}>
        <cylinderGeometry args={[0.045, 0.045, TRACER_LEN, 4, 1, true]} />
        <meshBasicMaterial
          color={[0.98, 0.82, 0.5]}
          transparent
          opacity={0.85}
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
            opacity={0.7}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}

      {/* Hull breaches: pinned venting vapor + embers + arc flicker */}
      <HullDamage />
    </group>
  )
}

useGLTF.preload(TORPEDO_URL)
useGLTF.preload(BUOY_URL)
