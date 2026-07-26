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
import { registerCollider } from '../../physics/gravity'
import { triggerImpact, triggerFanfare, triggerKlaxon } from '../../audio/engine'
import { spawnExplosion } from '../fx/Explosions'
import { TorpedoTrails } from '../fx/TorpedoTrails'
import { damageFx } from '../fx/HullDamage'
import { PdcRounds, createPdcFire } from '../fx/PdcRounds'
import { DRIFT_POI, WRECK_POI } from '../../config/pois'
import { FONT_BOLD } from '../boards/font'

/**
 * THE ICE ROUTE — the standing situation, running whether you fly it or not.
 *
 * The Amnia drinks; haulers bring it. So a hauler is always inbound from
 * somewhere out in the dark — a different bearing every time, because ice
 * comes from wherever the last claim was cut — and the colony's dock board
 * says who is coming. Raiders work this lane. When a convoy comes in
 * undefended you can sit off the docks and watch the colony's own batteries
 * put rounds up for her; when YOU fly out to meet her, the job is yours.
 *
 * The escort: torpedoes arrive on random bearings at random times, launched
 * from beyond anything you can see — you get trails and a direction, never a
 * shooter. Until she flips. Drive cold, no dodge left in her, that is when
 * the DRAUGR shows herself and fires the last salvo from where you can
 * finally SEE it. You do not chase her — the hauler is the job. The chase is
 * the next one, and the dockmaster posts it when the ice is in.
 *
 * You are not the gun; you are the shield's position (PDCs only reach 300u).
 */

const HAULER_URL = '/models/imiq.glb'
const RAIDER_URL = '/models/draugr.glb'
const TORPEDO_URL = '/models/torpedo.glb'

const DRIFT = new Vector3(...DRIFT_POI.position)
const WRECK = new Vector3(...WRECK_POI.position)

/** The fleet: the Nilak's sisters, named for kinds of ice and water. */
const FLEET = ['IMIQ', 'SIKU', 'QINU', 'AUNIQ', 'MASAK']

const SPAWN_DIST = 2000 // where a hauler appears out of the dark
const DOCK_DIST = 330 // her parking standoff off the colony
const WRECK_BERTH = 220 // no lane is ever cut closer than this to the Nilak
const JOIN_RADIUS = 450 // close on an inbound hauler → the job is yours
const JOIN_MIN_RANGE = 900 // ...but only while she is still out in the dark
const CONVOY_RADIUS = 1000 // wander further and she turns back
const WATCH_RANGE = 2600 // close enough to witness the colony defend a convoy
const GRACE_SECONDS = 10

const CRUISE = 62
const ACCEL = 8
const BRAKE = 12
const FLIP_SECONDS = 2.6
const TURN_RATE = 0.35

const HAULER_HULL_MAX = 8
const HAULER_HALF_LEN = 30
const HAULER_RADIUS = 10.5
const HAULER_COLLIDER = 24
const PLAYER_HIT_RADIUS = 6.5

const TORP_POOL = 18
const TORP_SPEED = 105
const TORP_TURN = 0.85
const TORP_WEAVE = 20
const RAID_FIRST = 4 // seconds after joining before the first salvo
const RAID_GAP = 7 // minimum gap between salvos
const RAID_JITTER = 5 // + up to this much, randomly
const HIDDEN_LAUNCH = 1400 // salvos come from beyond sight: trails, no shooter

const RAIDER_REVEAL_DIST = 240 // knife range: close enough to read her hull
const RAIDER_LINGER = 13 // seconds on the board before she is gone for good
const DEFENSE_RANGE = 420 // colony/hauler battery reach on an ambient run
const DEFENSE_STREAKS = 30

const DOCK_HOLD = 16
const NEXT_ARRIVAL_MIN = 22
const NEXT_ARRIVAL_JITTER = 26

const BEST_KEY = 'stellarlogs-iceroute-best-v1'

interface Torpedo {
  position: Vector3
  velocity: Vector3
  aimOffset: Vector3
  speed: number
  weavePhase: number
  alive: boolean
  launchAt: number
  launched: boolean
  tracked: boolean
  /** Ambient traffic gets shot down by the colony, not by you */
  ambient: boolean
  targetPos: Vector3
}

