import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import {
  AdditiveBlending,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three'
import { shipRig } from '../../state/shipRig'
import { turretControl } from '../../state/turretControl'
import { activityState, say } from '../../state/activityState'
import { registerHudLabel } from '../../hud/hudState'
import { spawnExplosion } from '../fx/Explosions'
import { PdcRounds, createPdcFire } from '../fx/PdcRounds'
import { useRockVariants } from '../Asteroids'
import { GUNNERY_POI } from '../../config/pois'
import { PROBES } from '../../config/probes'
import { FONT_BOLD } from '../boards/font'

/**
 * SLAG SKEET (docs/the-neighborhood.md — the toy layer's test case).
 *
 * The range's off-duty game: a smelter mass driver lobs still-cooling slag
 * across the line and your PDCs eat it. Lore-native on every axis — the
 * slag is real waste, the driver is real industry, and the sport is the
 * same fire-control truth the cert range teaches: you are not the gun,
 * you fly the geometry that lets the guns work.
 *
 * Toy laws: auto-starts on entry (no arming), never damages the player,
 * no banners (the coil flash IS the launch call — show, don't tell), and
 * the tote on the rig keeps the best streak like any honest range would.
 */

const RIG = new Vector3(
  GUNNERY_POI.position[0] - 2600,
  GUNNERY_POI.position[1] + 120,
  GUNNERY_POI.position[2] + 2400,
)
/** slag flies down the rail toward +X/-Z-ish; the zone sits off the muzzle */
const ZONE_CENTER = new Vector3(RIG.x + 500, RIG.y, RIG.z - 80)
const ZONE_RADIUS = 700
const ZONE_EXIT = 900
const SLAG_POOL = 8
const LAUNCH_MIN = 3.6
const LAUNCH_JITTER = 2.6
/** slow enough that the fire-control solution holds on a crossing clay
 *  when the pilot keeps the pass CLOSE — range degrades the lead (the
 *  baseline gun economy), so distance is the difficulty dial */
const SLAG_SPEED_MIN = 85
const SLAG_SPEED_SPAN = 55
const SLAG_RANGE = 1700
const BEST_KEY = 'stellarlogs-skeet-best'

interface Slag {
  position: Vector3
  velocity: Vector3
  alive: boolean
  launched: boolean
  spin: Vector3
  angle: Vector3
  scale: number
}

const _v = new Vector3()
const _dummy = new Object3D()

export function SlagSkeet() {
  const rockVariants = useRockVariants()
  const pdcFire = useMemo(() => createPdcFire(), [])
  const slagMeshRef = useRef<InstancedMesh>(null)
  const coilRefs = useRef<(Mesh | null)[]>([])
  const toteRef = useRef<{ text: string; sync?: () => void } | null>(null)

  const slag = useMemo<Slag[]>(
    () =>
      Array.from({ length: SLAG_POOL }, () => ({
        position: new Vector3(),
        velocity: new Vector3(),
        alive: false,
        launched: true,
        spin: new Vector3(),
        angle: new Vector3(),
        scale: 1,
      })),
    [],
  )
  const targetSlots = useMemo(() => slag.map((s) => ({ position: s.position })), [slag])

  /** hot slag: dark rock still glowing at the cracks */
  const slagMaterial = useMemo(() => {
    const m = new MeshStandardMaterial({
      color: '#3a3236',
      roughness: 0.85,
      metalness: 0.25,
      emissive: '#ff4a1a',
      emissiveIntensity: 0.55,
      flatShading: true,
    })
    return m
  }, [])

  const g = useRef({
    engaged: false,
    nextLaunchAt: 0,
    coilFlashUntil: 0,
    hits: 0,
    streak: 0,
    best: Number(localStorage.getItem(BEST_KEY) ?? 0),
    flavorSaid: false,
  })

  useEffect(() => {
    const off = registerHudLabel({
      id: 'poi-skeet',
      name: 'SLAG SKEET',
      color: '#57e6c4',
      kind: 'poi',
      position: ZONE_CENTER,
      yOffset: 60,
      el: null,
      detail: "THE RANGE'S OFF-DUTY GAME",
      jumpStandoff: 900,
    })
    return off
  }, [])

  useEffect(() => {
    pdcFire.sources = slag
    pdcFire.onKill = (idx, position) => {
      const s = slag[idx]
      if (!s.alive) return
      s.alive = false
      spawnExplosion(position, 0.8)
      const st = g.current
      st.hits++
      st.streak++
      if (st.streak > st.best) {
        st.best = st.streak
        localStorage.setItem(BEST_KEY, String(st.best))
      }
    }
    pdcFire.onNearMiss = null
  }, [pdcFire, slag])

  useFrame(({ clock }, dt) => {
    const now = clock.elapsedTime
    const st = g.current
    if (PROBES && !(window as unknown as Record<string, unknown>).__skeet) {
      ;(window as unknown as Record<string, unknown>).__skeet = { state: g, slag }
    }
    const dist = shipRig.position.distanceTo(ZONE_CENTER)

    // engagement: a toy wakes on entry and yields to anything that matters
    const ownerFree = activityState.owner === '' || activityState.owner === 'skeet'
    if (!st.engaged && dist < ZONE_RADIUS && ownerFree && !shipRig.warping) {
      st.engaged = true
      st.streak = 0
      st.nextLaunchAt = now + 1.2
      if (!st.flavorSaid) {
        st.flavorSaid = true
        say(3, "SMELTER WASTE, MILITIA POWDER — THE RANGE'S OFF-DUTY GAME", 'info', 6)
      }
    } else if (st.engaged && (dist > ZONE_EXIT || !ownerFree || shipRig.warping)) {
      st.engaged = false
      for (const s of slag) s.alive = false
      if (activityState.owner === 'skeet') {
        activityState.owner = ''
        activityState.active = false
      }
      if (turretControl.targets.length > 0) {
        turretControl.targets = []
        turretControl.firing = false
      }
    }

    // ---------- the driver ----------
    if (st.engaged && now >= st.nextLaunchAt) {
      const s = slag.find((x) => !x.alive)
      if (s) {
        s.alive = true
        s.position.copy(RIG)
        // a clay across the bow: aim past the pilot with a wide offset
        _v.set(
          shipRig.position.x + (Math.random() - 0.5) * 300,
          shipRig.position.y + (Math.random() - 0.5) * 200,
          shipRig.position.z + (Math.random() - 0.5) * 300,
        )
        s.velocity.copy(_v).sub(RIG).normalize().multiplyScalar(SLAG_SPEED_MIN + Math.random() * SLAG_SPEED_SPAN)
        s.spin.set(Math.random() * 2.4, Math.random() * 2, Math.random() * 1.6)
        s.angle.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)
        s.scale = 2.6 + Math.random() * 2.6
        st.coilFlashUntil = now + 0.35
        st.nextLaunchAt = now + LAUNCH_MIN + Math.random() * LAUNCH_JITTER
      }
    }

    // ---------- flight + expiry ----------
    for (const s of slag) {
      if (!s.alive) continue
      s.position.addScaledVector(s.velocity, dt)
      s.angle.x += s.spin.x * dt
      s.angle.y += s.spin.y * dt
      s.angle.z += s.spin.z * dt
      if (s.position.distanceTo(RIG) > SLAG_RANGE) {
        s.alive = false
        st.streak = 0 // the one that got away resets the run
      }
    }

    // ---------- guns ----------
    if (st.engaged) {
      const targets: { position: Vector3 }[] = []
      pdcFire.slotSource.length = 0
      for (let i = 0; i < slag.length; i++) {
        if (slag[i].alive) {
          targets.push(targetSlots[i])
          pdcFire.slotSource.push(i)
        }
      }
      turretControl.targets = targets
      turretControl.firing = targets.length > 0
      turretControl.heatEnabled = false
      pdcFire.firing = targets.length > 0
    } else {
      pdcFire.firing = false
    }

    // ---------- HUD ----------
    if (st.engaged) {
      activityState.owner = 'skeet'
      activityState.active = true
      activityState.battle = false
      activityState.title = 'SLAG SKEET'
      activityState.hint = 'THE DRIVER LOBS — FLY TO KEEP YOUR GUNS BEARING'
      activityState.lines = [
        { label: 'STREAK', value: String(st.streak) },
        { label: 'BEST', value: st.best > 0 ? String(st.best) : '—' },
        { label: 'HITS', value: String(st.hits) },
      ]
      activityState.offer = ''
      activityState.offerHunt = ''
      activityState.canRestart = false
    }

    // ---------- render ----------
    const mesh = slagMeshRef.current
    if (mesh) {
      let n = 0
      for (const s of slag) {
        if (!s.alive) continue
        _dummy.position.copy(s.position)
        _dummy.rotation.set(s.angle.x, s.angle.y, s.angle.z)
        _dummy.scale.setScalar(s.scale * (rockVariants[0]?.norm ?? 1))
        _dummy.updateMatrix()
        if (rockVariants[0]) _dummy.matrix.multiply(rockVariants[0].base)
        mesh.setMatrixAt(n, _dummy.matrix)
        n++
      }
      mesh.count = n
      mesh.instanceMatrix.needsUpdate = true
    }
    // launch tell: the coils flash hot as the rail fires
    const flash = now < st.coilFlashUntil
    for (const coil of coilRefs.current) {
      if (!coil) continue
      const m = coil.material as MeshStandardMaterial
      m.emissiveIntensity = flash ? 3.2 : 0.7
    }
    // the tote keeps the best streak
    const tote = toteRef.current
    if (tote) {
      const text = `BEST STREAK ${st.best > 0 ? st.best : '—'}`
      if (tote.text !== text) {
        tote.text = text
        tote.sync?.()
      }
    }
  })

  return (
    <group>
      {/* THE MASS DRIVER — smelter surplus: rail, coils, feed hopper */}
      <group position={[RIG.x, RIG.y, RIG.z]} rotation={[0, Math.atan2(-(ZONE_CENTER.x - RIG.x), -(ZONE_CENTER.z - RIG.z)) + Math.PI, 0]}>
        <mesh position={[0, -16, 0]}>
          <boxGeometry args={[26, 22, 34]} />
          <meshStandardMaterial color="#242c36" metalness={0.55} roughness={0.6} flatShading />
        </mesh>
        <mesh position={[0, 2, -18]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[7, 84, 7]} />
          <meshStandardMaterial color="#39434f" metalness={0.6} roughness={0.5} flatShading />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            position={[0, 2, -46 + i * 19]}
            rotation={[Math.PI / 2, 0, 0]}
            ref={(el) => {
              coilRefs.current[i] = el
            }}
          >
            <torusGeometry args={[8.5, 1.6, 8, 18]} />
            <meshStandardMaterial
              color="#1c2630"
              metalness={0.5}
              roughness={0.5}
              emissive="#ffb454"
              emissiveIntensity={0.7}
            />
          </mesh>
        ))}
        <mesh position={[16, -8, 12]}>
          <boxGeometry args={[10, 14, 10]} />
          <meshStandardMaterial color="#2c343e" metalness={0.5} roughness={0.65} flatShading />
        </mesh>
        {/* the tote: an honest range keeps its numbers where you can see */}
        <mesh position={[0, 26, 4]}>
          <boxGeometry args={[42, 12, 1.4]} />
          <meshStandardMaterial color="#161d27" metalness={0.55} roughness={0.6} flatShading />
        </mesh>
        <Text
          font={FONT_BOLD}
          fontSize={4.2}
          letterSpacing={0.2}
          color="#ffc06e"
          anchorX="center"
          anchorY="middle"
          position={[0, 29, 4.9]}
          material-toneMapped={false}
        >
          SLAG SKEET
        </Text>
        <Text
          ref={((el: { text: string; sync?: () => void } | null) => {
            toteRef.current = el
          }) as never}
          font={FONT_BOLD}
          fontSize={3.2}
          letterSpacing={0.16}
          color="#8fb8d8"
          anchorX="center"
          anchorY="middle"
          position={[0, 23.5, 4.9]}
          material-toneMapped={false}
        >
          {''}
        </Text>
        {/* muzzle glow, faint until the coil flash carries it */}
        <mesh position={[0, 2, -62]}>
          <sphereGeometry args={[2.2, 8, 8]} />
          <meshStandardMaterial
            color="#0c1218"
            emissive="#ffb454"
            emissiveIntensity={0.4}
            blending={AdditiveBlending}
            transparent
            opacity={0.6}
          />
        </mesh>
      </group>

      {/* the slag in flight */}
      {rockVariants[0] && (
        <instancedMesh
          ref={slagMeshRef}
          args={[rockVariants[0].geometry, slagMaterial, SLAG_POOL]}
          frustumCulled={false}
        />
      )}
      <PdcRounds fire={pdcFire} />
    </group>
  )
}
