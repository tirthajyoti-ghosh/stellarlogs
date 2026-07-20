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
 * F.1 — the PDC gunnery range: a marked practice zone in the drifting rock
 * field on the spawn→Projects corridor. Fly in, hold FIRE, and the ship's six
 * auto-tracking PDC turrets engage the target drones. 30-second time attack,
 * best score persisted. See docs/phase-f-playground.md.
 */

const CENTER = new Vector3(2600, -140, -4800)
const ZONE_RADIUS = 900 // activity wakes inside this
const VOLUME_RADIUS = 420 // drones drift inside this
const DRONE_COUNT = 12
const DRONE_HIT_RADIUS = 8
const DRONE_SPEED = 7
const ROUND_SECONDS = 30
const RESPAWN_SECONDS = 1.2
const TRACER_SPEED = 800
const TRACER_LIFE = 0.45
const TRACER_POOL = 96
const ROUNDS_PER_SEC = 22 // visible tracer rate per locked turret (CIWS shows every Nth round)
const BEST_KEY = 'stellarlogs-gunnery-best'

interface Drone {
  position: Vector3
  velocity: Vector3
  alive: boolean
  respawnAt: number
}

interface Tracer {
  position: Vector3
  velocity: Vector3
  life: number
  targetIndex: number
  active: boolean
}

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
  const droneMeshRef = useRef<InstancedMesh>(null)
  const ringMeshRef = useRef<InstancedMesh>(null)
  const tracerMeshRef = useRef<InstancedMesh>(null)
  const beaconRef = useRef<Mesh>(null)
  const flashRefs = useRef<(Sprite | null)[]>([])
  const flashState = useRef(
    Array.from({ length: 4 }, () => ({ at: new Vector3(), start: -10 })),
  )
  const flashTexture = useMemo(() => makeFlashTexture(), [])

  const drones = useMemo<Drone[]>(() => {
    let s = 777
    const rng = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      return s / 0x7fffffff
    }
    return Array.from({ length: DRONE_COUNT }, () => ({
      position: new Vector3(
        (rng() - 0.5) * 2 * VOLUME_RADIUS,
        (rng() - 0.5) * VOLUME_RADIUS,
        (rng() - 0.5) * 2 * VOLUME_RADIUS,
      )
        .clampLength(60, VOLUME_RADIUS)
        .add(CENTER),
      velocity: new Vector3((rng() - 0.5), (rng() - 0.5), (rng() - 0.5)).normalize().multiplyScalar(DRONE_SPEED),
      alive: true,
      respawnAt: 0,
    }))
  }, [])

  // Stable target-slot objects so turretControl sees live drone positions
  const targetSlots = useMemo(() => drones.map((d) => ({ position: d.position })), [drones])

  const tracers = useMemo<Tracer[]>(
    () =>
      Array.from({ length: TRACER_POOL }, () => ({
        position: new Vector3(),
        velocity: new Vector3(),
        life: 0,
        targetIndex: -1,
        active: false,
      })),
    [],
  )

  const game = useRef({
    roundActive: false,
    endAt: 0,
    cooldownUntil: 0,
    destroyed: 0,
    best: Number(localStorage.getItem(BEST_KEY) ?? 0),
    flashUntil: 0,
    flashText: '',
    fireAccum: [0, 0, 0, 0, 0, 0],
  })

  // POI label (subtle point-of-interest, not an official destination)
  useEffect(() => {
    const unregister = registerHudLabel({
      id: 'poi-gunnery',
      name: 'GUNNERY RANGE',
      color: '#9adbe8',
      kind: 'poi',
      position: CENTER,
      yOffset: 70,
      el: null,
      detail: 'PDC PRACTICE ZONE',
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
        // Space must never "click" a focused HUD button while firing
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

    // ---- zone / activity panel state ----
    activityState.active = inZone
    if (inZone) {
      activityState.title = 'GUNNERY RANGE'
      activityState.hint =
        g.roundActive || now < g.cooldownUntil ? '' : 'HOLD SPACE / CLICK — TURRETS AUTO-TRACK'
      const timeLeft = g.roundActive ? Math.max(0, g.endAt - now) : ROUND_SECONDS
      activityState.lines = [
        { label: 'TIME', value: timeLeft.toFixed(1) },
        { label: 'DESTROYED', value: String(g.destroyed) },
        { label: 'BEST', value: String(g.best) },
        { label: 'LOCKS', value: String(turretControl.locks) },
      ]
      activityState.flash = now < g.flashUntil ? g.flashText : ''
    }

    // ---- feed turrets ----
    if (inZone) {
      const targets: { position: Vector3 }[] = []
      for (let i = 0; i < drones.length; i++) if (drones[i].alive) targets.push(targetSlots[i])
      turretControl.targets = targets
      turretControl.firing = turretControl.fireIntent
    } else if (turretControl.targets.length > 0) {
      turretControl.targets = []
      turretControl.firing = false
    }

    // ---- drones drift + respawn ----
    for (const drone of drones) {
      if (!drone.alive) {
        if (now > drone.respawnAt) {
          drone.alive = true
          _v.set(Math.random() - 0.5, (Math.random() - 0.5) * 0.5, Math.random() - 0.5)
            .normalize()
            .multiplyScalar(60 + Math.random() * (VOLUME_RADIUS - 60))
          drone.position.copy(CENTER).add(_v)
        }
        continue
      }
      drone.position.addScaledVector(drone.velocity, dt)
      if (drone.position.distanceTo(CENTER) > VOLUME_RADIUS) {
        // steer softly back into the volume
        _v.copy(CENTER).sub(drone.position).normalize()
        drone.velocity.lerp(_v.multiplyScalar(DRONE_SPEED), 0.04)
      }
    }

    // ---- firing: spawn tracers from locked, spun-up turrets ----
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
          tracer.life = TRACER_LIFE
          // Map the turret's target (index into turretControl.targets) back to
          // the drone index via position identity
          const slot = turretControl.targets[muzzle.targetIndex]
          tracer.targetIndex = targetSlots.findIndex((s) => s === slot)
          tracer.position.copy(muzzle.position)
          tracer.velocity
            .copy(muzzle.direction)
            .multiplyScalar(TRACER_SPEED)
            .addScaledVector(shipRig.velocityDir, Math.min(shipRig.speed, 520))
          tracer.velocity.x += (Math.random() - 0.5) * 14
          tracer.velocity.y += (Math.random() - 0.5) * 14
          tracer.velocity.z += (Math.random() - 0.5) * 14
          // First shot starts the round
          if (!g.roundActive && now > g.cooldownUntil) {
            g.roundActive = true
            g.endAt = now + ROUND_SECONDS
            g.destroyed = 0
          }
        }
      }
    }

    // ---- tracers fly + hit-test ----
    for (const tracer of tracers) {
      if (!tracer.active) continue
      tracer.position.addScaledVector(tracer.velocity, dt)
      tracer.life -= dt
      if (tracer.life <= 0) {
        tracer.active = false
        continue
      }
      const drone = drones[tracer.targetIndex]
      if (drone?.alive && tracer.position.distanceTo(drone.position) < DRONE_HIT_RADIUS) {
        drone.alive = false
        drone.respawnAt = now + RESPAWN_SECONDS
        tracer.active = false
        if (g.roundActive) g.destroyed++
        // pop flash
        const slot = flashState.current.reduce((a, b) => (a.start < b.start ? a : b))
        slot.at.copy(drone.position)
        slot.start = now
      }
    }

    // ---- round end ----
    if (g.roundActive && now >= g.endAt) {
      g.roundActive = false
      g.cooldownUntil = now + 2.5
      g.flashUntil = now + 2.5
      if (g.destroyed > g.best) {
        g.best = g.destroyed
        localStorage.setItem(BEST_KEY, String(g.best))
        g.flashText = `NEW BEST — ${g.destroyed}`
      } else {
        g.flashText = `ROUND OVER — ${g.destroyed}`
      }
    }

    // ---- render: instanced drones / rings / tracers, beacon, flashes ----
    const droneMesh = droneMeshRef.current
    const ringMesh = ringMeshRef.current
    if (droneMesh && ringMesh) {
      drones.forEach((drone, i) => {
        _dummy.position.copy(drone.position)
        const s = drone.alive ? 1 : 0.0001
        _dummy.scale.setScalar(s)
        _dummy.rotation.set(now * 0.7 + i, now * 0.9 + i * 2, 0)
        _dummy.updateMatrix()
        droneMesh.setMatrixAt(i, _dummy.matrix)
        _dummy.rotation.set(Math.PI / 2, 0, now * 0.4 + i)
        _dummy.updateMatrix()
        ringMesh.setMatrixAt(i, _dummy.matrix)
      })
      droneMesh.instanceMatrix.needsUpdate = true
      ringMesh.instanceMatrix.needsUpdate = true
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
      const s = 8 + age * 90
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

      {/* Target drones: body + red target ring */}
      <instancedMesh ref={droneMeshRef} args={[undefined, undefined, DRONE_COUNT]} frustumCulled={false}>
        <octahedronGeometry args={[4, 0]} />
        <meshStandardMaterial
          color="#6d7683"
          metalness={0.7}
          roughness={0.35}
          emissive="#31404e"
          emissiveIntensity={0.6}
          flatShading
        />
      </instancedMesh>
      <instancedMesh ref={ringMeshRef} args={[undefined, undefined, DRONE_COUNT]} frustumCulled={false}>
        <torusGeometry args={[6.2, 0.35, 6, 24]} />
        <meshBasicMaterial color={[2.2, 0.35, 0.25]} toneMapped={false} />
      </instancedMesh>

      {/* Tracer streaks */}
      <instancedMesh ref={tracerMeshRef} args={[undefined, undefined, TRACER_POOL]} frustumCulled={false}>
        <cylinderGeometry args={[0.22, 0.22, 9, 4, 1, true]} />
        <meshBasicMaterial
          color={[3.2, 2.2, 0.9]}
          transparent
          opacity={0.9}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Impact flashes */}
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
