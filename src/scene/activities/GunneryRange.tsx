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
import { turretControl } from '../../state/turretControl'
import { activityState } from '../../state/activityState'
import { registerHudLabel } from '../../hud/hudState'
import { labelsChanged } from '../../hud/LabelLayer'

/**
 * F.1 v2 — TORPEDO DEFENSE. PDCs doing their real job: waves of torpedoes
 * home on the ship; the auto-tracking turrets engage whatever their arcs
 * cover, so the GAMEPLAY IS FLYING — face your batteries at the threat axis,
 * split coverage when a wave comes from two bearings, and dodge the leakers
 * (torpedo turn rate is capped: a hard lateral boost makes them overshoot).
 * One hit ends the drill. Deepest wave cleared is the persisted best.
 * See docs/phase-f-playground.md (v2 section).
 */

const CENTER = new Vector3(-300, -60, -500)
const ZONE_RADIUS = 900
const TORP_POOL = 12
const TORP_HIT_SHIP = 6 // torpedo reaches the ship
const TORP_KILL_RADIUS = 7 // tracer proximity that intercepts a torpedo
const SPAWN_DISTANCE = 700
const TRACER_SPEED = 800
const TRACER_LIFE = 0.45
const TRACER_LEN = 6
const TRACER_POOL = 96
const ROUNDS_PER_SEC = 15
const BEST_KEY = 'stellarlogs-defense-best'

const waveCount = (wave: number) => Math.min(2 + wave, 9)
const waveSpeed = (wave: number) => Math.min(45 + wave * 10, 120)
const waveTurnRate = (wave: number) => Math.min(0.9 + wave * 0.08, 1.5)

