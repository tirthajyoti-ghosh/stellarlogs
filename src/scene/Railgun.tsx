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
 * THE SPINE's body — and THE LIT RAILS, its weapon glass
 * (docs/the-spine.md pass 3 + the stages.html storyboard, four
 * self-review rounds, blessed 2026-08-12).
 *
 * The HUD draws the weapon's own physics, in light: two rails rising
 * from the ship's REAL projected bow along the REAL boresight, ending at
 * a muzzle short of the aim point (separation is depth). Charge pours up
 * both rails; at full the ARMATURE arcs across the gap — the loaded gun;
 * the discharge races up and leaves the glass as the world's slug line;
 * then the heat visibly drains back down. Idle, the ghost rails breathe.
 * Every stroke is core+halo. RELEASE is the only word it says.
 */

const _fwd = new Vector3()
const _origin = new Vector3()
const _toT = new Vector3()
const _hit = new Vector3()
const _mid = new Vector3()
const _up = new Vector3(0, 1, 0)
const _bowW = new Vector3()
const _proj = new Vector3()

export function Railgun() {
  const slugRef = useRef<Mesh>(null)
  const g = useRef({
    slugUntil: 0,
    slugFrom: new Vector3(),
    slugTo: new Vector3(),
    lastSafedSay: 0,
    charging: false,
    firedAt: -99,
    ventAt: -99,
  })

  useEffect(() => {
    // SPACE is the trigger (his ruling): safe because the spine only
    // exists where its work exists — the proving line and the storm
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      if (!railgun.available) return
      railTriggerDown()
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') railTriggerUp()
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

  useFrame(({ clock, camera, size }, dt) => {
    const s = g.current
    const now = clock.elapsedTime

    if (shipRig.warping && (railgun.phase === 'charge' || railgun.phase === 'hold')) {
      railgun.phase = 'ready'
      railgun.t = 0
      railgun.ventRequested = true
      railgun.held = false
    }

    railStep(dt)

    if (railgun.safedPressAt > 0) {
      railgun.safedPressAt = 0
      if (now - s.lastSafedSay > 4) {
        s.lastSafedSay = now
        say(1, 'IMPOUND RULES — SPINE SAFED', 'info', 2.2)
      }
    }

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
      s.ventAt = now
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
      s.firedAt = now
      triggerRailFire()
      _fwd.set(0, 0, -1).applyQuaternion(shipRig.quaternion)
      _origin.copy(shipRig.position).addScaledVector(_fwd, 5)
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
      shipRig.pendingImpulse.addScaledVector(_fwd, -RAIL.KICK)
    }

    // world-side slug line
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

    // ---------------- THE LIT RAILS (HUD painter) ----------------
    const cvs = document.getElementById('spine-canvas') as HTMLCanvasElement | null
    if (!cvs) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cw = Math.floor(size.width * dpr)
    const ch = Math.floor(size.height * dpr)
    if (cvs.width !== cw || cvs.height !== ch) {
      cvs.width = cw
      cvs.height = ch
    }
    const ctx = cvs.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, cw, ch)

    if (!railgun.available || shipRig.warping) return

    // anchor: the ship's REAL bow on screen; aim: the boresight point
    _fwd.set(0, 0, -1).applyQuaternion(shipRig.quaternion)
    _bowW.copy(shipRig.position).addScaledVector(_fwd, 7)
    _proj.copy(_bowW).project(camera)
    if (_proj.z > 1) return // bow behind camera: no glass
    const bowX = (_proj.x * 0.5 + 0.5) * cw
    const bowY = (-_proj.y * 0.5 + 0.5) * ch
    const cx = cw / 2
    const cy = ch / 2
    // rails run from the bow toward the aim point, stopping short:
    // separation is depth — the muzzle never touches the reticle
    let dirX = cx - bowX
    let dirY = cy - bowY
    const distToAim = Math.hypot(dirX, dirY) || 1
    dirX /= distToAim
    dirY /= distToAim
    const railLen = Math.min(Math.max(distToAim * 0.55, 90 * dpr), 230 * dpr)
    if (distToAim < 60 * dpr) return // bow effectively at center: hide
    const perpX = -dirY
    const perpY = dirX
    const spreadBase = 15 * dpr
    const spreadTop = 6.5 * dpr
    const railPt = (side: number, f: number) => {
      const spread = spreadBase + (spreadTop - spreadBase) * f
      return [
        bowX + dirX * railLen * f + perpX * spread * side,
        bowY + dirY * railLen * f + perpY * spread * side,
      ] as const
    }
    const muzX = bowX + dirX * railLen
    const muzY = bowY + dirY * railLen

    const glowLine = (
      x0: number, y0: number, x1: number, y1: number,
      w: number, r: number, gr: number, b: number, a: number,
    ) => {
      ctx.globalCompositeOperation = 'lighter'
      const passes: [number, number][] = [
        [w * 6, a * 0.1], [w * 3, a * 0.22], [w * 1.4, a * 0.55], [w * 0.6, a],
      ]
      for (const [lw, la] of passes) {
        ctx.strokeStyle = `rgba(${r},${gr},${b},${la})`
        ctx.lineWidth = lw
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
        ctx.stroke()
      }
      ctx.globalCompositeOperation = 'source-over'
    }
    const glowDot = (x: number, y: number, rad: number, r: number, gr: number, b: number, a: number) => {
      ctx.globalCompositeOperation = 'lighter'
      const grad = ctx.createRadialGradient(x, y, 0, x, y, rad * 3)
      grad.addColorStop(0, `rgba(${r},${gr},${b},${a})`)
      grad.addColorStop(0.35, `rgba(${r},${gr},${b},${a * 0.35})`)
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(x, y, rad * 3, 0, 7)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    }

    const ph = railgun.phase
    const k = ph === 'charge' ? Math.min(1, railgun.t / RAIL.CHARGE_S) : ph === 'hold' ? 1 : 0
    const cool = ph === 'cool' ? Math.min(1, railgun.t / RAIL.COOLDOWN_S) : 1
    const sinceFire = now - s.firedAt

    // ghost rails: the base layer, breathing when idle
    const breath = ph === 'ready' ? 0.16 + 0.08 * Math.sin(now * 1.7) : 0.1
    for (const side of [-1, 1]) {
      const [x0, y0] = railPt(side, 0)
      const [x1, y1] = railPt(side, 1)
      glowLine(x0, y0, x1, y1, 1.2 * dpr, 140, 200, 235, breath)
    }
    // whisper tick scale
    for (let i = 1; i <= 5; i++) {
      const f = i / 6
      const [lx, ly] = railPt(-1, f)
      const [rx, ry] = railPt(1, f)
      const lit = (ph === 'charge' && f <= k) || ph === 'hold'
      ctx.strokeStyle = lit
        ? ph === 'hold' ? 'rgba(87,230,196,0.4)' : 'rgba(255,190,110,0.4)'
        : 'rgba(140,190,220,0.1)'
      ctx.lineWidth = 1 * dpr
      const inset = 0.3
      ctx.beginPath()
      ctx.moveTo(lx + (rx - lx) * inset, ly + (ry - ly) * inset)
      ctx.lineTo(lx + (rx - lx) * (1 - inset), ly + (ry - ly) * (1 - inset))
      ctx.stroke()
    }

    if (ph === 'charge') {
      // light pours up both rails; meniscus heads climbing
      for (const side of [-1, 1]) {
        const [x0, y0] = railPt(side, 0)
        const [x1, y1] = railPt(side, k)
        glowLine(x0, y0, x1, y1, 2.4 * dpr, 255, 190, 110, 0.9)
        glowDot(x1, y1, 3.4 * dpr, 255, 245, 220, 0.75)
      }
    }

    if (ph === 'hold') {
      const pulse = 0.85 + 0.15 * Math.sin(now * 5)
      for (const side of [-1, 1]) {
        const [x0, y0] = railPt(side, 0)
        const [x1, y1] = railPt(side, 1)
        glowLine(x0, y0, x1, y1, 2.4 * dpr, 87, 230, 196, 0.85 * pulse)
      }
      // THE ARMATURE: the live arc across the muzzle — the loaded gun
      const [ax, ay] = railPt(-1, 1)
      const [bx, by] = railPt(1, 1)
      glowLine(ax, ay, bx, by, 3.2 * dpr, 200, 255, 240, 1)
      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = 'rgba(230,255,248,0.85)'
      ctx.lineWidth = 1.1 * dpr
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(muzX + (Math.random() - 0.5) * 5 * dpr, muzY + (Math.random() - 0.5) * 5 * dpr)
      ctx.lineTo(bx, by)
      ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'
      // armed bloom at the aim point
      glowDot(cx, cy, 3.4 * dpr, 130, 255, 220, 0.7 * pulse)
      // RELEASE — the only word this instrument says
      const text = 'RELEASE'
      ctx.font = `700 ${12 * dpr}px Rajdhani, 'Segoe UI', sans-serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = `rgba(87,230,196,${0.6 + 0.4 * pulse})`
      const track = 5 * dpr
      let tw = 0
      for (const chr of text) tw += ctx.measureText(chr).width + track
      let tx = cx - tw / 2
      for (const chr of text) {
        ctx.fillText(chr, tx + ctx.measureText(chr).width / 2, cy - 34 * dpr)
        tx += ctx.measureText(chr).width + track
      }
    }

    // fire: the bridge races up the rails and leaves the glass
    if (sinceFire < 0.12) {
      const f = sinceFire / 0.12
      const [ax, ay] = railPt(-1, f)
      const [bx, by] = railPt(1, f)
      for (const side of [-1, 1]) {
        const [x0, y0] = railPt(side, 0)
        const [x1, y1] = railPt(side, 1)
        glowLine(x0, y0, x1, y1, 1.8 * dpr, 255, 240, 230, 0.6)
      }
      glowLine(ax, ay, bx, by, 3.4 * dpr, 255, 252, 245, 0.95)
      glowDot(bowX + dirX * railLen * f, bowY + dirY * railLen * f, 6 * dpr, 255, 250, 240, 0.9)
    }

    // cool: watch the heat drain from the muzzle back to the bow
    if (ph === 'cool' && sinceFire >= 0.12) {
      const heat = 1 - cool
      if (heat > 0.02) {
        const boundary = 1 - cool // descends muzzle→bow
        for (const side of [-1, 1]) {
          const [x0, y0] = railPt(side, 0)
          const [x1, y1] = railPt(side, boundary)
          glowLine(x0, y0, x1, y1, 1.6 * dpr, 255, 130 + heat * 50, 60, 0.08 + heat * 0.35)
          glowDot(x1, y1, 2.2 * dpr, 255, 150, 70, heat * 0.4)
        }
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
