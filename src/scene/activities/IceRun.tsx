import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, useGLTF } from '@react-three/drei'
import {
  AdditiveBlending,
  BufferGeometry,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
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
import { ICERUN_POI } from '../../config/pois'
import { IS_TOUCH } from '../../config/quality'
import { FONT_BOLD } from '../boards/font'

/**
 * F.4 — THE ICE RUN. The escort job the whole combat layer exists for (see
 * docs/roadmap.md, The Ice Route): the Imiq — the Nilak's intact sister —
 * hauls ice down the same lane that killed her sister, past the wreck,
 * into the Amnia's docks. Form on her and she departs; at the worst moment,
 * right as she flips to brake beside the Nilak, the raider strike comes —
 * torpedoes homing on HER, not you.
 *
 * The mechanic: you are not the gun, you are the shield's POSITION. PDCs
 * only engage inside their 300u range, so the skill is stationing — flying
 * your hull between the threat axes and hers and staying there while she
 * burns. Her hull is the mission; yours is your problem too.
 */

const MODEL_URL = '/models/imiq.glb'
const TORPEDO_URL = '/models/torpedo.glb'

const STAGING = new Vector3(...ICERUN_POI.position)
const ROUTE = [
  STAGING.clone(),
  new Vector3(-260, -45, -1440), // abeam the Nilak — the flip happens here
  new Vector3(-798, -34, -1590), // dock standoff at the Amnia
]
const RIDE_RADIUS = 420 // form on the Imiq inside this → convoy departs
const CONVOY_RADIUS = 1000 // wander further from her → warn, then abandon
const GRACE_SECONDS = 10
const CRUISE = 42
const ACCEL = 5
const BRAKE = 5.2
const FLIP_SECONDS = 2.6
const IMIQ_HULL_MAX = 6
const IMIQ_HALF_LEN = 30 // capsule half-length along her axis
const IMIQ_RADIUS = 10.5 // capsule radius (hit = torpedo inside this)
const PLAYER_HIT_RADIUS = 6.5
const TORP_POOL = 10
// Slower, straighter than the cert's drill birds: these are bearing-launched
// ship-killers built to gut a hauler, not dogfight a gunship — and the
// escort's terminal-defense window needs the extra second. Tuned so a
// close-following escort scrapes her through hurt; an absent one loses her.
const TORP_SPEED = 105
const TORP_TURN = 0.85
const TORP_WEAVE = 20
const BEST_KEY = 'stellarlogs-icerun-best-v1' // best Imiq hull delivered

interface Torpedo {
  position: Vector3
  velocity: Vector3
  aimOffset: Vector3
  speed: number
  turnRate: number
  weavePhase: number
  alive: boolean
  launchAt: number
  launched: boolean
  tracked: boolean
  targetPos: Vector3
}

type MissionPhase = 'idle' | 'forming' | 'run' | 'over'
type ImiqPhase = 'hold' | 'accel' | 'cruise' | 'flip' | 'brake' | 'docked'

const _v = new Vector3()
const _v2 = new Vector3()
const _side = new Vector3()
const _seg = new Vector3()
const _q = new Quaternion()
const _qFlip = new Quaternion()
const _up = new Vector3(0, 1, 0)
const _xAxis = new Vector3(1, 0, 0)
const _dummy = new Object3D()

/** Polyline helpers: total length + position/tangent at arc length s. */
const SEG_LENGTHS = ROUTE.slice(1).map((p, i) => p.distanceTo(ROUTE[i]))
const ROUTE_LENGTH = SEG_LENGTHS.reduce((a, b) => a + b, 0)
function routeAt(s: number, outPos: Vector3, outDir: Vector3): void {
  let rest = Math.max(0, Math.min(s, ROUTE_LENGTH))
  for (let i = 0; i < SEG_LENGTHS.length; i++) {
    if (rest <= SEG_LENGTHS[i] || i === SEG_LENGTHS.length - 1) {
      outDir.copy(ROUTE[i + 1]).sub(ROUTE[i]).normalize()
      outPos.copy(ROUTE[i]).addScaledVector(outDir, rest)
      return
    }
    rest -= SEG_LENGTHS[i]
  }
}

/** Same bake as the gunnery range: float geometry → +Y-forward, ~4.6u long. */
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
      .makeRotationX(-Math.PI / 2)
      .multiply(new Matrix4().makeScale(scale, scale, scale))
      .multiply(new Matrix4().makeTranslation(-center.x, -center.y, -center.z))
    geometry.applyMatrix4(bake)
    const material = (
      Array.isArray(source.material) ? source.material[0] : source.material
    ) as MeshStandardMaterial
    return { geometry, material }
  }, [gltf])
}