interface Torpedo {
  position: Vector3
  velocity: Vector3
  alive: boolean
  /** staggered launch time (absolute clock seconds) */
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
const _up = new Vector3(0, 1, 0)
const _dummy = new Object3D()

export function GunneryRange() {
  const torpMeshRef = useRef<InstancedMesh>(null)
  const plumeMeshRef = useRef<InstancedMesh>(null)
  const tracerMeshRef = useRef<InstancedMesh>(null)
  const beaconRef = useRef<Mesh>(null)
  const flashRefs = useRef<(Sprite | null)[]>([])
  const muzzleFlashRefs = useRef<(Sprite | null)[]>([])
  const flashState = useRef(Array.from({ length: 4 }, () => ({ at: new Vector3(), start: -10 })))
  const flashTexture = useMemo(() => makeFlashTexture(), [])

  const torpedoes = useMemo<Torpedo[]>(
    () =>
      Array.from({ length: TORP_POOL }, () => ({
        position: new Vector3(),
        velocity: new Vector3(),
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
    best: Number(localStorage.getItem(BEST_KEY) ?? 0),
    phaseUntil: 0,
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

  // Fire intent: Space held, or pointer held on the canvas while in the zone
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
    const inZone = shipRig.position.distanceTo(CENTER) < ZONE_RADIUS

    // ---- drill state machine ----
    if (!inZone && g.phase !== 'idle') {
      endDrill(false)
    }
    if (inZone && g.phase === 'idle' && turretControl.fireIntent) {
      g.phase = 'countdown'
      g.wave = 0
      g.kills = 0
      g.phaseUntil = now + 1.6
      g.flashText = 'INCOMING'
      g.flashUntil = now + 1.6
    }
    if (g.phase === 'countdown' && now >= g.phaseUntil) launchWave(now)
    if (g.phase === 'breather' && now >= g.phaseUntil) launchWave(now)
    if (g.phase === 'over' && now >= g.phaseUntil) g.phase = 'idle'

    function launchWave(t: number) {
      g.wave++
      g.phase = 'wave'
      const n = waveCount(g.wave)
      const speed = waveSpeed(g.wave)
      for (let i = 0; i < n; i++) {
        const torp = torpedoes[i]
        _v.set(Math.random() - 0.5, (Math.random() - 0.5) * 0.6, Math.random() - 0.5)
          .normalize()
          .multiplyScalar(SPAWN_DISTANCE)
        torp.position.copy(shipRig.position).add(_v)
        torp.velocity.copy(shipRig.position).sub(torp.position).normalize().multiplyScalar(speed)
        torp.alive = true
        torp.launched = i === 0
        torp.launchAt = t + i * 1.0
      }
      for (let i = n; i < TORP_POOL; i++) torpedoes[i].alive = false
      g.flashText = `WAVE ${g.wave}`
      g.flashUntil = t + 1.4
    }

    function endDrill(hit: boolean) {
      const cleared = g.phase === 'wave' ? g.wave - 1 : g.wave
      if (g.phase !== 'idle' && g.phase !== 'over') {
        if (cleared > g.best) {
          g.best = cleared
          localStorage.setItem(BEST_KEY, String(g.best))
          g.flashText = hit ? `HIT — NEW BEST ${cleared}` : `NEW BEST ${cleared}`
        } else {
          g.flashText = hit ? `HIT — ${cleared} WAVES CLEARED` : `${cleared} WAVES CLEARED`
        }
        g.flashUntil = now + 3
        g.phase = 'over'
        g.phaseUntil = now + 3
        for (const torp of torpedoes) torp.alive = false
        if (hit) {
          document.body.dataset.hit = '1'
          setTimeout(() => {
            delete document.body.dataset.hit
          }, 650)
        }
      }
    }

    // ---- torpedoes: launch stagger, homing with capped turn rate ----
    let incoming = 0
    const turnRate = waveTurnRate(g.wave)
    for (const torp of torpedoes) {
      if (!torp.alive) continue
      if (!torp.launched) {
        if (now >= torp.launchAt) torp.launched = true
        else continue
      }
      incoming++
      const speed = torp.velocity.length()
      _v.copy(shipRig.position).sub(torp.position).normalize()
      // steer toward the ship, turn rate capped so dodging works
      const desired = _v.multiplyScalar(speed)
      const maxStep = turnRate * speed * dt
      _v.copy(desired).sub(torp.velocity).clampLength(0, maxStep)
      torp.velocity.add(_v).setLength(speed)
      torp.position.addScaledVector(torp.velocity, dt)

      if (g.phase === 'wave' && torp.position.distanceTo(shipRig.position) < TORP_HIT_SHIP) {
        endDrill(true)
        break
      }
    }
    if (g.phase === 'wave' && incoming === 0) {
      // all torpedoes of this wave intercepted
      g.phase = 'breather'
      g.phaseUntil = now + 2.4
      g.flashText = `WAVE ${g.wave} CLEARED`
      g.flashUntil = now + 2
    }

    // ---- HUD panel ----
    activityState.active = inZone
    if (inZone) {
      activityState.title = 'PDC DEFENSE DRILL'
      activityState.hint = g.phase === 'idle' ? 'HOLD SPACE / CLICK TO BEGIN — TURRETS AUTO-TRACK' : ''
      activityState.lines = [
        { label: 'WAVE', value: String(g.wave) },
        { label: 'INCOMING', value: String(incoming) },
        { label: 'KILLS', value: String(g.kills) },
        { label: 'BEST', value: String(g.best) },
      ]
      activityState.flash = now < g.flashUntil ? g.flashText : ''
    }

    // ---- feed turrets ----
    if (inZone) {
      const targets: { position: Vector3 }[] = []
      for (let i = 0; i < torpedoes.length; i++) {
        if (torpedoes[i].alive && torpedoes[i].launched) targets.push(targetSlots[i])
      }
      turretControl.targets = targets
      turretControl.firing = turretControl.fireIntent
    } else if (turretControl.targets.length > 0) {
      turretControl.targets = []
      turretControl.firing = false
    }

    // ---- tracers: integrate EXISTING rounds first (spawn-frame rounds must
    // render at the muzzle), then hit-test, then spawn this frame's rounds ----
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
          break
        }
      }
    }

    const shooting = inZone && turretControl.firing && turretControl.spin > 0.85
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
          tracer.velocity.x += (Math.random() - 0.5) * 12
          tracer.velocity.y += (Math.random() - 0.5) * 12
          tracer.velocity.z += (Math.random() - 0.5) * 12
          // tail-anchored: streak head starts half a length past the muzzle tip
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
        // plume sits behind the body, pointing backward, flickering
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
    // muzzle flashes anchor every burst to the physical guns
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
      const s = 5 + age * 42
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

      {/* Intercept flashes */}
      {[0, 1, 2, 3].map((i) => (
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
