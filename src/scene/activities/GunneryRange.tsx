import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, useGLTF } from '@react-three/drei'
import {
  AdditiveBlending,
  BufferGeometry,
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
import { damageFx } from '../fx/HullDamage'
import { PdcRounds, createPdcFire } from '../fx/PdcRounds'
import {
  armBrain,
  createBrain,
  reportNearMiss,
  steerTorpedo,
  type TorpBrain,
  type TorpClass,
} from '../../systems/torpedoBrain'
import { GUNNERY_POI } from '../../config/pois'
import { IS_TOUCH } from '../../config/quality'
import { FONT_BOLD } from '../boards/font'

/**
 * F.1 — PDC CERTIFICATION, escort duty standard. The militia drills gunners
 * BECAUSE the ice route is dangerous (see docs/roadmap.md, The Ice Route):
 * a finite 3-wave exercise you WIN, teaching the systems the real escort
 * job (IceRun) then demands. Guns are automatic; the pilot's job is flying.
 *
 * The ladder is BEHAVIOR, not hit points — each wave is a torpedo CLASS
 * from the shared brain (systems/torpedoBrain): W1 CIVILIAN JUNK flies the
 * old tail-chase from astern (sit and learn the guns); W2 NAVAL SURPLUS
 * leads the intercept and weaves terminal (sitting starts to cost); W3
 * MIL-SPEC comes as two synchronized flights of SIX on dogleg
 * approaches with terminal corkscrews and near-miss jukes, plus the
 * runner — saturation choreography that a parked ship cannot serve.
 * Moving de-synchronizes the flights; that IS the skill. Thermal model
 * armed W3 because escort duty runs guns hot.
 */

const CENTER = new Vector3(...GUNNERY_POI.position)
const ARM_RADIUS = 1400
const LIVE_RADIUS = 2600
const GRACE_SECONDS = 10
const TORP_POOL = 14
const TORP_HIT_SHIP = 6.5
const SPAWN_DISTANCE = 600
// v3: certification trimmed to 3 waves (escort duty standard, heat armed W3)
const BEST_TIME_KEY = 'stellarlogs-defense-best-time-v3'
const TORPEDO_URL = '/models/torpedo.glb'
const BUOY_URL = '/models/buoy.glb'
const BUOY_COUNT = 22
/** Local Y of the buoy's warning-light column (12u-tall normalized model) */
const BUOY_LIGHT_Y = 3.4

interface Torpedo {
  position: Vector3
  velocity: Vector3
  brain: TorpBrain
  alive: boolean
  launchAt: number
  launched: boolean
  /** A turret currently holds a lock on this torpedo (HUD TRK tag) */
  tracked: boolean
}

type Phase = 'idle' | 'countdown' | 'wave' | 'breather' | 'over'

interface LaunchSpec {
  yawOff: number
  elev: number
  speedMult?: number
  turnMult?: number
}

/**
 * Launch AXES per wave (the spatial spread; the BEHAVIOR comes from the
 * class table below). W1: four from ASTERN so the very first act is
 * turning the ship. W2: seven split forward/astern fans. W3: twelve
 * across five axes + the fast low-turn runner — flown as flights of
 * six (see launchWave) with the thermal model ARMED (escort duty
 * standard: guns run hot, gaps must be flown).
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
    { yawOff: 2.4, elev: 0.2 },
    { yawOff: -2.4, elev: -0.18 },
    { yawOff: Math.PI, elev: 0, speedMult: 1.5, turnMult: 0.5 }, // the runner: dodge it
  ],
]
/**
 * The certification ladder — waves ARE torpedo classes. Same-night history
 * (2026-08-05): speed/count tuning alone kept plateauing because
 * more-of-the-same scales linearly and converged guns eat it ("I can
 * still almost sit and still win"). Class behavior changes the win
 * condition per wave instead: JUNK is watchable, SURPLUS leads, MIL-SPEC
 * corkscrews through the fire solution and arrives in synchronized
 * flights — the acceptance law ("a parked ship takes hits by wave 2 and
 * dies at wave 3, nearly always") is enforced by the parked/flown
 * harness runs, and the knobs are class parameters now.
 */
const JUNK: TorpClass = {
  lead: 0,
  accel: 25,
  v0: 70,
  vmax: 105,
  turn: 0.9,
  corkRadius: 0,
  corkSpin: 0,
  jukes: false,
}
const SURPLUS: TorpClass = {
  lead: 0.75,
  accel: 55,
  v0: 90,
  vmax: 200,
  turn: 1.0,
  corkRadius: 5.5,
  corkSpin: 1.8,
  jukes: false,
}
const MILSPEC: TorpClass = {
  lead: 1,
  accel: 100,
  v0: 100,
  vmax: 310,
  turn: 1.15,
  corkRadius: 12,
  corkSpin: 4.2,
  jukes: true,
}
const WAVE_CLASS = [JUNK, SURPLUS, MILSPEC]
const WAVE_NAMES = ['CIVILIAN JUNK', 'NAVAL SURPLUS', 'MIL-SPEC SALVO']

const _q = new Quaternion()
const _v = new Vector3()
const _color = new Color()
const _up = new Vector3(0, 1, 0)
const _perp = new Vector3()
const _dummy = new Object3D()
/** ship world velocity, rebuilt each frame for the intercept solutions */
const _tv = new Vector3()
const _dog = new Vector3()

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
  const strobeRefs = useRef<(Mesh | null)[]>([])
  const holoRef = useRef<Group>(null)
  const buoyMeshRef = useRef<InstancedMesh>(null)
  const orbMeshRef = useRef<InstancedMesh>(null)
  const torpedoBody = useTorpedoBody()
  const buoyBody = useBuoyBody()
  const pdcFire = useMemo(() => createPdcFire(), [])

  const torpedoes = useMemo<Torpedo[]>(
    () =>
      Array.from({ length: TORP_POOL }, () => ({
        position: new Vector3(),
        velocity: new Vector3(),
        brain: createBrain(),
        alive: false,
        launchAt: 0,
        launched: false,
        tracked: false,
      })),
    [],
  )
  const targetSlots = useMemo(() => torpedoes.map((t) => ({ position: t.position })), [torpedoes])

  const game = useRef({
    phase: 'idle' as Phase,
    lastPhase: 'idle' as Phase,
    wave: 0,
    kills: 0,
    hull: 3,
    veteran: false,
    nextVeteran: false,
    /** First-overheat coach shown this run */
    heatWarned: false,
    /** Drill just ended inside the zone — wait for an explicit re-run */
    armedAt: 0,
    bestTime: Number(localStorage.getItem(BEST_TIME_KEY) ?? 0),
    phaseUntil: 0,
    graceUntil: 0,
    flashUntil: 0,
    flashText: '',
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
      detail: 'PDC CERTIFICATION · ESCORT DUTY STANDARD · AUTO-ENGAGES',
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

  // Wire the shared PDC fire module to this drill's torpedo pool
  // Consent key, mirroring the docks board: G accepts what the panel offers.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'KeyG' || e.repeat) return
      if (activityState.owner === 'gunnery' && activityState.offer !== '') {
        activityState.acceptRequest = true
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    pdcFire.sources = torpedoes
    pdcFire.onKill = (idx, position) => {
      const torp = torpedoes[idx]
      if (!torp.alive) return
      torp.alive = false
      game.current.kills++
      spawnExplosion(position, 0.9)
    }
    // the duel: rounds that pass close make a juking class flinch
    pdcFire.onNearMiss = (idx) => {
      const torp = torpedoes[idx]
      if (torp.alive && torp.launched) reportNearMiss(torp.brain, torp.velocity)
    }
  }, [pdcFire, torpedoes])

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
      g.heatWarned = false
      g.veteran = g.nextVeteran
      g.armedAt = now
      g.graceUntil = 0
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
      activityState.banner = {
        // the class name is the drill's fiction AND its difficulty telegraph
        text: `WAVE ${g.wave} / ${WAVES.length} — ${WAVE_NAMES[g.wave - 1]}`,
        kind: 'battle',
        until: t + 1.7,
      }
      const specs = WAVES[g.wave - 1]
      const base = WAVE_CLASS[g.wave - 1]
      // veteran drills run the same classes hotter
      const cls: TorpClass = g.veteran
        ? {
            ...base,
            v0: base.v0 * 1.2,
            vmax: base.vmax * 1.35,
            accel: base.accel * 1.35,
            turn: base.turn * 1.2,
          }
        : base
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
        // the runner keeps its identity: much faster, half the steering,
        // no corkscrew — the one you dodge, not out-shoot
        const tc: TorpClass =
          spec.speedMult || spec.turnMult
            ? {
                ...cls,
                v0: cls.v0 * (spec.speedMult ?? 1),
                vmax: cls.vmax * (spec.speedMult ?? 1),
                accel: cls.accel * (spec.speedMult ?? 1),
                turn: cls.turn * (spec.turnMult ?? 1),
                corkRadius: 0,
                jukes: false,
              }
            : cls
        // W3 flies as two flights of SIX: one torpedo per turret, so the
        // guns cannot double-team anything while the quad… hexad is in
        // terminal. Equal spawn range and equal dogleg length keep a
        // flight's arrival synchronized, the doglegs fan the TERMINAL
        // bearings away from the launch axes, and the flights land 5 s
        // apart — two coordinated slams that a parked ship eats
        // simultaneously and a moving ship smears apart. (Three flights
        // of four measured 2026-08-05: zero leaks — six turrets eat four
        // torpedoes trivially. Saturation must MATCH the mount count.)
        const flight = Math.floor(i / 6)
        let dogleg: Vector3 | null = null
        if (g.wave >= 3 && !spec.speedMult) {
          _perp.crossVectors(_v, _up)
          if (_perp.lengthSq() < 1e-6) _perp.set(1, 0, 0)
          _perp.normalize()
          _q.setFromAxisAngle(_v, i * 2.4)
          _perp.applyQuaternion(_q)
          dogleg = _dog
            .copy(shipRig.position)
            .addScaledVector(_v, SPAWN_DISTANCE * 0.55)
            .addScaledVector(_perp, 280)
        }
        armBrain(torp.brain, tc, {
          boost: 0.5 + Math.random() * 0.3,
          dogleg,
          corkPhase: i * 2.1,
        })
        torp.velocity.copy(shipRig.position).sub(torp.position).normalize().multiplyScalar(tc.v0)
        torp.alive = true
        torp.launched = i === 0
        // 3.5 s between hexads: the second slam arrives while the guns are
        // still clearing the first's jukers — parked has no recovery beat
        torp.launchAt = g.wave >= 3 ? t + flight * 3.5 + (i % 6) * 0.1 : t + i * 0.15
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

    // ---- drill state machine: the drill starts on the pilot's WORD ----
    // Entering the ring used to start it automatically; that died with the
    // docks-board rework (Tirtha, 2026-08-04: everything combat is taken
    // deliberately, like a job). The ring wakes the panel and posts the
    // offer; G / touch-ACCEPT / the old re-run request all count as consent.
    // Never while warping — a brachistochrone transit through the ring is
    // passage, not consent.
    if (g.phase === 'idle' && !shipRig.warping && inArmZone) {
      if (activityState.acceptRequest || activityState.restartRequest) {
        activityState.acceptRequest = false
        activityState.restartRequest = false
        startDrill()
      }
    }
    // Only consume a stale re-run request if it was OURS to consume — another
    // activity's Space press must survive this frame (owner-gated, or the
    // range silently eats every other zone's restart).
    if (
      activityState.restartRequest &&
      (activityState.owner === 'gunnery' || activityState.owner === '') &&
      (g.phase !== 'idle' || !inArmZone)
    ) {
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

    // ---- torpedoes: staggered launch, brain-steered pursuit ----
    _tv.copy(shipRig.velocityDir).multiplyScalar(shipRig.speed)
    let incoming = 0
    for (const torp of torpedoes) {
      if (!torp.alive) continue
      if (!torp.launched) {
        if (now >= torp.launchAt) torp.launched = true
        else {
          // queued is still incoming: with W3's flights 5 s apart, a wave
          // must not read "clear" between flight A dying and flight B
          // leaving the rail (measured doing exactly that: 17-kill
          // "completion" 4.6 s into W3)
          incoming++
          continue
        }
      }
      incoming++
      steerTorpedo(torp.brain, torp.position, torp.velocity, shipRig.position, _tv, dt)
      torp.position.addScaledVector(torp.velocity, dt)
      if (g.phase === 'wave' && torp.position.distanceTo(shipRig.position) < TORP_HIT_SHIP) {
        shipHit(torp)
        if (g.phase !== 'wave') break
        incoming--
      }
    }
    if (g.phase === 'wave' && incoming === 0) {
      if (g.wave >= WAVES.length) {
        endDrill('complete')
      } else {
        g.phase = 'breather'
        g.phaseUntil = now + 4.0
        activityState.banner = { text: `WAVE ${g.wave} CLEARED`, kind: 'info', until: now + 2 }
      }
    }

    // ---- HUD state (claim the shared panel only while engaged) ----
    // EVERY write below is owner-gated: the range and the escort both feed
    // the same battle HUD, and an idle activity that keeps writing `battle`
    // and `threats` every frame silently blanks whichever one is live.
    const engaged = inArmZone || battleRunning || g.phase === 'over'
    if (engaged) {
      activityState.owner = 'gunnery'
      activityState.active = true
      activityState.battle = battleRunning
      activityState.threats = battleRunning ? torpedoes : []
      activityState.hull = g.hull
      activityState.hullMax = 3
      activityState.wave = battleRunning ? g.wave : 0
      activityState.waveMax = WAVES.length
      activityState.waveLabel = 'WAVE'
      const offering = g.phase === 'idle' && inArmZone && !shipRig.warping
      activityState.canRestart = false
      activityState.offer = offering ? 'PDC CERTIFICATION' : ''
      activityState.title =
        g.veteran && battleRunning ? 'MILITIA CERT — VETERAN' : 'MILITIA PDC CERTIFICATION'
      const coach =
        battleRunning && g.wave === 1 && g.phase === 'wave' && turretControl.locks === 0 && incoming > 0
      activityState.hint = offering
        ? g.nextVeteran
          ? `VETERAN DRILL LOADED — ${IS_TOUCH ? 'TAP ACCEPT' : 'PRESS G'} TO RUN IT`
          : `RANGE COLD — ${IS_TOUCH ? 'TAP ACCEPT' : 'PRESS G'} TO RUN THE DRILL`
        : coach
          ? `THREATS AFT — TURN THE SHIP${IS_TOUCH ? '' : ' (A / D)'}`
          : ''
      activityState.lines = [
        { label: 'BEST TIME', value: g.bestTime > 0 ? `${g.bestTime.toFixed(1)}S` : '—' },
        { label: 'KILLS', value: String(g.kills) },
      ]
      activityState.flash = now < g.flashUntil ? g.flashText : ''
    } else if (activityState.owner === 'gunnery') {
      activityState.owner = ''
      activityState.active = false
      activityState.battle = false
      activityState.threats = []
      activityState.canRestart = false
      activityState.offer = ''
    }

    // ---- feed turrets: guns are AUTOMATIC while the drill runs ----
    // The final wave arms the thermal model: escort duty runs guns hot
    pdcFire.firing = battleRunning
    if (battleRunning) {
      const targets: { position: Vector3 }[] = []
      pdcFire.slotSource.length = 0
      for (let i = 0; i < torpedoes.length; i++) {
        if (torpedoes[i].alive && torpedoes[i].launched) {
          targets.push(targetSlots[i])
          pdcFire.slotSource.push(i)
        }
      }
      turretControl.targets = targets
      turretControl.firing = true
      turretControl.heatEnabled = g.wave >= 3
      // one-time coach the first time a mount cooks off
      if (!g.heatWarned && turretControl.muzzles.some((m) => m.overheated)) {
        g.heatWarned = true
        activityState.banner = { text: 'PDC OVERHEAT — COVER THE GAPS', kind: 'fail', until: now + 2.2 }
      }
    } else if (turretControl.targets.length > 0) {
      turretControl.targets = []
      turretControl.firing = false
      turretControl.heatEnabled = false
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
            PDC CERTIFICATION — ESCORT DUTY STANDARD · AUTO-ENGAGE
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
                MILITIA CERTIFICATION
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

      {/* PDC rounds: real projectiles, converging spray, visible misses */}
      <PdcRounds fire={pdcFire} />
    </group>
  )
}

useGLTF.preload(TORPEDO_URL)
useGLTF.preload(BUOY_URL)
