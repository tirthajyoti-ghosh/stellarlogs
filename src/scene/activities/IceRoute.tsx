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
import { DraugrPlumes, createDrivePower } from '../fx/DraugrPlumes'
import { DRIFT_POI, WRECK_POI } from '../../config/pois'
import { IS_TOUCH } from '../../config/quality'
import { PROBES } from '../../config/probes'
import { FONT_BOLD } from '../boards/font'

/**
 * THE AMNIA LANES — the colony's traffic, running whether you fly it or not.
 *
 * The Drift is a working port: several ships are always in the lanes at once,
 * arriving from random bearings out of the dark, docking, offloading and
 * boosting away hard enough that nobody catches them. Ice keeps a rock alive
 * so ice is most of it, but water, ore, fuel and parts come too, on three
 * different classes of hull. The dockmaster's board always has work on it —
 * finish an escort and the next ship is already inbound.
 *
 * THE DORMANT SPREAD (canon, Tirtha 2026-08-04): the Draugr seeds the dark
 * around the lane with cold torpedoes — drives off, transponders dead,
 * invisible at any range — and wakes them by tightbeam when a marked hull
 * commits to final. Each wake-up comes from wherever that part of the
 * spread was sown — a mix of bearings by construction — and nobody ever
 * sees a launch flash. The only live launch in the lane is the Draugr's
 * own finale.
 *
 * THE MARK. The Draugr chooses. Roughly a third of the hulls that enter
 * these lanes are marked at spawn — weighted by cargo, because volatiles are
 * worth boarding and ice barely is — and the rest cross in peace, every
 * time. A marked ship takes her salvos at bounded-random moments of her
 * transit, every torpedo in a salvo from one hidden origin — but each SALVO
 * wakes a different part of the spread, so waves arrive from a MIX of
 * bearings. When a marked ship COMMITS TO FINAL — the approach corridor
 * owns her now; any burn she makes is the docking burn — the Draugr shows
 * herself a kilometre off the lane and fires the finale herself: the one
 * launch anyone ever sees, and a fight the escort can actually win.
 *
 * THE APPROACH (Tirtha, 2026-08-04): a ship that has burned for days flips
 * at midpoint, days out and far off anyone's screen — so everything inbound
 * arrives TAIL-FIRST, decelerating, drive toward the docks. No theatrical
 * flip in view of the station: a newcomer sees ships slowing the way physics
 * says they must, and discovers the flip-and-burn the first time their OWN
 * jump drive performs one.
 *
 * THE CONTRACT. Jobs are taken at the AMNIA DOCKS board and nowhere else —
 * flying near a freighter is sightseeing, not employment. Accept, get her
 * intercept bearing, fly out and meet her; the escort begins at the
 * handshake. Miss her and she makes the docks without you; the board simply
 * posts the next one.
 *
 * THE SOUND LAW. Space is silent until it is yours. Ambient raids are
 * visible fireworks — torpedoes, defensive fire, detonations — with no
 * audio and no HUD engagement. What you hear is what your own hull and
 * radio carry, and both belong to your contract.
 *
 * You do not chase her. The freighter is the job; the chase is the next one,
 * and the dockmaster posts it when the cargo is in.
 */

const RAIDER_URL = '/models/draugr.glb'
const TORPEDO_URL = '/models/torpedo.glb'

/** The three classes working these lanes. Bow is +X on all of them. */
const CLASSES = [
  { url: '/models/imiq.glb', halfLen: 30, radius: 10.5, collider: 24, plumeX: -38, plume: 2.6 },
  // GS-100 salvage hauler — the battered industrial type
  { url: '/models/freighter-a.glb', halfLen: 27, radius: 10, collider: 22, plumeX: -34, plume: 2.4 },
  // long-haul star freighter — the big one
  { url: '/models/freighter-b.glb', halfLen: 37, radius: 12, collider: 27, plumeX: -46, plume: 3.0 },
]
/** Ice hulls carry the cold cargo and wear the old ice names. */
const ICE_NAMES = ['IMIQ', 'SIKU', 'QINU', 'AUNIQ', 'MASAK']
const FREIGHT_NAMES = ['BREKKA', 'TALVI', 'KOSMO', 'SAMAK', 'VANAJA', 'OYADEH']
const ICE_CARGO = ['ICE', 'ICE', 'WATER']
const FREIGHT_CARGO = ['ORE', 'FUEL', 'PARTS', 'VOLATILES', 'GRAIN', 'STEEL']
/** What the colony actually does with each delivery — you cannot drink steel. */
const CARGO_TOAST: Record<string, string> = {
  ICE: 'THE AMNIA DRINKS',
  WATER: 'THE AMNIA DRINKS',
  ORE: 'THE SMELTERS FEED',
  FUEL: 'THE TANKS RUN FULL',
  PARTS: 'THE SHOPS KEEP TURNING',
  VOLATILES: 'THE FARMS BREATHE',
  GRAIN: 'THE AMNIA EATS',
  STEEL: 'THE YARD KEEPS BUILDING',
}

const DRIFT = new Vector3(...DRIFT_POI.position)
const WRECK = new Vector3(...WRECK_POI.position)

const MAX_SHIPS = 4
const SPAWN_DIST = 9200
const DOCK_DIST = 330
const WRECK_BERTH = 220
/** you take jobs standing at the dockmaster's board, nowhere else */
const BOARD_RANGE = 620
/** a job is worth posting while she still has a real transit left */
const JOIN_MIN_RANGE = 900
/** the handshake: this close to her and the escort is on */
const RENDEZVOUS_RADIUS = 260
const CONVOY_RADIUS = 1000
const WATCH_RANGE = 2600
const DESPAWN_DIST = 9800
const GRACE_SECONDS = 10