/** The route's own life, independent of the player */
type RoutePhase = 'void' | 'inbound' | 'docked' | 'outbound'
/** The hauler's flight profile on an inbound leg */
type FlightPhase = 'accel' | 'cruise' | 'flip' | 'brake' | 'stopped'
/** The player's involvement */
type JobPhase = 'none' | 'escort' | 'over'

const _v = new Vector3()
const _v2 = new Vector3()
const _side = new Vector3()
const _seg = new Vector3()
const _q = new Quaternion()
const _qFlip = new Quaternion()
const _up = new Vector3(0, 1, 0)
const _xAxis = new Vector3(1, 0, 0)
const _dummy = new Object3D()
const _scaleOne = new Vector3(1, 1, 1)
const _m = new Matrix4()

/** Random unit bearing whose straight lane never crosses the Nilak's grave. */
function pickBearing(out: Vector3): void {
  for (let attempt = 0; attempt < 24; attempt++) {
    const az = Math.random() * Math.PI * 2
    const el = (Math.random() - 0.5) * 0.44
    out.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).normalize()
    // distance from the wreck to the lane segment [DRIFT + out*SPAWN, DRIFT + out*DOCK]
    _v.copy(WRECK).sub(DRIFT)
    const along = Math.max(DOCK_DIST, Math.min(SPAWN_DIST, _v.dot(out)))
    _v2.copy(DRIFT).addScaledVector(out, along)
    if (_v2.distanceTo(WRECK) > WRECK_BERTH) return
  }
}

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