export function IceRun() {
  const gltf = useGLTF(MODEL_URL)
  const hullObject = useMemo(() => gltf.scene.getObjectByName('hull') as Object3D, [gltf])
  const imiqRef = useRef<Group>(null)
  const plumeRef = useRef<Mesh>(null)
  const torpMeshRef = useRef<InstancedMesh>(null)
  const torpPlumeRef = useRef<InstancedMesh>(null)
  const marqueeRef = useRef<Group>(null)
  const torpedoBody = useTorpedoBody()
  const pdcFire = useMemo(() => createPdcFire(), [])

  const imiqPos = useMemo(() => STAGING.clone(), [])
  const imiqDir = useMemo(() => new Vector3(-1, 0, 0), [])

  const torpedoes = useMemo<Torpedo[]>(
    () =>
      Array.from({ length: TORP_POOL }, () => ({
        position: new Vector3(),
        velocity: new Vector3(),
        aimOffset: new Vector3(),
        speed: TORP_SPEED,
        turnRate: TORP_TURN,
        weavePhase: 0,
        alive: false,
        launchAt: 0,
        launched: false,
        tracked: false,
        targetPos: imiqPos,
      })),
    [imiqPos],
  )
  const targetSlots = useMemo(() => torpedoes.map((t) => ({ position: t.position })), [torpedoes])

  const game = useRef({
    phase: 'idle' as MissionPhase,
    imiqPhase: 'hold' as ImiqPhase,
    s: 0, // arc length along the route
    v: 0, // Imiq speed
    flipT: 0,
    imiqHull: IMIQ_HULL_MAX,
    playerHull: 3,
    intercepts: 0,
    strikes: 0, // pulses launched this run
    phaseUntil: 0,
    graceUntil: 0,
    flashUntil: 0,
    flashText: '',
    awaitRestart: false,
    best: Number(localStorage.getItem(BEST_KEY) ?? 0),
  })

  useEffect(() => {
    const unregisterPoi = registerHudLabel({
      id: 'poi-icerun',
      name: 'THE ICE RUN',
      color: '#9fd8ef',
      kind: 'poi',
      position: STAGING,
      yOffset: 110,
      el: null,
      detail: 'ESCORT THE IMIQ TO THE AMNIA · RAIDERS ON THE ROUTE',
      jumpStandoff: ICERUN_POI.standoff,
    })
    const unregisterImiq = registerHudLabel({
      id: 'ship-imiq',
      name: 'IMIQ',
      color: '#9fd8ef',
      kind: 'poi',
      position: imiqPos,
      yOffset: 26,
      el: null,
      detail: 'F.4 HAULER · INTERAMNIA REGISTRY · SISTER OF THE NILAK',
    })
    labelsChanged()
    return () => {
      unregisterPoi()
      unregisterImiq()
      labelsChanged()
    }
  }, [imiqPos])

  // Space = re-run request once a finished run waits at the staging point
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      if (activityState.owner === 'icerun' && activityState.active) {
        e.preventDefault()
        ;(document.activeElement as HTMLElement | null)?.blur?.()
      }
      if (activityState.owner === 'icerun' && activityState.canRestart)
        activityState.restartRequest = true
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // Wire the shared PDC fire module to this escort's torpedo pool
  useEffect(() => {
    pdcFire.sources = torpedoes
    pdcFire.onKill = (idx, position) => {
      const torp = torpedoes[idx]
      if (!torp.alive) return
      torp.alive = false
      game.current.intercepts++
      spawnExplosion(position, 0.9)
    }
    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__imiq = imiqPos
      ;(window as unknown as Record<string, unknown>).__icerun = game
    }
  }, [pdcFire, torpedoes, imiqPos])

  useFrame(({ clock, camera }, dt) => {
    const now = clock.elapsedTime
    const g = game.current
    const distToImiq = shipRig.position.distanceTo(imiqPos)
    const running = g.phase === 'run'
    const strikeLive = torpedoes.some((t) => t.alive)

    function resetImiq() {
      g.imiqPhase = 'hold'
      g.s = 0
      g.v = 0
      g.flipT = 0
      imiqPos.copy(STAGING)
      imiqDir.set(-1, 0, 0)
      routeAt(0, imiqPos, imiqDir)
      for (const torp of torpedoes) torp.alive = false
    }

    function launchPulse(count: number) {
      g.strikes++
      triggerKlaxon()
      activityState.banner = {
        text: g.strikes === 1 ? 'CONTACT — TORPEDOES ON THE IMIQ' : 'SECOND SALVO — HOLD STATION',
        kind: 'battle',
        until: now + 2.4,
      }
      // raiders fire from over the horizon: a bearing off the route's side
      _side.crossVectors(_up, imiqDir).normalize()
      if (g.strikes % 2 === 0) _side.multiplyScalar(-1)
      let spawned = 0
      for (const torp of torpedoes) {
        if (torp.alive || spawned >= count) continue
        torp.position
          .copy(imiqPos)
          .addScaledVector(_side, 620 + Math.random() * 120)
          .addScaledVector(imiqDir, (Math.random() - 0.5) * 260)
        torp.position.y += (Math.random() - 0.5) * 130
        torp.aimOffset
          .copy(imiqDir)
          .multiplyScalar((Math.random() - 0.5) * 2 * IMIQ_HALF_LEN * 0.8)
        torp.speed = TORP_SPEED * (0.92 + Math.random() * 0.16)
        torp.turnRate = TORP_TURN
        torp.weavePhase = spawned * 2.3
        torp.velocity.copy(imiqPos).sub(torp.position).normalize().multiplyScalar(torp.speed)
        torp.alive = true
        torp.launched = false
        torp.launchAt = now + spawned * 0.4
        torp.tracked = false
        spawned++
      }
    }

    function endRun(result: 'delivered' | 'imiq-lost' | 'crippled' | 'abandoned') {
      if (result === 'delivered') {
        const kept = g.imiqHull
        let text = `IMIQ HULL ${kept}/${IMIQ_HULL_MAX}`
        if (kept > g.best) {
          g.best = kept
          localStorage.setItem(BEST_KEY, String(kept))
          text += ' · CLEANEST RUN'
        }
        g.flashText = text
        triggerFanfare()
        activityState.banner = {
          text: 'ICE DELIVERED — THE AMNIA DRINKS',
          kind: 'win',
          until: now + 3.2,
        }
      } else if (result === 'imiq-lost') {
        g.flashText = 'THE ROUTE TAKES ANOTHER'
        activityState.banner = {
          text: 'SHE IS GONE — SECOND HAULER LOST ON THIS ROUTE',
          kind: 'fail',
          until: now + 3.6,
        }
        for (let i = 0; i < 5; i++) {
          _v.copy(imiqDir)
            .multiplyScalar((i - 2) * 14)
            .add(imiqPos)
          _v.y += (Math.random() - 0.5) * 8
          spawnExplosion(_v, 1.5, i * 0.22)
        }
      } else if (result === 'crippled') {
        g.flashText = 'ESCORT DOWN'
        activityState.banner = {
          text: 'SHIP CRIPPLED — THE IMIQ FLIES ALONE',
          kind: 'fail',
          until: now + 3,
        }
      } else {
        g.flashText = ''
        activityState.banner = {
          text: 'ESCORT ABANDONED — SHE TURNS BACK',
          kind: 'info',
          until: now + 2.4,
        }
      }
      g.flashUntil = now + 3.2
      g.phase = 'over'
      g.phaseUntil = now + 3.4
      g.graceUntil = 0
      g.awaitRestart = true
      for (const torp of torpedoes) torp.alive = false
    }

    function playerHit(torp: Torpedo) {
      torp.alive = false
      g.playerHull--
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
      _v.copy(torp.velocity).normalize().multiplyScalar(-60).add(shipRig.position)
      _v.project(camera)
      activityState.hitDirDeg = (Math.atan2(_v.x, _v.y) * 180) / Math.PI
      activityState.hitDirUntil = now + 1.0
      _v.copy(torp.velocity).normalize().multiplyScalar(-4).add(shipRig.position)
      spawnExplosion(_v, 1.6)
      damageFx.add(torp.velocity)
      if (g.playerHull <= 0) endRun('crippled')
    }

    function imiqHit(torp: Torpedo, hitPoint: Vector3) {
      torp.alive = false
      g.imiqHull--
      spawnExplosion(hitPoint, 1.4)
      triggerImpact()
      if (g.imiqHull === 2) {
        activityState.banner = { text: 'IMIQ HULL FAILING — CLOSE UP', kind: 'fail', until: now + 2 }
      }
      if (g.imiqHull <= 0) endRun('imiq-lost')
    }

    function startForming() {
      g.phase = 'forming'
      g.phaseUntil = now + 5
      g.imiqHull = IMIQ_HULL_MAX
      g.playerHull = 3
      g.intercepts = 0
      g.strikes = 0
      g.awaitRestart = false
      resetImiq()
      triggerKlaxon()
      activityState.banner = {
        text: 'CONVOY FORMING — STATION ON THE IMIQ',
        kind: 'battle',
        until: now + 3,
      }
      g.flashText = ''
      g.flashUntil = 0
    }

    // ---- mission state machine: forming on the hauler IS the start ----
    if (g.phase === 'idle' && !shipRig.warping) {
      if (distToImiq > RIDE_RADIUS) {
        g.awaitRestart = false
      } else if (!g.awaitRestart) {
        startForming()
      } else if (activityState.owner === 'icerun' && activityState.restartRequest) {
        activityState.restartRequest = false
        startForming()
      }
    }
    if (g.phase === 'forming' && now >= g.phaseUntil) {
      g.phase = 'run'
      g.imiqPhase = 'accel'
      activityState.banner = { text: 'IMIQ UNDERWAY — THE ROUTE IS HOT', kind: 'info', until: now + 2 }
    }
    if (g.phase === 'over' && now >= g.phaseUntil) {
      g.phase = 'idle'
      damageFx.clear()
      resetImiq()
    }

    // ---- the Imiq flies her route ----
    if (running || g.phase === 'over') {
      const brakeDist = (g.v * g.v) / (2 * BRAKE)
      const remaining = ROUTE_LENGTH - g.s
      if (g.imiqPhase === 'accel') {
        g.v = Math.min(CRUISE, g.v + ACCEL * dt)
        if (g.v >= CRUISE) g.imiqPhase = 'cruise'
      }
      if (
        (g.imiqPhase === 'cruise' || g.imiqPhase === 'accel') &&
        remaining <= brakeDist + g.v * FLIP_SECONDS + 30
      ) {
        g.imiqPhase = 'flip'
        g.flipT = 0
        // the worst moment: she is beside the wreck, engines cold — CONTACT
        if (running && g.strikes === 0) launchPulse(5)
      }
      if (g.imiqPhase === 'flip') {
        g.flipT += dt
        if (g.flipT >= FLIP_SECONDS) {
          g.imiqPhase = 'brake'
          // the second salvo comes off her OTHER beam as the burn lights —
          // keyed to the braking event so it can never race the docking
          if (running && g.strikes === 1) launchPulse(4)
        }
      }
      if (g.imiqPhase === 'brake') {
        g.v = Math.max(0, g.v - BRAKE * dt)
        if (remaining <= 2 || g.v <= 0.2) {
          g.imiqPhase = 'docked'
          g.v = 0
          if (running) {
            for (const torp of torpedoes) {
              if (torp.alive) spawnExplosion(torp.position, 0.7)
              torp.alive = false
            }
            endRun('delivered')
          }
        }
      }
      if (g.imiqPhase !== 'docked' && g.imiqPhase !== 'hold') {
        g.s = Math.min(ROUTE_LENGTH, g.s + g.v * dt)
        routeAt(g.s, imiqPos, imiqDir)
      }
    }

    // ---- convoy discipline: drift too far and she turns back ----
    if (running) {
      if (distToImiq > CONVOY_RADIUS) {
        if (g.graceUntil === 0) g.graceUntil = now + GRACE_SECONDS
        const left = Math.max(0, g.graceUntil - now)
        activityState.banner = {
          text: `RETURN TO THE CONVOY — ${Math.ceil(left)}S`,
          kind: 'fail',
          until: now + 0.4,
        }
        if (now >= g.graceUntil) endRun('abandoned')
      } else if (g.graceUntil !== 0) {
        g.graceUntil = 0
      }
    }

    // ---- torpedoes: home on the Imiq; the player is only ever collateral ----
    for (const torp of torpedoes) {
      if (!torp.alive) continue
      if (!torp.launched) {
        if (now >= torp.launchAt) torp.launched = true
        else continue
      }
      _v.copy(imiqPos).add(torp.aimOffset).sub(torp.position).normalize()
      const wob = Math.sin(now * 2.1 + torp.weavePhase) * TORP_WEAVE
      _side.set(-_v.z, 0, _v.x).normalize()
      _v.multiplyScalar(torp.speed).addScaledVector(_side, wob)
      _v.y += Math.cos(now * 1.6 + torp.weavePhase) * TORP_WEAVE * 0.5
      _v.setLength(torp.speed)
      const maxStep = torp.turnRate * torp.speed * dt
      _v.sub(torp.velocity).clampLength(0, maxStep)
      torp.velocity.add(_v).setLength(torp.speed)
      torp.position.addScaledVector(torp.velocity, dt)

      if (!running) continue
      // capsule test against the hauler's hull
      _seg.copy(imiqDir).multiplyScalar(IMIQ_HALF_LEN)
      _v2.copy(torp.position).sub(imiqPos)
      const t = Math.max(-1, Math.min(1, _v2.dot(_seg) / _seg.lengthSq()))
      _v2.copy(imiqPos).addScaledVector(_seg, t)
      if (torp.position.distanceTo(_v2) < IMIQ_RADIUS) {
        imiqHit(torp, _v2)
        continue
      }
      if (torp.position.distanceTo(shipRig.position) < PLAYER_HIT_RADIUS) {
        playerHit(torp)
      }
    }

    // ---- HUD + turret feed ----
    activityState.bannerClock = now
    const battle = running && strikeLive
    const engaged =
      g.phase === 'forming' || running || g.phase === 'over' || distToImiq < RIDE_RADIUS + 220
    if (engaged) {
      activityState.owner = 'icerun'
      activityState.active = true
      activityState.battle = battle
      activityState.threats = battle ? torpedoes : []
      activityState.hull = g.playerHull
      activityState.hullMax = 3
      activityState.wave = battle ? g.strikes : 0
      activityState.waveMax = 2
      activityState.canRestart = g.phase === 'idle' && distToImiq < RIDE_RADIUS && g.awaitRestart
      activityState.title = 'THE ICE RUN — ESCORT THE IMIQ'
      activityState.hint =
        g.phase === 'idle' && !g.awaitRestart
          ? 'FORM ON THE IMIQ — THE CONVOY DEPARTS WHEN YOU ARE CLOSE'
          : activityState.canRestart
            ? `${IS_TOUCH ? 'TAP RE-RUN' : 'PRESS SPACE'} — RUN THE ROUTE AGAIN`
            : battle
              ? 'STATION BETWEEN THE TORPEDOES AND HER HULL'
              : running
                ? 'HOLD FORMATION — RAIDERS WORK THIS LANE'
                : ''
      activityState.lines = [
        { label: 'IMIQ', value: `${g.imiqHull}/${IMIQ_HULL_MAX}` },
        { label: 'INTERCEPTS', value: String(g.intercepts) },
        { label: 'BEST', value: g.best > 0 ? `${g.best}/${IMIQ_HULL_MAX}` : '—' },
      ]
      activityState.flash = now < g.flashUntil ? g.flashText : ''
      if (running || g.phase === 'forming') {
        activityState.raceTarget = imiqPos
        activityState.raceTargetLabel = 'IMIQ'
      } else {
        activityState.raceTarget = null
      }
    } else if (activityState.owner === 'icerun') {
      activityState.owner = ''
      activityState.active = false
      activityState.battle = false
      activityState.raceTarget = null
      activityState.threats = []
    }

    pdcFire.firing = battle
    if (activityState.owner === 'icerun') {
      if (battle) {
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
        turretControl.heatEnabled = true // escort duty standard: guns run hot
      } else if (turretControl.targets.length > 0) {
        turretControl.targets = []
        turretControl.firing = false
        turretControl.heatEnabled = false
      }
      for (const torp of torpedoes) torp.tracked = false
      for (const muzzle of turretControl.muzzles) {
        if (muzzle.targetIndex < 0) continue
        const idx = pdcFire.slotSource[muzzle.targetIndex]
        if (idx !== undefined && torpedoes[idx]) torpedoes[idx].tracked = true
      }
    }

    // ---- render: the Imiq (attitude + end-over-end flip) ----
    const imiq = imiqRef.current
    if (imiq) {
      imiq.position.copy(imiqPos)
      _q.setFromUnitVectors(_xAxis, imiqDir)
      if (g.imiqPhase === 'flip' || g.imiqPhase === 'brake' || g.imiqPhase === 'docked') {
        const k =
          g.imiqPhase === 'flip' ? Math.min(1, g.flipT / FLIP_SECONDS) : 1
        const smooth = k * k * (3 - 2 * k)
        _side.crossVectors(imiqDir, _up).normalize()
        _qFlip.setFromAxisAngle(_side, Math.PI * smooth)
        _q.premultiply(_qFlip)
      }
      imiq.quaternion.copy(_q)
      const plume = plumeRef.current
      if (plume) {
        const thrusting =
          g.imiqPhase === 'accel' || g.imiqPhase === 'brake' || g.imiqPhase === 'cruise'
        plume.visible = thrusting
        if (thrusting) {
          const power = g.imiqPhase === 'cruise' ? 0.45 : 1
          const flicker = power * (0.85 + Math.random() * 0.3)
          plume.scale.set(flicker, flicker * (1 + Math.random() * 0.25), flicker)
        }
      }
    }

    // ---- render: torpedoes ----
    const torpMesh = torpMeshRef.current
    const torpPlume = torpPlumeRef.current
    if (torpMesh && torpPlume) {
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
        torpPlume.setMatrixAt(n, _dummy.matrix)
        n++
      }
      torpMesh.count = n
      torpPlume.count = n
      torpMesh.instanceMatrix.needsUpdate = true
      torpPlume.instanceMatrix.needsUpdate = true
    }

    // marquee faces the pilot
    const marquee = marqueeRef.current
    if (marquee) {
      marquee.rotation.y = Math.atan2(
        shipRig.position.x - STAGING.x,
        shipRig.position.z - STAGING.z,
      )
    }
  })

  return (
    <group>
      {/* The Imiq herself — running lights burning, engines live */}
      <group ref={imiqRef} position={STAGING.toArray()}>
        <primitive object={hullObject} />
        {/* drive plume at her stern (local -X) */}
        <mesh ref={plumeRef} position={[-38, 0, 0]} rotation={[0, 0, Math.PI / 2]} visible={false}>
          <coneGeometry args={[2.6, 14, 8, 1, true]} />
          <meshBasicMaterial
            color={[2.4, 1.7, 0.9]}
            transparent
            opacity={0.85}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <pointLight position={[-42, 0, 0]} color="#ffd9a0" intensity={3} distance={90} decay={1.8} />
      </group>

      {/* Staging marquee — the ice route's departure board */}
      <group ref={marqueeRef} position={[STAGING.x, STAGING.y + 170, STAGING.z]}>
        <Text
          font={FONT_BOLD}
          fontSize={40}
          letterSpacing={0.16}
          color="#9fd8ef"
          anchorX="center"
          anchorY="middle"
          material-toneMapped={false}
          material-transparent
          fillOpacity={0.9}
        >
          THE ICE RUN
        </Text>
        <Text
          font={FONT_BOLD}
          fontSize={10.5}
          letterSpacing={0.42}
          color="#9fc4de"
          anchorX="center"
          anchorY="middle"
          position={[0, -32, 0]}
          material-toneMapped={false}
          material-transparent
          fillOpacity={0.85}
        >
          ESCORT THE IMIQ TO THE AMNIA · RAIDERS ON THE ROUTE · CONVOY AUTO-FORMS
        </Text>
      </group>

      {/* Torpedoes + trails + the shared PDC rounds */}
      <instancedMesh
        ref={torpMeshRef}
        args={[torpedoBody.geometry, torpedoBody.material, TORP_POOL]}
        frustumCulled={false}
      />
      <instancedMesh ref={torpPlumeRef} args={[undefined, undefined, TORP_POOL]} frustumCulled={false}>
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
      <PdcRounds fire={pdcFire} />
    </group>
  )
}

useGLTF.preload(MODEL_URL)
useGLTF.preload(TORPEDO_URL)