const CRUISE = 62
const ACCEL = 8
const BRAKE = 12
const TURN_RATE = 0.35
/** Departure: she lights the drive and is simply gone. Player boost is 520. */
const BOOST_ACCEL = 95
const BOOST_MAX = 1100

const HULL_MAX = 8
const PLAYER_HIT_RADIUS = 6.5

const TORP_POOL = 18
const TORP_SPEED = 165
const TORP_TURN = 0.85
const TORP_WEAVE = 20
const HIDDEN_LAUNCH = 1700
/** the mark: how likely the Draugr wants a given cargo */
const MARK_ODDS: Record<string, number> = {
  VOLATILES: 0.6,
  FUEL: 0.5,
  PARTS: 0.4,
  ORE: 0.35,
  STEEL: 0.35,
  GRAIN: 0.3,
  ICE: 0.22,
  WATER: 0.22,
}
/** salvo scheduling for a marked hull (seconds into / between) */
const MARK_FIRST_MIN = 8
const MARK_FIRST_JITTER = 18
const MARK_GAP_MIN = 17
const MARK_GAP_JITTER = 17
/** after the handshake: a short settle, then the raid IS coming — an
 *  accepted escort is never a quiet run (Tirtha: "it's not random") */
const CONTRACT_FIRST_MIN = 6
const CONTRACT_FIRST_JITTER = 5
const CONTRACT_GAP_MIN = 13
const CONTRACT_GAP_JITTER = 8
/** waves the contract guarantees before the finale */
const CONTRACT_WAVES_MIN = 2
/** The finale fires with this much flight-time before her braking burn,
 *  from the Draugr's own position ~1 km off. The old version launched from
 *  240 units — 2.3 seconds, an execution at the dock, nothing to fight.
 *  This gives ~6 seconds of terminal PDC work while she hangs on screen. */
const FINALE_LEAD_SECONDS = 7

const RAIDER_REVEAL_DIST = 1000
const RAIDER_LINGER = 13
const DEFENSE_RANGE = 420
const DEFENSE_STREAKS = 30

const DOCK_HOLD_MIN = 12
const DOCK_HOLD_JITTER = 14
const SPAWN_GAP_MIN = 9
const SPAWN_GAP_JITTER = 18

const BEST_KEY = 'stellarlogs-iceroute-best-v1'

interface Ship {
  active: boolean
  name: string
  cargo: string
  cls: number
  phase: 'inbound' | 'docked' | 'outbound'
  flight: 'accel' | 'cruise' | 'brake' | 'stopped'
  bearing: Vector3
  origin: Vector3
  dock: Vector3
  position: Vector3
  dir: Vector3
  s: number
  legLength: number
  v: number
  hull: number
  holdUntil: number
  /** the Draugr wants this one */
  marked: boolean
  salvosLeft: number
  nextAttackAt: number
  /** where her LAST wake-up came from (kept for the hunt posting) */
  attackBearing: Vector3
  defender: number
  labelOff: (() => void) | null
  collider: { position: Vector3; radius: number }
}

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
  ambient: boolean
  /** which ship it is hunting */
  target: number
  targetPos: Vector3
}

const _v = new Vector3()
const _v2 = new Vector3()
const _side = new Vector3()
const _seg = new Vector3()
const _q = new Quaternion()
const _up = new Vector3(0, 1, 0)
const _xAxis = new Vector3(1, 0, 0)
const _dummy = new Object3D()
const _scaleOne = new Vector3(1, 1, 1)
const _m = new Matrix4()

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

const _fwd = new Vector3()

/** Random bearing whose lane never crosses the Nilak, nor pops in your face —
 *  and whose SPAWN POINT is outside the pilot's view cone whenever it is
 *  close enough that a ship appearing there could be seen appearing. The
 *  no-pop contract, applied to traffic. */
function pickBearing(out: Vector3, avoidPlayer: boolean): void {
  _fwd.set(0, 0, -1).applyQuaternion(shipRig.quaternion)
  for (let attempt = 0; attempt < 40; attempt++) {
    const az = Math.random() * Math.PI * 2
    const el = (Math.random() - 0.5) * 0.44
    out.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).normalize()
    _v.copy(WRECK).sub(DRIFT)
    const along = Math.max(DOCK_DIST, Math.min(SPAWN_DIST, _v.dot(out)))
    _v2.copy(DRIFT).addScaledVector(out, along)
    if (_v2.distanceTo(WRECK) < WRECK_BERTH) continue
    if (avoidPlayer) {
      _v2.copy(DRIFT).addScaledVector(out, SPAWN_DIST)
      const toSpawn = _v2.sub(shipRig.position)
      const d = toSpawn.length()
      if (d < 900) continue // never in the pilot's lap
      // within seeing range and inside the forward cone: try elsewhere
      if (d < 4500 && toSpawn.divideScalar(d).dot(_fwd) > 0.45) continue
    }
    return
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
    geometry.applyMatrix4(
      new Matrix4()
        .makeRotationX(-Math.PI / 2)
        .multiply(new Matrix4().makeScale(scale, scale, scale))
        .multiply(new Matrix4().makeTranslation(-center.x, -center.y, -center.z)),
    )
    const material = (
      Array.isArray(source.material) ? source.material[0] : source.material
    ) as MeshStandardMaterial
    return { geometry, material }
  }, [gltf])
}

