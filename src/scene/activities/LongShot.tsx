import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { Group, Vector3 } from 'three'
import { shipRig } from '../../state/shipRig'
import { activityState, say } from '../../state/activityState'
import { registerHudLabel } from '../../hud/hudState'
import { registerRailTarget, railgun } from '../../systems/railgun'
import { GUNNERY_POI } from '../../config/pois'
import { FONT_BOLD } from '../boards/font'
import { PROBES } from '../../config/probes'

/**
 * THE LONG SHOT (docs/the-spine.md §3) — the range's second discipline,
 * and the skeet's legible successor. The militia tows condemned hull
 * plates out to the old proving line; you line the spine and crack steel
 * at range. Plain name, borrowed body (the range owns shooting), and the
 * five-second read: plates hang downrange with their distance painted
 * under them — hit them with the big gun.
 *
 * Toy laws: wakes on entry, yields to any real job, harms nothing.
 */

const LINE = new Vector3(
  GUNNERY_POI.position[0],
  GUNNERY_POI.position[1] + 40,
  GUNNERY_POI.position[2] + 3400,
)
/** downrange: AWAY from the cert arena and the spawn lanes */
const DOWNRANGE = new Vector3(0.18, 0.06, 1).normalize()
const ZONE_RADIUS = 700
const ZONE_EXIT = 900
const BANDS = [800, 1600, 2800, 4200]
const PLATE_RESPAWN_S = 12
const BEST_KEY = 'stellarlogs-longshot-best'

interface Plate {
  position: Vector3
  band: number
  alive: boolean
  respawnAt: number
  drift: Vector3
  spin: number
  rot: number
}

const _v = new Vector3()

