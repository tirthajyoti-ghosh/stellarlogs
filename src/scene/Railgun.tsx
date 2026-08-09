import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Mesh, Vector3 } from 'three'
import { shipRig } from '../state/shipRig'
import { say } from '../state/activityState'
import {
  railgun,
  railStep,
  railTriggerDown,
  railTriggerUp,
  railTargets,
  RAIL,
} from '../systems/railgun'
import {
  railChargeStart,
  railChargeUpdate,
  railChargeStop,
  triggerRailFire,
  triggerRailVent,
} from '../audio/engine'
import { spawnExplosion } from './fx/Explosions'
import { PROBES } from '../config/probes'

/**
 * THE SPINE's body: input, audio, the slug, the kick, the HUD ring.
 * The law lives in systems/railgun.ts; this renders it.
 */

const _fwd = new Vector3()
const _origin = new Vector3()
const _toT = new Vector3()
const _hit = new Vector3()
const _mid = new Vector3()
const _up = new Vector3(0, 1, 0)

export function Railgun() {
  const slugRef = useRef<Mesh>(null)
  const g = useRef({
    slugUntil: 0,
    slugFrom: new Vector3(),
    slugTo: new Vector3(),
    lastSafedSay: 0,
    charging: false,
  })

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'KeyT' || e.repeat) return
      railTriggerDown()
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'KeyT') railTriggerUp()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    if (PROBES) {
      const w = window as unknown as Record<string, unknown>
      w.__railgun = railgun
      w.__railTargets = railTargets
      w.__railDown = railTriggerDown
      w.__railUp = railTriggerUp
    }
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useFrame(({ clock }, dt) => {
    const s = g.current
    const now = clock.elapsedTime

    // warp stows the gun: any live charge vents
    if (shipRig.warping && (railgun.phase === 'charge' || railgun.phase === 'hold')) {
      railgun.phase = 'ready'
      railgun.t = 0
      railgun.ventRequested = true
      railgun.held = false
    }

    railStep(dt)

    // the pilot asked and the contract said no — answer once, plainly
    if (railgun.safedPressAt > 0) {
      railgun.safedPressAt = 0
      if (now - s.lastSafedSay > 4) {
        s.lastSafedSay = now
        say(1, 'IMPOUND RULES — SPINE SAFED', 'info', 2.2)
      }
    }

    // audio follows the machine
    if (railgun.chargeStarted) {
      railgun.chargeStarted = false
      railChargeStart()
      s.charging = true
    }
    if (s.charging) {
      const k =
        railgun.phase === 'hold' ? 1 : railgun.phase === 'charge' ? railgun.t / RAIL.CHARGE_S : 0
      railChargeUpdate(k)
      if (railgun.phase !== 'charge' && railgun.phase !== 'hold') {
        railChargeStop()
        s.charging = false
      }
    }
    if (railgun.ventRequested) {
      railgun.ventRequested = false
      if (s.charging) {
        railChargeStop()
        s.charging = false
      }
      triggerRailVent()
    }

    // THE SHOT
    if (railgun.fireRequested) {
      railgun.fireRequested = false
      if (s.charging) {
        railChargeStop()
        s.charging = false
      }
      railgun.phase = 'cool'
      railgun.t = 0
      triggerRailFire()
      // the whole ship is the mount: forward is wherever you flew it
      _fwd.set(0, 0, -1).applyQuaternion(shipRig.quaternion)
      _origin.copy(shipRig.position).addScaledVector(_fwd, 5)
      // the slug adjudicates ONLY registered targets: nearest ray-sphere hit
      let best: { t: number; target: (typeof railTargets)[number] } | null = null
      for (const target of railTargets) {
        if (!target.alive()) continue
        _toT.copy(target.position).sub(_origin)
        const along = _toT.dot(_fwd)
        if (along < 0 || along > RAIL.RANGE) continue
        const closest2 = _toT.lengthSq() - along * along
        if (closest2 > target.radius * target.radius) continue
        if (!best || along < best.t) best = { t: along, target }
      }
      if (best) {
        _hit.copy(_origin).addScaledVector(_fwd, best.t)
        best.target.onHit(_hit)
        spawnExplosion(_hit, 0.6)
        s.slugTo.copy(_hit)
      } else {
        s.slugTo.copy(_origin).addScaledVector(_fwd, RAIL.RANGE)
      }
      s.slugFrom.copy(_origin)
      s.slugUntil = now + 0.13
      // the kick is real: the hull takes the shove, the RCS catches it
      shipRig.pendingImpulse.addScaledVector(_fwd, -RAIL.KICK)
    }

    // slug render: one blinding line, then gone
    const slug = slugRef.current
    if (slug) {
      const on = now < s.slugUntil
      slug.visible = on
      if (on) {
        _mid.copy(s.slugFrom).add(s.slugTo).multiplyScalar(0.5)
        slug.position.copy(_mid)
        _toT.copy(s.slugTo).sub(s.slugFrom)
        const len = _toT.length()
        slug.scale.set(1, Math.max(1, len), 1)
        _toT.normalize()
        slug.quaternion.setFromUnitVectors(_up, _toT)
      }
    }

    // the HUD ring rides the reticle: conic arc per phase
    const ring = document.getElementById('hud-spine')
    if (ring) {
      const ph = railgun.phase
      const active = ph !== 'ready' || railgun.safed
      ring.style.opacity = active && !shipRig.warping ? '1' : '0'
      if (active) {
        let k = 0
        let color = '#ffb454'
        if (ph === 'charge') k = railgun.t / RAIL.CHARGE_S
        else if (ph === 'hold') {
          k = 1
          color = '#57e6c4'
        } else if (ph === 'cool') {
          k = railgun.t / RAIL.COOLDOWN_S
          color = 'rgba(134,152,172,0.8)'
        }
        const deg = Math.min(360, k * 360)
        ring.style.background = `conic-gradient(from -90deg, ${color} ${deg}deg, rgba(120,170,210,0.12) ${deg}deg)`
        ring.dataset.phase = ph
      }
    }
  })

  return (
    <mesh ref={slugRef} visible={false} frustumCulled={false}>
      <cylinderGeometry args={[0.5, 0.5, 1, 6, 1, true]} />
      <meshBasicMaterial
        color={[3.2, 3.8, 4.6]}
        transparent
        opacity={0.9}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