export function IceRoute() {
  const haulerGltf = useGLTF(HAULER_URL)
  const raiderGltf = useGLTF(RAIDER_URL)
  const haulerHull = useMemo(
    () => haulerGltf.scene.getObjectByName('hull') as Object3D,
    [haulerGltf],
  )
  const raiderHull = useMemo(() => raiderGltf.scene.getObjectByName('hull') as Object3D, [raiderGltf])
  const torpedoBody = useTorpedoBody()
  const pdcFire = useMemo(() => createPdcFire(), [])

  const haulerRef = useRef<Group>(null)
  const plumeRef = useRef<Mesh>(null)
  const raiderRef = useRef<Group>(null)
  const raiderPlumeRef = useRef<Mesh>(null)
  const torpMeshRef = useRef<InstancedMesh>(null)
  const torpPlumeRef = useRef<InstancedMesh>(null)
  const defenseMeshRef = useRef<InstancedMesh>(null)
  const boardRef = useRef<Group>(null)
  const boardTextRef = useRef<{ text: string; sync?: () => void }>(null)

  const haulerPos = useMemo(() => DRIFT.clone().addScaledVector(new Vector3(1, 0, 0), SPAWN_DIST), [])
  const haulerDir = useMemo(() => new Vector3(-1, 0, 0), [])
  const raiderPos = useMemo(() => new Vector3(), [])
  const raiderDir = useMemo(() => new Vector3(1, 0, 0), [])

  const torpedoes = useMemo<Torpedo[]>(
    () =>
      Array.from({ length: TORP_POOL }, () => ({
        position: new Vector3(),
        velocity: new Vector3(),
        aimOffset: new Vector3(),
        speed: TORP_SPEED,
        weavePhase: 0,
        alive: false,
        launchAt: 0,
        launched: false,
        tracked: false,
        ambient: false,
        targetPos: haulerPos,
      })),
    [haulerPos],
  )
  const targetSlots = useMemo(() => torpedoes.map((t) => ({ position: t.position })), [torpedoes])

  const g = useRef({
    route: 'void' as RoutePhase,
    flight: 'accel' as FlightPhase,
    job: 'none' as JobPhase,
    name: FLEET[0],
    bearing: new Vector3(1, 0, 0),
    origin: new Vector3(),
    dock: new Vector3(),
    s: 0,
    legLength: SPAWN_DIST - DOCK_DIST,
    v: 0,
    flipT: 0,
    hull: HAULER_HULL_MAX,
    playerHull: 3,
    intercepts: 0,
    salvos: 0,
    nextSalvoAt: 0,
    nextArrivalAt: 6, // the first convoy comes soon after the world loads
    holdUntil: 0,
    graceUntil: 0,
    flashUntil: 0,
    flashText: '',
    /** Draugr reveal */
    raiderUntil: 0,
    raiderFiring: false,
    /** Ambient defenders: 0 = colony batteries, 1 = the hauler's own guns */
    defender: 0,
    ambientNextAt: 0,
    /** Posted follow-up job after a successful escort */
    huntPostedUntil: 0,
    huntBearing: 0,
    best: Number(localStorage.getItem(BEST_KEY) ?? 0),
    labelName: '',
  })

  // The hauler's HUD label carries her name, so it is re-registered when the
  // fleet rotates. The collider rides her live position.
  const labelHandle = useRef<(() => void) | null>(null)
  const raiderLabel = useRef<(() => void) | null>(null)
  useEffect(() => {
    const unregisterCollider = registerCollider({
      position: haulerPos,
      radius: HAULER_COLLIDER,
    })
    return () => {
      labelHandle.current?.()
      labelHandle.current = null
      raiderLabel.current?.()
      raiderLabel.current = null
      unregisterCollider()
      labelsChanged()
    }
  }, [haulerPos])

  useEffect(() => {
    pdcFire.sources = torpedoes
    pdcFire.onKill = (idx, position) => {
      const torp = torpedoes[idx]
      if (!torp.alive) return
      torp.alive = false
      g.current.intercepts++
      spawnExplosion(position, 0.9)
    }
    if (import.meta.env.DEV) {
      const w = window as unknown as Record<string, unknown>
      w.__hauler = haulerPos
      w.__iceroute = g
      w.__raider = raiderPos
      w.__torps = torpedoes
    }
  }, [pdcFire, torpedoes, haulerPos, raiderPos])

  useFrame(({ clock, camera }, dt) => {
    const now = clock.elapsedTime
    const s = g.current
    const distToHauler = shipRig.position.distanceTo(haulerPos)
    const distToDrift = shipRig.position.distanceTo(DRIFT)
    const haulerRange = haulerPos.distanceTo(DRIFT) // how far out she still is
    const escorting = s.job === 'escort'

    // ---------- the route's own life ----------
    function beginArrival() {
      s.route = 'inbound'
      s.flight = 'accel'
      s.name = FLEET[Math.floor(Math.random() * FLEET.length)]
      pickBearing(s.bearing)
      s.origin.copy(DRIFT).addScaledVector(s.bearing, SPAWN_DIST)
      s.dock.copy(DRIFT).addScaledVector(s.bearing, DOCK_DIST)
      s.legLength = s.origin.distanceTo(s.dock)
      s.s = 0
      s.v = 0
      s.flipT = 0
      s.hull = HAULER_HULL_MAX
      s.salvos = 0
      s.defender = Math.random() < 0.5 ? 0 : 1
      s.ambientNextAt = now + 6 + Math.random() * 10
      haulerPos.copy(s.origin)
      haulerDir.copy(s.dock).sub(s.origin).normalize()
      // her name changes with the ship: re-register the label
      labelHandle.current?.()
      labelHandle.current = registerHudLabel({
        id: 'ship-hauler',
        name: s.name,
        color: '#9fd8ef',
        kind: 'poi',
        position: haulerPos,
        yOffset: 26,
        el: null,
        detail: 'ICE HAULER · INTERAMNIA REGISTRY · INBOUND',
      })
      labelsChanged()
    }

    function endArrival() {
      s.route = 'void'
      s.nextArrivalAt = now + NEXT_ARRIVAL_MIN + Math.random() * NEXT_ARRIVAL_JITTER
      labelHandle.current?.()
      labelHandle.current = null
      labelsChanged()
      for (const t of torpedoes) t.alive = false
    }

    // ---------- salvos ----------
    function fireSalvo(count: number, from: Vector3 | null, ambient: boolean) {
      let spawned = 0
      // a bearing nobody can see, unless the Draugr has shown herself
      if (!from) {
        pickBearing(_side)
        _v2.copy(haulerPos).addScaledVector(_side, HIDDEN_LAUNCH)
      } else {
        _v2.copy(from)
      }
      for (const torp of torpedoes) {
        if (torp.alive || spawned >= count) continue
        torp.position.copy(_v2)
        torp.position.x += (Math.random() - 0.5) * 90
        torp.position.y += (Math.random() - 0.5) * 60
        torp.position.z += (Math.random() - 0.5) * 90
        torp.aimOffset
          .copy(haulerDir)
          .multiplyScalar((Math.random() - 0.5) * 2 * HAULER_HALF_LEN * 0.8)
        torp.speed = TORP_SPEED * (0.92 + Math.random() * 0.16)
        torp.weavePhase = Math.random() * 6.28
        torp.velocity.copy(haulerPos).sub(torp.position).normalize().multiplyScalar(torp.speed)
        torp.alive = true
        torp.launched = false
        torp.launchAt = now + spawned * 0.3
        torp.tracked = false
        torp.ambient = ambient
        spawned++
      }
      return spawned
    }

    function raiderSalvo() {
      // She decloaks off a random bearing at knife range — and this time the
      // torpedoes come from somewhere you can SEE.
      pickBearing(_side)
      raiderPos.copy(haulerPos).addScaledVector(_side, RAIDER_REVEAL_DIST)
      raiderDir.copy(haulerPos).sub(raiderPos).normalize()
      s.raiderUntil = now + RAIDER_LINGER
      s.raiderFiring = true
      s.huntBearing = Math.round(((Math.atan2(_side.x, _side.z) * 180) / Math.PI + 360) % 360)
      fireSalvo(4, raiderPos, false)
      s.salvos++
      triggerKlaxon()
      activityState.banner = { text: 'THERE — THE DRAUGR', kind: 'battle', until: now + 2.6 }
      // A ship that runs dark is found by her transponder-less contact box,
      // not by her paint: bracket her so the pilot can actually SEE who did it.
      raiderLabel.current?.()
      raiderLabel.current = registerHudLabel({
        id: 'ship-draugr',
        name: 'DRAUGR',
        color: '#e0708f',
        kind: 'poi',
        position: raiderPos,
        yOffset: 16,
        el: null,
        detail: 'RAIDER · NO TRANSPONDER · WEAPONS FREE',
      })
      labelsChanged()
    }

    function endJob(result: 'delivered' | 'hauler-lost' | 'crippled' | 'abandoned') {
      if (result === 'delivered') {
        const kept = s.hull
        let text = `${s.name} HULL ${kept}/${HAULER_HULL_MAX}`
        if (kept > s.best) {
          s.best = kept
          localStorage.setItem(BEST_KEY, String(kept))
          text += ' · CLEANEST RUN'
        }
        s.flashText = text
        triggerFanfare()
        activityState.banner = {
          text: 'ICE DELIVERED — THE AMNIA DRINKS',
          kind: 'win',
          until: now + 3.2,
        }
        // the dockmaster posts the follow-up: somebody should go get her
        s.huntPostedUntil = now + 240
      } else if (result === 'hauler-lost') {
        s.flashText = 'THE ROUTE TAKES ANOTHER'
        activityState.banner = {
          text: `${s.name} IS GONE — ANOTHER HAULER LOST ON THIS LANE`,
          kind: 'fail',
          until: now + 3.6,
        }
        for (let i = 0; i < 5; i++) {
          _v.copy(haulerDir)
            .multiplyScalar((i - 2) * 14)
            .add(haulerPos)
          _v.y += (Math.random() - 0.5) * 8
          spawnExplosion(_v, 1.5, i * 0.22)
        }
      } else if (result === 'crippled') {
        s.flashText = 'ESCORT DOWN'
        activityState.banner = {
          text: `SHIP CRIPPLED — ${s.name} FLIES ALONE`,
          kind: 'fail',
          until: now + 3,
        }
      } else {
        s.flashText = ''
        activityState.banner = {
          text: 'ESCORT BROKEN OFF — SHE RUNS FOR THE DOCKS',
          kind: 'info',
          until: now + 2.4,
        }
      }
      s.flashUntil = now + 3.2
      s.job = 'over'
      s.holdUntil = now + 3.4
      s.graceUntil = 0
      s.raiderFiring = false
      // She is NOT cleared when the ice lands: you get to watch her burn away
      // clean, which is the whole reason the next job exists.
      if (result !== 'delivered') s.raiderUntil = 0
      for (const t of torpedoes) t.alive = false
      if (result === 'hauler-lost') endArrival()
    }

    function playerHit(torp: Torpedo) {
      torp.alive = false
      s.playerHull--
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
      if (s.playerHull <= 0) endJob('crippled')
      else
        activityState.banner = { text: 'YOU TOOK THAT ONE FOR HER', kind: 'info', until: now + 1.8 }
    }

    function haulerHit(torp: Torpedo, hitPoint: Vector3) {
      torp.alive = false
      s.hull--
      spawnExplosion(hitPoint, 1.4)
      triggerImpact()
      if (s.hull === 3 && escorting) {
        activityState.banner = { text: 'HULL FAILING — CLOSE UP', kind: 'fail', until: now + 2 }
      }
      if (s.hull <= 0) {
        if (escorting) endJob('hauler-lost')
        else endArrival()
      }
    }

    // ---------- route scheduler ----------
    if (s.route === 'void' && now >= s.nextArrivalAt) beginArrival()

    if (s.route === 'inbound') {
      const brakeDist = (s.v * s.v) / (2 * BRAKE)
      const remaining = s.legLength - s.s
      if (s.flight === 'accel') {
        s.v = Math.min(CRUISE, s.v + ACCEL * dt)
        if (s.v >= CRUISE) s.flight = 'cruise'
      }
      if (
        (s.flight === 'cruise' || s.flight === 'accel') &&
        remaining <= brakeDist + s.v * FLIP_SECONDS + 30
      ) {
        s.flight = 'flip'
        s.flipT = 0
        // drive cold, no dodge left in her: the moment the raider waits for
        if (escorting) raiderSalvo()
      }
      if (s.flight === 'flip') {
        s.flipT += dt
        if (s.flipT >= FLIP_SECONDS) s.flight = 'brake'
      }
      if (s.flight === 'brake') {
        s.v = Math.max(0, s.v - BRAKE * dt)
        if (remaining <= 2 || s.v <= 0.2) {
          s.flight = 'stopped'
          s.v = 0
          s.route = 'docked'
          s.holdUntil = now + DOCK_HOLD
          for (const t of torpedoes) {
            if (t.alive) spawnExplosion(t.position, 0.7)
            t.alive = false
          }
          if (escorting) endJob('delivered')
        }
      }
      if (s.flight !== 'stopped') {
        s.s = Math.min(s.legLength, s.s + s.v * dt)
        haulerPos.copy(s.origin).addScaledVector(s.bearing, -s.s)
        // heading follows, rate-limited: a loaded hauler never snaps
        _v.copy(s.dock).sub(haulerPos)
        if (_v.lengthSq() > 1) {
          _v.normalize()
          const ang = haulerDir.angleTo(_v)
          if (ang > 1e-4) haulerDir.lerp(_v, Math.min(1, (TURN_RATE * dt) / ang)).normalize()
        }
      }

      // ---- the raid, while the job is yours: random bearings, random times
      if (escorting && now >= s.nextSalvoAt && s.flight !== 'flip' && s.flight !== 'brake') {
        fireSalvo(2 + Math.floor(Math.random() * 3), null, false)
        s.salvos++
        s.nextSalvoAt = now + RAID_GAP + Math.random() * RAID_JITTER
        triggerKlaxon()
        activityState.banner = {
          text: 'TORPEDOES INBOUND — BEARING UNKNOWN',
          kind: 'battle',
          until: now + 2.2,
        }
      }
      // ---- ambient traffic: the lane is dangerous with or without you.
      // Close enough to watch, and she is coming in alone → the colony
      // (or her own gunner) puts rounds up, and you get to just witness it.
      if (
        !escorting &&
        s.job !== 'over' &&
        distToDrift < WATCH_RANGE &&
        haulerRange < 1500 &&
        now >= s.ambientNextAt
      ) {
        fireSalvo(2, null, true)
        s.ambientNextAt = now + 14 + Math.random() * 12
      }
    }

    if (s.route === 'docked' && now >= s.holdUntil) {
      s.route = 'outbound'
      s.flight = 'accel'
      s.v = 0
      haulerDir.copy(s.bearing) // nose back out the way she came
    }
    if (s.route === 'outbound') {
      s.v = Math.min(CRUISE, s.v + ACCEL * dt)
      haulerPos.addScaledVector(s.bearing, s.v * dt)
      if (haulerPos.distanceTo(DRIFT) > SPAWN_DIST) endArrival()
    }

    // ---------- joining the job ----------
    if (
      s.job === 'none' &&
      s.route === 'inbound' &&
      !shipRig.warping &&
      distToHauler < JOIN_RADIUS &&
      haulerRange > JOIN_MIN_RANGE
    ) {
      s.job = 'escort'
      s.playerHull = 3
      s.intercepts = 0
      s.nextSalvoAt = now + RAID_FIRST + Math.random() * 3
      // anything already in the air is yours to stop now
      for (const t of torpedoes) if (t.alive) t.ambient = false
      damageFx.clear()
      triggerKlaxon()
      activityState.banner = {
        text: `ESCORT ACCEPTED — ${s.name} INBOUND`,
        kind: 'battle',
        until: now + 3,
      }
      s.flashText = ''
      s.flashUntil = 0
    }
    if (s.job === 'over' && now >= s.holdUntil) s.job = 'none'

    // convoy discipline
    if (escorting) {
      if (distToHauler > CONVOY_RADIUS) {
        if (s.graceUntil === 0) s.graceUntil = now + GRACE_SECONDS
        activityState.banner = {
          text: `RETURN TO THE CONVOY — ${Math.ceil(Math.max(0, s.graceUntil - now))}S`,
          kind: 'fail',
          until: now + 0.4,
        }
        if (now >= s.graceUntil) endJob('abandoned')
      } else if (s.graceUntil !== 0) {
        s.graceUntil = 0
      }
      damageFx.severity = Math.min(1, (3 - s.playerHull) / 2)
    }

    // ---------- the Draugr ----------
    if (s.raiderUntil > 0) {
      if (now >= s.raiderUntil) {
        s.raiderUntil = 0
        s.raiderFiring = false
        raiderLabel.current?.()
        raiderLabel.current = null
        labelsChanged()
      } else if (now >= s.raiderUntil - RAIDER_LINGER + 3) {
        // she has fired; now she runs, hard, on her own bearing
        s.raiderFiring = false
        raiderPos.addScaledVector(raiderDir, -190 * dt)
      }
    }

    // ---------- torpedoes ----------
    let ambientLive = 0
    for (const torp of torpedoes) {
      if (!torp.alive) continue
      if (!torp.launched) {
        if (now >= torp.launchAt) torp.launched = true
        else continue
      }
      if (torp.ambient) ambientLive++
      _v.copy(haulerPos).add(torp.aimOffset).sub(torp.position).normalize()
      const wob = Math.sin(now * 2.1 + torp.weavePhase) * TORP_WEAVE
      _side.set(-_v.z, 0, _v.x).normalize()
      _v.multiplyScalar(torp.speed).addScaledVector(_side, wob)
      _v.y += Math.cos(now * 1.6 + torp.weavePhase) * TORP_WEAVE * 0.5
      _v.setLength(torp.speed)
      const maxStep = TORP_TURN * torp.speed * dt
      _v.sub(torp.velocity).clampLength(0, maxStep)
      torp.velocity.add(_v).setLength(torp.speed)
      torp.position.addScaledVector(torp.velocity, dt)

      // capsule test against the hauler
      _seg.copy(haulerDir).multiplyScalar(HAULER_HALF_LEN)
      _v2.copy(torp.position).sub(haulerPos)
      const t = Math.max(-1, Math.min(1, _v2.dot(_seg) / _seg.lengthSq()))
      _v2.copy(haulerPos).addScaledVector(_seg, t)
      if (torp.position.distanceTo(_v2) < HAULER_RADIUS) {
        haulerHit(torp, _v2)
        continue
      }
      if (escorting && torp.position.distanceTo(shipRig.position) < PLAYER_HIT_RADIUS) {
        playerHit(torp)
        continue
      }
      // ambient rounds get taken down by whoever is covering her today
      if (torp.ambient) {
        _v2.copy(s.defender === 0 ? DRIFT : haulerPos)
        if (torp.position.distanceTo(_v2) < DEFENSE_RANGE * 0.55) {
          torp.alive = false
          spawnExplosion(torp.position, 0.8)
        }
      }
    }

    // ---------- HUD ----------
    activityState.bannerClock = now
    const battle = escorting && torpedoes.some((t) => t.alive)
    const engaged = escorting || s.job === 'over' || distToDrift < WATCH_RANGE || distToHauler < 900
    if (engaged) {
      activityState.owner = 'iceroute'
      activityState.active = true
      activityState.battle = battle
      activityState.threats = battle ? torpedoes : []
      activityState.hull = s.playerHull
      activityState.hullMax = 3
      activityState.wave = battle ? s.salvos : 0
      activityState.waveMax = Math.max(s.salvos, 4)
      activityState.waveLabel = 'SALVO'
      activityState.canRestart = false
      activityState.title = escorting ? `ESCORT — ${s.name}` : 'THE ICE ROUTE'
      activityState.hint = battle
        ? 'STATION BETWEEN THE TORPEDOES AND HER HULL'
        : escorting
          ? 'HOLD FORMATION — RAIDERS WORK THIS LANE'
          : s.route === 'inbound' && haulerRange > JOIN_MIN_RANGE
            ? `${s.name} IS INBOUND — CLOSE ON HER TO TAKE THE ESCORT`
            : s.route === 'inbound'
              ? `${s.name} IS ON FINAL — THE COLONY HAS HER`
              : s.route === 'docked'
                ? `${s.name} IS ALONGSIDE — NEXT CONVOY SHORTLY`
                : 'NO CONVOY INBOUND — THE ROUTE NEVER STAYS QUIET LONG'
      activityState.lines = escorting
        ? [
            { label: s.name, value: `${s.hull}/${HAULER_HULL_MAX}` },
            { label: 'INTERCEPTS', value: String(s.intercepts) },
            { label: 'BEST', value: s.best > 0 ? `${s.best}/${HAULER_HULL_MAX}` : '—' },
          ]
        : [
            { label: 'INBOUND', value: s.route === 'inbound' ? s.name : '—' },
            {
              label: 'RANGE',
              value: s.route === 'inbound' ? `${(haulerRange / 1000).toFixed(1)}K` : '—',
            },
            { label: 'BEST', value: s.best > 0 ? `${s.best}/${HAULER_HULL_MAX}` : '—' },
          ]
      activityState.flash = now < s.flashUntil ? s.flashText : ''
      activityState.raceTarget = s.route === 'inbound' ? haulerPos : null
      activityState.raceTargetLabel = s.name
    } else if (activityState.owner === 'iceroute') {
      activityState.owner = ''
      activityState.active = false
      activityState.battle = false
      activityState.raceTarget = null
      activityState.threats = []
    }

    pdcFire.firing = battle
    if (activityState.owner === 'iceroute') {
      if (battle) {
        const targets: { position: Vector3 }[] = []
        pdcFire.slotSource.length = 0
        for (let i = 0; i < torpedoes.length; i++) {
          if (torpedoes[i].alive && torpedoes[i].launched && !torpedoes[i].ambient) {
            targets.push(targetSlots[i])
            pdcFire.slotSource.push(i)
          }
        }
        turretControl.targets = targets
        turretControl.firing = true
        turretControl.heatEnabled = true
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

    // ---------- render: hauler ----------
    const hauler = haulerRef.current
    if (hauler) {
      hauler.visible = s.route !== 'void'
      hauler.position.copy(haulerPos)
      _q.setFromUnitVectors(_xAxis, haulerDir)
      if (s.route === 'inbound' && (s.flight === 'flip' || s.flight === 'brake')) {
        const k = s.flight === 'flip' ? Math.min(1, s.flipT / FLIP_SECONDS) : 1
        const smooth = k * k * (3 - 2 * k)
        _side.crossVectors(haulerDir, _up).normalize()
        _qFlip.setFromAxisAngle(_side, Math.PI * smooth)
        _q.premultiply(_qFlip)
      }
      hauler.quaternion.copy(_q)
      const plume = plumeRef.current
      if (plume) {
        const burning =
          (s.route === 'inbound' && s.flight !== 'flip' && s.flight !== 'stopped') ||
          s.route === 'outbound'
        plume.visible = burning
        if (burning) {
          const power = s.flight === 'cruise' ? 0.45 : 1
          const flicker = power * (0.85 + Math.random() * 0.3)
          plume.scale.set(flicker, flicker * (1 + Math.random() * 0.25), flicker)
        }
      }
    }

    // ---------- render: the Draugr ----------
    const raider = raiderRef.current
    if (raider) {
      const showing = s.raiderUntil > 0
      raider.visible = showing
      if (showing) {
        raider.position.copy(raiderPos)
        _q.setFromUnitVectors(_xAxis, raiderDir)
        raider.quaternion.copy(_q)
        const rp = raiderPlumeRef.current
        if (rp) {
          const burn = !s.raiderFiring
          rp.visible = burn
          if (burn) {
            const f = 0.9 + Math.random() * 0.4
            rp.scale.set(f, f * 1.2, f)
          }
        }
      }
    }

    // ---------- render: torpedoes ----------
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

    // ---------- render: somebody else's guns ----------
    // Streams of rounds from the colony (or the hauler's own mount) walking
    // onto ambient traffic — the route defending itself while you watch.
    const defense = defenseMeshRef.current
    if (defense) {
      let n = 0
      if (ambientLive > 0) {
        _v2.copy(s.defender === 0 ? DRIFT : haulerPos)
        for (const torp of torpedoes) {
          if (!torp.alive || !torp.launched || !torp.ambient) continue
          if (torp.position.distanceTo(_v2) > DEFENSE_RANGE) continue
          _v.copy(torp.position).sub(_v2)
          const len = _v.length()
          _v.divideScalar(len)
          _q.setFromUnitVectors(_up, _v)
          for (let k = 0; k < 5 && n < DEFENSE_STREAKS; k++) {
            const along = Math.random() * len
            _dummy.position.copy(_v2).addScaledVector(_v, along)
            _dummy.position.x += (Math.random() - 0.5) * 6
            _dummy.position.y += (Math.random() - 0.5) * 6
            _dummy.position.z += (Math.random() - 0.5) * 6
            _m.compose(_dummy.position, _q, _scaleOne)
            defense.setMatrixAt(n++, _m)
          }
        }
      }
      defense.count = n
      defense.instanceMatrix.needsUpdate = true
    }

    // ---------- the dock board ----------
    const board = boardRef.current
    if (board) {
      board.rotation.y = Math.atan2(
        shipRig.position.x - (DRIFT.x + 250),
        shipRig.position.z - (DRIFT.z + 210),
      )
    }
    const boardText = boardTextRef.current
    if (boardText) {
      const line =
        now < s.huntPostedUntil
          ? `INTERDICTION POSTED · DRAUGR · LAST BEARING ${s.huntBearing}°`
          : s.route === 'inbound'
            ? `INBOUND · ${s.name} · ICE · ESCORT WANTED`
            : s.route === 'docked'
              ? `ALONGSIDE · ${s.name} · OFFLOADING`
              : 'NO TRAFFIC · NEXT CONVOY PENDING'
      if (boardText.text !== line) {
        boardText.text = line
        boardText.sync?.()
      }
    }
  })

  return (
    <group>
      {/* The hauler on today's run */}
      <group ref={haulerRef} visible={false}>
        <primitive object={haulerHull} />
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

      {/* THE DRAUGR — seen only at the flip, and only for a moment */}
      <group ref={raiderRef} visible={false}>
        <primitive object={raiderHull} />
        <mesh ref={raiderPlumeRef} position={[-9, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[1.5, 9, 8, 1, true]} />
          <meshBasicMaterial
            color={[2.6, 1.2, 2.2]}
            transparent
            opacity={0.9}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <pointLight color="#c07adf" intensity={2.4} distance={60} decay={1.7} />
      </group>

      {/* Torpedoes + their trails + our rounds */}
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

      {/* Somebody else's tracers */}
      <instancedMesh
        ref={defenseMeshRef}
        args={[undefined, undefined, DEFENSE_STREAKS]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.05, 0.05, 3.2, 4, 1, true]} />
        <meshBasicMaterial
          color={[0.95, 0.85, 0.55]}
          transparent
          opacity={0.8}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      {/* THE ICE DOCK board at the colony — where the work is posted */}
      <group ref={boardRef} position={[DRIFT.x + 250, DRIFT.y + 96, DRIFT.z + 210]}>
        <mesh>
          <boxGeometry args={[92, 26, 2]} />
          <meshStandardMaterial color="#1a212c" metalness={0.55} roughness={0.6} flatShading />
        </mesh>
        <Text
          font={FONT_BOLD}
          fontSize={9}
          letterSpacing={0.14}
          color="#9fd8ef"
          anchorX="center"
          anchorY="middle"
          position={[0, 6.5, 1.3]}
          material-toneMapped={false}
        >
          ICE DOCK
        </Text>
        <Text
          ref={boardTextRef as never}
          font={FONT_BOLD}
          fontSize={4.2}
          letterSpacing={0.2}
          color="#ffc06e"
          anchorX="center"
          anchorY="middle"
          position={[0, -4.5, 1.3]}
          material-toneMapped={false}
        >
          NO TRAFFIC · NEXT CONVOY PENDING
        </Text>
      </group>
    </group>
  )
}

useGLTF.preload(HAULER_URL)
useGLTF.preload(RAIDER_URL)
useGLTF.preload(TORPEDO_URL)