export function LongShot() {
  const plateRefs = useRef<(Group | null)[]>([])
  const toteRef = useRef<{ text: string; sync?: () => void } | null>(null)

  const plates = useMemo<Plate[]>(
    () =>
      BANDS.map((band, i) => ({
        position: new Vector3()
          .copy(LINE)
          .addScaledVector(DOWNRANGE, band)
          .add(
            new Vector3(
              Math.sin(i * 2.1) * 140,
              Math.cos(i * 1.3) * 90,
              0,
            ),
          ),
        band,
        alive: true,
        respawnAt: 0,
        drift: new Vector3(Math.sin(i * 3.7) * 2.2, Math.cos(i * 2.9) * 1.6, 0),
        spin: 0.1 + i * 0.07,
        rot: i * 1.2,
      })),
    [],
  )

  const g = useRef({
    engaged: false,
    cracked: 0,
    best: Number(localStorage.getItem(BEST_KEY) ?? 0),
    flavorSaid: false,
  })

  useEffect(() => {
    const offLabel = registerHudLabel({
      id: 'poi-longshot',
      name: 'THE LONG SHOT',
      color: '#57e6c4',
      kind: 'poi',
      position: LINE,
      yOffset: 60,
      el: null,
      detail: 'RAILGUN PROVING LINE',
      jumpStandoff: 900,
    })
    const offs = plates.map((p) =>
      registerRailTarget({
        position: p.position,
        radius: 24,
        alive: () => g.current.engaged && p.alive,
        onHit: () => {
          p.alive = false
          p.respawnAt = -1 // stamped with game clock in the frame loop
          const st = g.current
          st.cracked++
          if (p.band > st.best) {
            st.best = p.band
            localStorage.setItem(BEST_KEY, String(st.best))
          }
        },
      }),
    )
    if (PROBES) {
      const w = window as unknown as Record<string, unknown>
      w.__longshot = { state: g, plates }
    }
    return () => {
      offLabel()
      offs.forEach((off) => off())
    }
  }, [plates])

  useFrame(({ clock }, dt) => {
    const now = clock.elapsedTime
    const st = g.current
    const dist = shipRig.position.distanceTo(LINE)

    const ownerFree = activityState.owner === '' || activityState.owner === 'longshot'
    railgun.available = st.engaged
    if (!st.engaged && dist < ZONE_RADIUS && ownerFree && !shipRig.warping) {
      st.engaged = true
      if (!st.flavorSaid) {
        st.flavorSaid = true
        say(3, 'CONDEMNED HULL PLATES, TOWED TO THE OLD PROVING LINE', 'info', 6)
      }
    } else if (st.engaged && (dist > ZONE_EXIT || !ownerFree || shipRig.warping)) {
      st.engaged = false
      railgun.available = false
      if (activityState.owner === 'longshot') {
        activityState.owner = ''
        activityState.active = false
      }
    }

    // plates drift, tumble, respawn
    for (let i = 0; i < plates.length; i++) {
      const p = plates[i]
      if (!p.alive) {
        if (p.respawnAt < 0) p.respawnAt = now + PLATE_RESPAWN_S
        if (now >= p.respawnAt) {
          p.alive = true
          p.position
            .copy(LINE)
            .addScaledVector(DOWNRANGE, p.band)
            .add(_v.set(Math.sin(now + i) * 150, Math.cos(now * 0.7 + i) * 90, 0))
        }
      } else {
        p.position.addScaledVector(p.drift, dt)
        // leash: drift never carries a plate off its band
        _v.copy(LINE).addScaledVector(DOWNRANGE, p.band)
        if (p.position.distanceTo(_v) > 260) p.drift.multiplyScalar(-1)
        p.rot += p.spin * dt
      }
      const group = plateRefs.current[i]
      if (group) {
        group.visible = p.alive
        if (p.alive) {
          group.position.copy(p.position)
          group.rotation.set(p.rot * 0.3, p.rot, 0)
        }
      }
    }

    if (st.engaged) {
      activityState.owner = 'longshot'
      activityState.active = true
      activityState.battle = false
      activityState.title = 'THE LONG SHOT'
      activityState.hint = railgun.safed
        ? 'SPINE SAFED — FINISH YOUR CONTRACT FIRST'
        : railgun.phase === 'cool'
          ? 'SPINE CYCLING — LINE UP THE NEXT ONE'
          : 'HOLD T — CHARGE THE SPINE, RELEASE AT FULL'
      activityState.lines = [
        { label: 'CRACKED', value: String(st.cracked) },
        { label: 'BEST RANGE', value: st.best > 0 ? String(st.best) : '—' },
        {
          label: 'STANDING',
          value: String(plates.filter((p) => p.alive).length) + '/4',
        },
      ]
      activityState.offer = ''
      activityState.offerHunt = ''
      activityState.canRestart = false
    }

    const tote = toteRef.current
    if (tote) {
      const text = `BEST RANGE ${st.best > 0 ? st.best : '—'}`
      if (tote.text !== text) {
        tote.text = text
        tote.sync?.()
      }
    }
  })

  return (
    <group>
      {/* the firing line: a militia sign frame, board idiom */}
      <group position={[LINE.x, LINE.y, LINE.z]}>
        <mesh>
          <boxGeometry args={[64, 22, 2]} />
          <meshStandardMaterial color="#161d27" metalness={0.55} roughness={0.6} flatShading />
        </mesh>
        <Text
          font={FONT_BOLD}
          fontSize={6}
          letterSpacing={0.18}
          color="#9fd8ef"
          anchorX="center"
          anchorY="middle"
          position={[0, 4, 1.3]}
          material-toneMapped={false}
        >
          THE LONG SHOT
        </Text>
        <Text
          ref={((el: { text: string; sync?: () => void } | null) => {
            toteRef.current = el
          }) as never}
          font={FONT_BOLD}
          fontSize={3.6}
          letterSpacing={0.16}
          color="#ffc06e"
          anchorX="center"
          anchorY="middle"
          position={[0, -5, 1.3]}
          material-toneMapped={false}
        >
          {''}
        </Text>
      </group>

      {/* condemned hull plates at their bands, distance painted below */}
      {plates.map((p, i) => (
        <group
          key={i}
          ref={(el) => {
            plateRefs.current[i] = el
          }}
        >
          <mesh>
            <boxGeometry args={[30, 20, 1.6]} />
            <meshStandardMaterial color="#5a626e" metalness={0.7} roughness={0.45} flatShading />
          </mesh>
          <mesh position={[0, 10, 0]}>
            <boxGeometry args={[32, 1.6, 2.4]} />
            <meshStandardMaterial color="#39434f" metalness={0.6} roughness={0.5} flatShading />
          </mesh>
          <mesh position={[0, -10, 0]}>
            <boxGeometry args={[32, 1.6, 2.4]} />
            <meshStandardMaterial color="#39434f" metalness={0.6} roughness={0.5} flatShading />
          </mesh>
          <Text
            font={FONT_BOLD}
            fontSize={4.4}
            letterSpacing={0.14}
            color="#ffb454"
            anchorX="center"
            anchorY="middle"
            position={[0, -14.5, 0]}
            material-toneMapped={false}
          >
            {String(p.band)}
          </Text>
        </group>
      ))}
    </group>
  )
}