export function IceRoute() {
  const hullA = useGLTF(CLASSES[0].url)
  const hullB = useGLTF(CLASSES[1].url)
  const hullC = useGLTF(CLASSES[2].url)
  const raiderGltf = useGLTF(RAIDER_URL)
  const raiderHull = useMemo(() => raiderGltf.scene.getObjectByName('hull') as Object3D, [raiderGltf])
  const torpedoBody = useTorpedoBody()
  const pdcFire = useMemo(() => createPdcFire(), [])

  /** One clone of every class per slot — geometry and materials are shared. */
  const slotModels = useMemo(() => {
    const sources = [hullA, hullB, hullC].map(
      (g) => g.scene.getObjectByName('hull') as Object3D,
    )
    return Array.from({ length: MAX_SHIPS }, () => sources.map((o) => o.clone()))
  }, [hullA, hullB, hullC])

  const slotRefs = useRef<(Group | null)[]>([])
  const plumeRefs = useRef<(Mesh | null)[]>([])
  const raiderRef = useRef<Group>(null)
  const raiderDrive = useMemo(() => createDrivePower(), [])
  const torpMeshRef = useRef<InstancedMesh>(null)
  const torpPlumeRef = useRef<InstancedMesh>(null)
  const defenseMeshRef = useRef<InstancedMesh>(null)
  const boardRef = useRef<Group>(null)
  const boardRows = useRef<({ text: string; sync?: () => void } | null)[]>([])

  const ships = useMemo<Ship[]>(
    () =>
      Array.from({ length: MAX_SHIPS }, () => ({
        active: false,
        name: '',
        cargo: '',
        cls: 0,
        phase: 'inbound' as const,
        flight: 'accel' as const,
        bearing: new Vector3(1, 0, 0),
        origin: new Vector3(),
        dock: new Vector3(),
        position: new Vector3(0, -99999, 0),
        dir: new Vector3(1, 0, 0),
        s: 0,
        legLength: 1,
        v: 0,
        hull: HULL_MAX,
        holdUntil: 0,
        marked: false,
        salvosLeft: 0,
        nextAttackAt: 0,
        attackBearing: new Vector3(1, 0, 0),
        defender: 0,
        labelOff: null,
        collider: { position: new Vector3(0, -99999, 0), radius: 0 },
      })),
    [],
  )
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
        target: 0,
        targetPos: new Vector3(),
      })),
    [],
  )
  const targetSlots = useMemo(() => torpedoes.map((t) => ({ position: t.position })), [torpedoes])

  const g = useRef({
    escort: -1, // slot index of the contracted ship, or -1
    offer: -1, // the job on the board in front of us, waiting on an answer
    accept: false, // one-shot: the pilot pressed accept
    job: 'none' as 'none' | 'intercept' | 'escort' | 'over',
    playerHull: 3,
    intercepts: 0,
    salvos: 0,
    finaleDone: false,
    lastRange: 0, // for the closing-rate readout on the intercept leg
    nextSpawnAt: 2,
    graceUntil: 0,
    holdUntil: 0,
    flashUntil: 0,
    flashText: '',
    raiderUntil: 0,
    raiderFiring: false,
    huntPostedUntil: 0,
    huntBearing: 0,
    best: Number(localStorage.getItem(BEST_KEY) ?? 0),
  })
  const raiderLabel = useRef<(() => void) | null>(null)
  /** the live rendezvous point the intercept marker leads to */
  const interceptPoint = useMemo(() => new Vector3(), [])

  // every slot owns a collider that rides its live position (radius 0 = idle)
  useEffect(() => {
    const offs = ships.map((s) => registerCollider(s.collider))
    return () => {
      offs.forEach((off) => off())
      ships.forEach((s) => {
        s.labelOff?.()
        s.labelOff = null
      })
      raiderLabel.current?.()
      raiderLabel.current = null
      labelsChanged()
    }
  }, [ships])

  // Accepting a contract is a decision, so it takes a keypress. G — the only
  // letter near the flight keys that nothing else has claimed.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'KeyG' || e.repeat) return
      if (g.current.offer >= 0) g.current.accept = true
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
      g.current.intercepts++
      spawnExplosion(position, 0.9)
    }
    if (PROBES) {
      const w = window as unknown as Record<string, unknown>
      w.__lanes = g
      w.__ships = ships
      w.__raider = raiderPos
      w.__torps = torpedoes
    }
  }, [pdcFire, torpedoes, ships, raiderPos])

  useFrame(({ clock, camera }, dt) => {
    const now = clock.elapsedTime
    const s = g.current
    const distToDrift = shipRig.position.distanceTo(DRIFT)
    const escorted = s.escort >= 0 ? ships[s.escort] : null
    const escorting = s.job === 'escort' && !!escorted

    // ---------- traffic ----------
    function spawn() {
      const ship = ships.find((sh) => !sh.active)
      if (!ship) return
      ship.active = true
      ship.cls = Math.floor(Math.random() * CLASSES.length)
      const ice = ship.cls === 0
      ship.name = pick(ice ? ICE_NAMES : FREIGHT_NAMES)
      ship.cargo = pick(ice ? ICE_CARGO : FREIGHT_CARGO)
      ship.phase = 'inbound'
      ship.flight = 'accel'
      pickBearing(ship.bearing, true)
      ship.origin.copy(DRIFT).addScaledVector(ship.bearing, SPAWN_DIST)
      ship.dock.copy(DRIFT).addScaledVector(ship.bearing, DOCK_DIST)
      ship.legLength = ship.origin.distanceTo(ship.dock)
      ship.position.copy(ship.origin)
      ship.dir.copy(ship.dock).sub(ship.origin).normalize()
      ship.collider.position = ship.position
      ship.collider.radius = CLASSES[ship.cls].collider
      ship.s = 0
      // She has been under way for days — nobody accelerates from zero at the
      // edge of a lane. Arrives at cruise, drive lit.
      ship.v = CRUISE
      ship.flight = 'cruise'
      ship.hull = HULL_MAX
      ship.defender = Math.random() < 0.5 ? 0 : 1
      // The mark, rolled once per hull. Unmarked ships cross in peace — that
      // quiet is worldbuilding too.
      ship.marked = Math.random() < (MARK_ODDS[ship.cargo] ?? 0.3)
      ship.salvosLeft = ship.marked ? 1 + Math.floor(Math.random() * 3) : 0
      ship.nextAttackAt = now + MARK_FIRST_MIN + Math.random() * MARK_FIRST_JITTER
      pickBearing(ship.attackBearing, false)
      ship.labelOff?.()
      ship.labelOff = registerHudLabel({
        id: `ship-${ships.indexOf(ship)}`,
        name: ship.name,
        color: '#9fd8ef',
        kind: 'poi',
        position: ship.position,
        yOffset: 26,
        el: null,
        detail: `${ship.cargo} · INTERAMNIA REGISTRY · INBOUND`,
      })
      labelsChanged()
    }

    function despawn(ship: Ship) {
      const idx = ships.indexOf(ship)
      ship.active = false
      ship.collider.radius = 0
      ship.position.set(0, -99999, 0)
      ship.labelOff?.()
      ship.labelOff = null
      labelsChanged()
      for (const t of torpedoes) if (t.target === idx) t.alive = false
      if (s.escort === idx) s.escort = -1
    }

    /** One wake-up call: every torpedo in a salvo shares one hidden origin,
     *  but each SALVO wakes a different part of the spread — a fresh random
     *  bearing every time. Waves arrive from a mix of directions. */
    function fireSalvo(count: number, from: Vector3 | null, ambient: boolean, target: number) {
      const ship = ships[target]
      if (!ship?.active) return
      if (!from) {
        pickBearing(ship.attackBearing, false)
        _v2.copy(ship.position).addScaledVector(ship.attackBearing, HIDDEN_LAUNCH)
      } else {
        _v2.copy(from)
      }
      let spawned = 0
      for (const torp of torpedoes) {
        if (torp.alive || spawned >= count) continue
        torp.position.copy(_v2)
        torp.position.x += (Math.random() - 0.5) * 90
        torp.position.y += (Math.random() - 0.5) * 60
        torp.position.z += (Math.random() - 0.5) * 90
        torp.aimOffset
          .copy(ship.dir)
          .multiplyScalar((Math.random() - 0.5) * 2 * CLASSES[ship.cls].halfLen * 0.8)
        torp.speed = TORP_SPEED * (0.92 + Math.random() * 0.16)
        torp.weavePhase = Math.random() * 6.28
        torp.velocity.copy(ship.position).sub(torp.position).normalize().multiplyScalar(torp.speed)
        torp.alive = true
        torp.launched = false
        torp.launchAt = now + spawned * 0.3
        torp.tracked = false
        torp.ambient = ambient
        torp.target = target
        spawned++
      }
    }

    function raiderSalvo(target: number) {
      const ship = ships[target]
      // Her own launch — the only one anyone ever sees. A kilometre off the
      // lane, drives lit, label burning: fight her birds while she watches.
      pickBearing(_side, false)
      raiderPos.copy(ship.position).addScaledVector(_side, RAIDER_REVEAL_DIST)
      raiderDir.copy(ship.position).sub(raiderPos).normalize()
      s.raiderUntil = now + RAIDER_LINGER
      s.raiderFiring = true
      s.huntBearing = Math.round(((Math.atan2(_side.x, _side.z) * 180) / Math.PI + 360) % 360)
      fireSalvo(4, raiderPos, false, target)
      s.salvos++
      triggerKlaxon()
      activityState.banner = { text: 'THERE — THE DRAUGR', kind: 'battle', until: now + 2.6 }
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

    function endJob(result: 'delivered' | 'lost' | 'crippled' | 'abandoned') {
      const ship = escorted
      const name = ship?.name ?? 'SHE'
      if (result === 'delivered' && ship) {
        let text = `${name} HULL ${ship.hull}/${HULL_MAX}`
        if (ship.hull > s.best) {
          s.best = ship.hull
          localStorage.setItem(BEST_KEY, String(ship.hull))
          text += ' · CLEANEST RUN'
        }
        s.flashText = text
        triggerFanfare()
        activityState.banner = {
          text: `${ship.cargo} DELIVERED — ${CARGO_TOAST[ship.cargo] ?? 'THE AMNIA HOLDS ON'}`,
          kind: 'win',
          until: now + 3.2,
        }
        s.huntPostedUntil = now + 300
      } else if (result === 'lost') {
        s.flashText = 'THE LANE TAKES ANOTHER'
        activityState.banner = {
          text: `${name} IS GONE — ANOTHER HULL LOST ON THIS LANE`,
          kind: 'fail',
          until: now + 3.6,
        }
      } else if (result === 'crippled') {
        s.flashText = 'ESCORT DOWN'
        activityState.banner = {
          text: `SHIP CRIPPLED — ${name} FLIES ALONE`,
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
      if (result !== 'delivered') s.raiderUntil = 0
      s.escort = -1
      for (const t of torpedoes) if (!t.ambient) t.alive = false
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

    function shipHit(ship: Ship, torp: Torpedo, hitPoint: Vector3) {
      torp.alive = false
      ship.hull--
      spawnExplosion(hitPoint, 1.4)
      // The Sound Law: vacuum carries nothing. You hear a hit on HER hull
      // only when she is yours — through your own radio watch.
      if (ships.indexOf(ship) === s.escort && s.job === 'escort') triggerImpact()
      if (ship.hull === 3 && ships.indexOf(ship) === s.escort) {
        activityState.banner = { text: 'HULL FAILING — CLOSE UP', kind: 'fail', until: now + 2 }
      }
      if (ship.hull <= 0) {
        for (let i = 0; i < 5; i++) {
          _v.copy(ship.dir)
            .multiplyScalar((i - 2) * 14)
            .add(ship.position)
          spawnExplosion(_v, 1.5, i * 0.22)
        }
        if (ships.indexOf(ship) === s.escort) endJob('lost')
        despawn(ship)
      }
    }

    // ---------- scheduler: the board is NEVER empty ----------
    let joinable = 0
    let activeCount = 0
    for (const ship of ships) {
      if (!ship.active) continue
      activeCount++
      if (ship.phase === 'inbound' && ship.position.distanceTo(DRIFT) > JOIN_MIN_RANGE) joinable++
    }
    if (joinable === 0 && activeCount < MAX_SHIPS) {
      spawn()
      s.nextSpawnAt = now + SPAWN_GAP_MIN + Math.random() * SPAWN_GAP_JITTER
    } else if (activeCount < MAX_SHIPS && now >= s.nextSpawnAt) {
      spawn()
      s.nextSpawnAt = now + SPAWN_GAP_MIN + Math.random() * SPAWN_GAP_JITTER
    }

    // ---------- fly every ship ----------
    for (let i = 0; i < ships.length; i++) {
      const ship = ships[i]
      if (!ship.active) continue
      const isEscort = i === s.escort && escorting

      if (ship.phase === 'inbound') {
        const brakeDist = (ship.v * ship.v) / (2 * BRAKE)
        const remaining = ship.legLength - ship.s
        if (ship.flight === 'accel') {
          ship.v = Math.min(CRUISE, ship.v + ACCEL * dt)
          if (ship.v >= CRUISE) ship.flight = 'cruise'
        }
        // The finale window opens as she commits to final: far enough out
        // that the salvo is a fight, close enough that the corridor owns her.
        const finaleAt = brakeDist + ship.v * FINALE_LEAD_SECONDS
        if (isEscort && !s.finaleDone && remaining <= finaleAt) {
          s.finaleDone = true
          raiderSalvo(i)
        }
        if (
          (ship.flight === 'cruise' || ship.flight === 'accel') &&
          remaining <= brakeDist + 30
        ) {
          ship.flight = 'brake'
        }
        if (ship.flight === 'brake') {
          ship.v = Math.max(0, ship.v - BRAKE * dt)
          if (remaining <= 2 || ship.v <= 0.2) {
            ship.flight = 'stopped'
            ship.v = 0
            ship.phase = 'docked'
            ship.holdUntil = now + DOCK_HOLD_MIN + Math.random() * DOCK_HOLD_JITTER
            for (const t of torpedoes) {
              if (t.alive && t.target === i) {
                spawnExplosion(t.position, 0.7)
                t.alive = false
              }
            }
            if (isEscort) endJob('delivered')
          }
        }
        if (ship.flight !== 'stopped') {
          ship.s = Math.min(ship.legLength, ship.s + ship.v * dt)
          ship.position.copy(ship.origin).addScaledVector(ship.bearing, -ship.s)
          _v.copy(ship.dock).sub(ship.position)
          if (_v.lengthSq() > 1) {
            _v.normalize()
            const ang = ship.dir.angleTo(_v)
            if (ang > 1e-4) ship.dir.lerp(_v, Math.min(1, (TURN_RATE * dt) / ang)).normalize()
          }
        }
        // The mark's schedule. Only marked hulls are ever attacked, only on
        // their rolled salvos, and only while somebody can see the lane (the
        // simulation gate — torpedoes nobody could witness are not simulated).
        // Contract salvos are the SAME schedule: if she is yours and the
        // handshake is done, the raid is loud and the PDCs answer; otherwise
        // her own defenses fight it silently and you may simply watch.
        const witnessed =
          distToDrift < WATCH_RANGE || ship.position.distanceTo(shipRig.position) < 2200
        if (
          ship.marked &&
          ship.salvosLeft > 0 &&
          now >= ship.nextAttackAt &&
          ship.flight !== 'brake' &&
          remaining > finaleAt + 80 &&
          witnessed
        ) {
          const isContract = i === s.escort && s.job === 'escort'
          // waves ramp: a 2-torpedo probe, then 3, then 4 — never a wall first
          const count = isContract ? Math.min(2 + s.salvos, 4) : 2 + Math.floor(Math.random() * 3)
          fireSalvo(count, null, !isContract, i)
          ship.salvosLeft--
          ship.nextAttackAt =
            now +
            (isContract
              ? CONTRACT_GAP_MIN + Math.random() * CONTRACT_GAP_JITTER
              : MARK_GAP_MIN + Math.random() * MARK_GAP_JITTER)
          if (isContract) {
            s.salvos++
            triggerKlaxon()
            activityState.banner = {
              text: 'TORPEDOES INBOUND — BEARING UNKNOWN',
              kind: 'battle',
              until: now + 2.2,
            }
          }
        }
      } else if (ship.phase === 'docked') {
        if (now >= ship.holdUntil) {
          ship.phase = 'outbound'
          ship.v = 0
          ship.dir.copy(ship.bearing)
          ship.labelOff?.()
          ship.labelOff = registerHudLabel({
            id: `ship-${i}`,
            name: ship.name,
            color: '#7f93a6',
            kind: 'poi',
            position: ship.position,
            yOffset: 26,
            el: null,
            detail: `${ship.cargo} · OUTBOUND · MAKING WAY`,
          })
          labelsChanged()
        }
      } else {
        // OUTBOUND: she lights the drive and is simply gone. Nobody catches her.
        ship.v = Math.min(BOOST_MAX, ship.v + BOOST_ACCEL * dt)
        ship.position.addScaledVector(ship.bearing, ship.v * dt)
        if (ship.position.distanceTo(DRIFT) > DESPAWN_DIST) despawn(ship)
      }
    }

    // ---------- the job machine ----------
    // A contract is taken AT THE BOARD, nowhere else. Flying near a freighter
    // is sightseeing. The board offers the dockmaster's priority: marked
    // hulls first (that is WHY escort is wanted), longest transit first.
    const distToBoard = shipRig.position.distanceTo(_v.set(DRIFT.x + 250, DRIFT.y + 100, DRIFT.z + 210))
    s.offer = -1
    if (s.job === 'none' && !shipRig.warping && distToBoard < BOARD_RANGE) {
      let bestScore = -1
      for (let i = 0; i < ships.length; i++) {
        const ship = ships[i]
        if (!ship.active || ship.phase !== 'inbound') continue
        const range = ship.position.distanceTo(DRIFT)
        if (range <= JOIN_MIN_RANGE) continue
        const score = (ship.marked ? 10000 : 0) + range
        if (score > bestScore) {
          bestScore = score
          s.offer = i
        }
      }
    }
    if (s.offer >= 0 && (s.accept || activityState.acceptRequest)) {
      const i = s.offer
      const ship = ships[i]
      s.escort = i
      s.job = 'intercept'
      s.intercepts = 0
      s.salvos = 0
      s.finaleDone = false
      s.lastRange = shipRig.position.distanceTo(ship.position)
      activityState.banner = {
        text: `CONTRACT LOGGED — INTERCEPT ${ship.name}`,
        kind: 'info',
        until: now + 3,
      }
      s.flashText = ''
      s.flashUntil = 0
    }
    s.accept = false
    activityState.acceptRequest = false
    if (s.job === 'over' && now >= s.holdUntil) s.job = 'none'

    // The intercept leg: fly out and MEET her. The marker leads her track —
    // two cheap iterations of "where will she be when I can get there".
    const intercepting = s.job === 'intercept' && !!escorted
    if (intercepting && escorted) {
      if (escorted.phase !== 'inbound') {
        // she made the docks without you — no ceremony, the lane moves on
        activityState.banner = {
          text: `${escorted.name} MADE THE DOCKS WITHOUT YOU`,
          kind: 'info',
          until: now + 2.6,
        }
        s.job = 'over'
        s.holdUntil = now + 2.6
        s.escort = -1
      } else {
        const d = shipRig.position.distanceTo(escorted.position)
        const closingSpeed = Math.max(120, shipRig.speed)
        let lead = Math.min(escorted.v * (d / closingSpeed), escorted.legLength - escorted.s - 40)
        interceptPoint.copy(escorted.position).addScaledVector(escorted.dir, Math.max(0, lead))
        const d2 = shipRig.position.distanceTo(interceptPoint)
        lead = Math.min(escorted.v * (d2 / closingSpeed), escorted.legLength - escorted.s - 40)
        interceptPoint.copy(escorted.position).addScaledVector(escorted.dir, Math.max(0, lead))

        if (d < RENDEZVOUS_RADIUS) {
          // the handshake: NOW it is an escort, and now it is loud
          s.job = 'escort'
          s.playerHull = 3
          damageFx.clear()
          for (const t of torpedoes) if (t.alive && t.target === s.escort) t.ambient = false
          // An accepted escort is never a quiet run. Whatever her ambient
          // history — even if the spread already spent itself while you stood
          // at the board deciding — the Draugr answers an escorted prize:
          // the mark is forced, the magazine restocked, the clock set short.
          escorted.marked = true
          escorted.salvosLeft = Math.max(
            escorted.salvosLeft,
            CONTRACT_WAVES_MIN + Math.floor(Math.random() * 2),
          )
          escorted.nextAttackAt = now + CONTRACT_FIRST_MIN + Math.random() * CONTRACT_FIRST_JITTER
          activityState.banner = {
            text: `${escorted.name}: "GLAD FOR THE COMPANY, BOSMANG"`,
            kind: 'win',
            until: now + 3,
          }
        }
      }
    }

    if (escorting && escorted) {
      const d = shipRig.position.distanceTo(escorted.position)
      if (d > CONVOY_RADIUS) {
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
        s.raiderFiring = false
        raiderPos.addScaledVector(raiderDir, -220 * dt)
      }
    }

    // ---------- torpedoes ----------
    for (const torp of torpedoes) {
      if (!torp.alive) continue
      const ship = ships[torp.target]
      if (!ship?.active) {
        torp.alive = false
        continue
      }
      torp.targetPos.copy(ship.position)
      if (!torp.launched) {
        if (now >= torp.launchAt) torp.launched = true
        else continue
      }
      _v.copy(ship.position).add(torp.aimOffset).sub(torp.position).normalize()
      const wob = Math.sin(now * 2.1 + torp.weavePhase) * TORP_WEAVE
      _side.set(-_v.z, 0, _v.x).normalize()
      _v.multiplyScalar(torp.speed).addScaledVector(_side, wob)
      _v.y += Math.cos(now * 1.6 + torp.weavePhase) * TORP_WEAVE * 0.5
      _v.setLength(torp.speed)
      const maxStep = TORP_TURN * torp.speed * dt
      _v.sub(torp.velocity).clampLength(0, maxStep)
      torp.velocity.add(_v).setLength(torp.speed)
      torp.position.addScaledVector(torp.velocity, dt)

      const cls = CLASSES[ship.cls]
      _seg.copy(ship.dir).multiplyScalar(cls.halfLen)
      _v2.copy(torp.position).sub(ship.position)
      const t = Math.max(-1, Math.min(1, _v2.dot(_seg) / _seg.lengthSq()))
      _v2.copy(ship.position).addScaledVector(_seg, t)
      if (torp.position.distanceTo(_v2) < cls.radius) {
        shipHit(ship, torp, _v2)
        continue
      }
      if (escorting && torp.position.distanceTo(shipRig.position) < PLAYER_HIT_RADIUS) {
        playerHit(torp)
        continue
      }
      if (torp.ambient) {
        _v2.copy(ship.defender === 0 ? DRIFT : ship.position)
        if (torp.position.distanceTo(_v2) < DEFENSE_RANGE * 0.55) {
          torp.alive = false
          spawnExplosion(torp.position, 0.8)
        }
      }
    }

    // ---------- HUD ----------
    // The Sound Law's HUD half: being NEAR the lane engages nothing. The
    // panel wakes for your contract, or when you are standing at the board
    // where jobs are taken. Ambient raids play out with no readouts at all.
    activityState.bannerClock = now
    const onContract = s.job === 'intercept' || s.job === 'escort'
    const battle = escorting && torpedoes.some((t) => t.alive && !t.ambient)
    const engaged = onContract || s.job === 'over' || distToBoard < BOARD_RANGE
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
      activityState.offer = s.offer >= 0 ? `ESCORT ${ships[s.offer].name}` : ''
      activityState.title =
        escorting && escorted
          ? `ESCORT — ${escorted.name}`
          : intercepting && escorted
            ? `CONTRACT — ${escorted.name}`
            : 'AMNIA DOCKS'
      const range = escorted ? shipRig.position.distanceTo(escorted.position) : 0
      activityState.hint = battle
        ? 'STATION BETWEEN THE TORPEDOES AND HER HULL'
        : escorting
          ? 'HOLD FORMATION — RAIDERS WORK THESE LANES'
          : intercepting
            ? 'FLY THE MARKER — MEET HER ON THE WAY IN'
            : s.offer >= 0
              ? `${ships[s.offer].name} WANTS ESCORT — ${IS_TOUCH ? 'TAP ACCEPT' : 'PRESS G'} TO TAKE HER`
              : 'TRAFFIC ON FINAL — THE COLONY HAS THEM'
      if (intercepting && escorted) {
        const closing = dt > 0 ? (s.lastRange - range) / dt : 0
        s.lastRange = range
        activityState.lines = [
          { label: escorted.name, value: `${(range / 1000).toFixed(1)}K` },
          { label: 'CLOSING', value: `${Math.max(0, Math.round(closing))} M/S` },
          {
            label: 'HER ETA',
            value: `${Math.max(0, Math.round((escorted.legLength - escorted.s) / Math.max(1, escorted.v)))}S`,
          },
        ]
      } else if (escorting && escorted) {
        activityState.lines = [
          { label: escorted.name, value: `${escorted.hull}/${HULL_MAX}` },
          {
            label: 'TO DOCK',
            value: `${((escorted.legLength - escorted.s) / 1000).toFixed(1)}K`,
          },
          { label: 'INTERCEPTS', value: String(s.intercepts) },
        ]
      } else {
        activityState.lines = [
          { label: 'IN LANE', value: String(activeCount) },
          { label: 'ON BOARD', value: s.offer >= 0 ? ships[s.offer].name : '—' },
          { label: 'BEST', value: s.best > 0 ? `${s.best}/${HULL_MAX}` : '—' },
        ]
      }
      activityState.flash = now < s.flashUntil ? s.flashText : ''
      if (escorting && escorted) {
        activityState.raceTarget = escorted.position
        activityState.raceTargetLabel = escorted.name
      } else if (intercepting && escorted) {
        activityState.raceTarget = interceptPoint
        activityState.raceTargetLabel = `MEET ${escorted.name}`
      } else {
        activityState.raceTarget = null
      }
    } else if (activityState.owner === 'iceroute') {
      activityState.owner = ''
      activityState.active = false
      activityState.battle = false
      activityState.raceTarget = null
      activityState.threats = []
      activityState.offer = ''
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

    // ---------- render: the traffic ----------
    for (let i = 0; i < ships.length; i++) {
      const ship = ships[i]
      const group = slotRefs.current[i]
      if (!group) continue
      group.visible = ship.active
      if (!ship.active) continue
      const models = slotModels[i]
      for (let m = 0; m < models.length; m++) models[m].visible = m === ship.cls
      group.position.copy(ship.position)
      // Tail-first the whole way in: she flipped at midpoint, days out,
      // nowhere near anyone's screen. Bow always points AWAY from the docks —
      // which also means she departs bow-first without ever turning in view.
      _v.copy(ship.dir)
      if (ship.phase !== 'outbound') _v.negate()
      _q.setFromUnitVectors(_xAxis, _v)
      group.quaternion.copy(_q)
      const plume = plumeRefs.current[i]
      if (plume) {
        const cls = CLASSES[ship.cls]
        const burning =
          (ship.phase === 'inbound' && ship.flight !== 'stopped') || ship.phase === 'outbound'
        plume.visible = burning
        if (burning) {
          plume.position.x = cls.plumeX
          // departure is a hard burn: the plume swells as she runs away
          const boost = ship.phase === 'outbound' ? 1 + (ship.v / BOOST_MAX) * 3.4 : 1
          // coasting in = trim burns only; the braking burn is the blaze
          const power =
            (ship.phase === 'inbound' ? (ship.flight === 'brake' ? 1.25 : 0.3) : 1) * boost
          const flicker = power * (0.85 + Math.random() * 0.3)
          plume.scale.set(
            (flicker * cls.plume) / 2.6,
            (flicker * (1 + Math.random() * 0.25) * cls.plume) / 2.6,
            (flicker * cls.plume) / 2.6,
          )
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
        // holding to shoot = station-keeping only; running = all four lit
        raiderDrive.power = s.raiderFiring ? 0.22 : 1
      } else {
        raiderDrive.power = 0
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
    const defense = defenseMeshRef.current
    if (defense) {
      let n = 0
      for (const torp of torpedoes) {
        if (!torp.alive || !torp.launched || !torp.ambient) continue
        const ship = ships[torp.target]
        if (!ship?.active) continue
        _v2.copy(ship.defender === 0 ? DRIFT : ship.position)
        const len = torp.position.distanceTo(_v2)
        if (len > DEFENSE_RANGE) continue
        _v.copy(torp.position).sub(_v2).divideScalar(len)
        _q.setFromUnitVectors(_up, _v)
        for (let k = 0; k < 5 && n < DEFENSE_STREAKS; k++) {
          _dummy.position.copy(_v2).addScaledVector(_v, Math.random() * len)
          _dummy.position.x += (Math.random() - 0.5) * 6
          _dummy.position.y += (Math.random() - 0.5) * 6
          _dummy.position.z += (Math.random() - 0.5) * 6
          _m.compose(_dummy.position, _q, _scaleOne)
          defense.setMatrixAt(n++, _m)
        }
      }
      defense.count = n
      defense.instanceMatrix.needsUpdate = true
    }

    // ---------- the dockmaster's board ----------
    const board = boardRef.current
    if (board) {
      board.rotation.y = Math.atan2(
        shipRig.position.x - (DRIFT.x + 250),
        shipRig.position.z - (DRIFT.z + 210),
      )
    }
    const rows: string[] = []
    if (now < s.huntPostedUntil)
      rows.push(`INTERDICTION · DRAUGR · LAST BEARING ${s.huntBearing}°`)
    for (const ship of ships) {
      if (!ship.active || rows.length >= 3) continue
      const range = ship.position.distanceTo(DRIFT)
      const status =
        ship.phase === 'docked'
          ? 'ALONGSIDE'
          : ship.phase === 'outbound'
            ? 'DEPARTING'
            : range > JOIN_MIN_RANGE
              ? `INBOUND ${(range / 1000).toFixed(1)}K · ESCORT WANTED`
              : 'ON FINAL'
      rows.push(`${ship.name} · ${ship.cargo} · ${status}`)
    }
    while (rows.length < 3) rows.push('')
    for (let r = 0; r < 3; r++) {
      const el = boardRows.current[r]
      if (el && el.text !== rows[r]) {
        el.text = rows[r]
        el.sync?.()
      }
    }
  })

  return (
    <group>
      {/* Traffic: one slot per hull in the lanes, every class pre-cloned */}
      {slotModels.map((models, i) => (
        <group
          key={`slot-${i}`}
          visible={false}
          ref={(el) => {
            slotRefs.current[i] = el
          }}
        >
          {models.map((obj, m) => (
            <primitive key={m} object={obj} visible={false} />
          ))}
          <mesh
            ref={(el: Mesh | null) => {
              plumeRefs.current[i] = el
            }}
            position={[-38, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            visible={false}
          >
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
        </group>
      ))}

      {/* THE DRAUGR — seen only at the braking burn, and only for a moment */}
      <group ref={raiderRef} visible={false}>
        <primitive object={raiderHull} />
        <DraugrPlumes drive={raiderDrive} />
      </group>

      {/* Torpedoes + trails + our rounds */}
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

      {/* AMNIA DOCKS — the dockmaster's board. There is always work on it. */}
      <group ref={boardRef} position={[DRIFT.x + 250, DRIFT.y + 100, DRIFT.z + 210]}>
        <mesh>
          <boxGeometry args={[104, 36, 2]} />
          <meshStandardMaterial color="#161d27" metalness={0.55} roughness={0.6} flatShading />
        </mesh>
        <Text
          font={FONT_BOLD}
          fontSize={9}
          letterSpacing={0.14}
          color="#9fd8ef"
          anchorX="center"
          anchorY="middle"
          position={[0, 12, 1.3]}
          material-toneMapped={false}
        >
          AMNIA DOCKS
        </Text>
        {[0, 1, 2].map((r) => (
          <Text
            key={r}
            ref={((el: { text: string; sync?: () => void } | null) => {
              boardRows.current[r] = el
            }) as never}
            font={FONT_BOLD}
            fontSize={4}
            letterSpacing={0.18}
            color={r === 0 ? '#ffc06e' : '#8fb8d8'}
            anchorX="center"
            anchorY="middle"
            position={[0, 1 - r * 7.5, 1.3]}
            material-toneMapped={false}
          >
            {''}
          </Text>
        ))}
      </group>
    </group>
  )
}

useGLTF.preload(CLASSES[0].url)
useGLTF.preload(CLASSES[1].url)
useGLTF.preload(CLASSES[2].url)
useGLTF.preload(RAIDER_URL)
useGLTF.preload(TORPEDO_URL)
