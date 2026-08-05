import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { ALL_SYSTEMS } from '../config/systems'
import { STATION_POSITION } from '../config/universe'
import { DRIFT_POI, GUNNERY_POI, TRACK_POI, WRECK_POI } from '../config/pois'
import { CONTACT } from '../content/contact'
import { hudLabels } from './hudState'
import { shipRig } from '../state/shipRig'
import { activityState } from '../state/activityState'
import { assessThreat } from '../scene/shipTurrets'
import { startWarp, warp } from '../physics/warp'

const SIZE = 132
const _rel = new Vector3()

interface RadarBlip {
  px: number
  py: number
  position: Vector3
  standoff: number
}

/**
 * Top-right radar: rotating sweep over a ship-oriented top-down plot.
 * Far mode shows the seven systems; near a star it zooms to its planets.
 */
export function Radar() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Jumpable blips (systems + station), refreshed each draw for click hit-tests
  const blips = useRef<RadarBlip[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let morphV = 0
    let lastNow = 0

    const onClick = (e: MouseEvent) => {
      if (warp.phase !== 'idle') return
      const rect = canvas.getBoundingClientRect()
      const mx = ((e.clientX - rect.left) / rect.width) * canvas.width
      const my = ((e.clientY - rect.top) / rect.height) * canvas.height
      let best: RadarBlip | null = null
      let bestD = 11 // px hit radius (canvas space)
      for (const b of blips.current) {
        const d = Math.hypot(b.px - mx, b.py - my)
        if (d < bestD) {
          bestD = d
          best = b
        }
      }
      if (best && best.position.distanceTo(shipRig.position) > best.standoff * 1.3) {
        startWarp(best.position, shipRig.position, best.standoff)
      }
    }
    canvas.addEventListener('click', onClick)

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      const dtMs = lastNow ? Math.min(50, now - lastNow) : 16
      lastNow = now

      // THE COLLAPSE (docs/the-scope.md): one continuous camera move
      // between the flat top-down nav disc (k = 0) and the open combat
      // cylinder (k = 1). Content crossfades near the flat pole, where
      // 3D structure is invisible anyway.
      const battle = activityState.battle
      const mTarget = battle ? 1 : 0
      if (morphV !== mTarget) {
        morphV =
          mTarget > morphV
            ? Math.min(mTarget, morphV + dtMs / 450)
            : Math.max(mTarget, morphV - dtMs / 450)
      }
      // combat grows the instrument: nav 132 px, the fight gets 200
      const wantSize = battle || morphV > 0.02 ? 200 : SIZE
      if (canvas.width !== wantSize) {
        canvas.width = wantSize
        canvas.height = wantSize
      }
      const size = canvas.width
      const cx = size / 2
      const cy = size / 2
      const RR = size / 2 - 8
      const k0 = morphV
      const k = k0 * k0 * (3 - 2 * k0)
      const navAlpha = Math.max(0, 1 - k / 0.3)
      const combatAlpha = Math.max(0, (k - 0.28) / 0.72)
      const tiltRad = (42 * Math.PI / 180) * k
      const cosT = Math.cos(tiltRad)

      ctx.clearRect(0, 0, size, size)
      blips.current.length = 0
      const battleTheme = battle

      // chrome rings — shared by both pictures; they squash as the disc
      // tilts open, which IS the collapse made visible
      ctx.strokeStyle = battleTheme ? 'rgba(240, 150, 110, 0.3)' : 'rgba(150, 190, 225, 0.2)'
      ctx.lineWidth = 1
      for (const r of [RR, RR * 0.66, RR * 0.33]) {
        ctx.beginPath()
        ctx.ellipse(cx, cy, r, Math.max(2, r * cosT), 0, 0, Math.PI * 2)
        ctx.stroke()
      }

      const yaw = shipRig.yaw
      const range = (() => {
        let nearSystem: (typeof ALL_SYSTEMS)[number] | null = null
        for (const system of ALL_SYSTEMS) {
          _rel.set(...system.position)
          if (_rel.distanceTo(shipRig.position) < 1800) {
            nearSystem = system
            break
          }
        }
        return { nearSystem, range: nearSystem ? 1900 : 15500 }
      })()
      const nearSystem = range.nearSystem
      const navRange = range.range

      const plot = (wx: number, wz: number, color: string, dotSize: number) => {
        const dx = wx - shipRig.position.x
        const dz = wz - shipRig.position.z
        // rotate so "up" is the ship's heading (R(yaw) maps forward to -Y)
        const rx = dx * Math.cos(yaw) - dz * Math.sin(yaw)
        const rz = dx * Math.sin(yaw) + dz * Math.cos(yaw)
        const px = cx + (rx / navRange) * RR
        const py = cy + (rz / navRange) * RR * cosT
        const dist = Math.hypot(px - cx, (py - cy) / Math.max(0.05, cosT))
        if (dist > RR - 2) {
          const s = (RR - 2) / dist
          ctx.globalAlpha = 0.5 * navAlpha
          ctx.fillStyle = color
          ctx.fillRect(cx + (px - cx) * s - 1, cy + (py - cy) * s - 1, 2, 2)
          ctx.globalAlpha = navAlpha
          return null
        }
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(px, py, dotSize, 0, Math.PI * 2)
        ctx.fill()
        return { px, py }
      }

      if (navAlpha > 0) {
        // ---- NAV PICTURE (the flat pole) ----
        ctx.globalAlpha = navAlpha
        ctx.beginPath()
        ctx.moveTo(cx - RR, cy)
        ctx.lineTo(cx + RR, cy)
        ctx.moveTo(cx, cy - RR * cosT)
        ctx.lineTo(cx, cy + RR * cosT)
        ctx.strokeStyle = battleTheme ? 'rgba(240, 150, 110, 0.14)' : 'rgba(150, 190, 225, 0.1)'
        ctx.stroke()

        if (nearSystem) {
          plot(nearSystem.position[0], nearSystem.position[2], nearSystem.starColor, 4)
          for (const label of hudLabels) {
            if (label.kind === 'planet') {
              plot(label.position.x, label.position.z, label.color, 2.2)
            }
          }
        } else {
          for (const system of ALL_SYSTEMS) {
            const p = plot(system.position[0], system.position[2], system.starColor, 3)
            if (p) {
              blips.current.push({
                px: p.px,
                py: p.py,
                position: new Vector3(...system.position),
                standoff: system.starRadius * 6 + 500,
              })
            }
          }
          const sp = plot(STATION_POSITION[0], STATION_POSITION[2], CONTACT.starColor, 2.2)
          if (sp) {
            blips.current.push({
              px: sp.px,
              py: sp.py,
              position: new Vector3(...STATION_POSITION),
              standoff: 420,
            })
          }
          // Activity POIs — jumps land outside their auto-start triggers
          const gp = plot(GUNNERY_POI.position[0], GUNNERY_POI.position[2], '#ffb454', 2.2)
          if (gp) {
            blips.current.push({
              px: gp.px,
              py: gp.py,
              position: new Vector3(...GUNNERY_POI.position),
              standoff: GUNNERY_POI.standoff,
            })
          }
          const bp = plot(TRACK_POI.position[0], TRACK_POI.position[2], '#7fe0f0', 2.2)
          if (bp) {
            blips.current.push({
              px: bp.px,
              py: bp.py,
              position: new Vector3(...TRACK_POI.position),
              standoff: TRACK_POI.standoff,
            })
          }
          const wp = plot(WRECK_POI.position[0], WRECK_POI.position[2], '#8a97a5', 2)
          if (wp) {
            blips.current.push({
              px: wp.px,
              py: wp.py,
              position: new Vector3(...WRECK_POI.position),
              standoff: WRECK_POI.standoff,
            })
          }
          const dp = plot(DRIFT_POI.position[0], DRIFT_POI.position[2], '#ffc06e', 2.6)
          if (dp) {
            blips.current.push({
              px: dp.px,
              py: dp.py,
              position: new Vector3(...DRIFT_POI.position),
              standoff: DRIFT_POI.standoff,
            })
          }
        }

        // Sweep — nav only; the combat picture holds still
        const angle = (now / 1400) % (Math.PI * 2)
        const grad = ctx.createConicGradient(angle, cx, cy)
        grad.addColorStop(0, battleTheme ? 'rgba(240, 140, 90, 0.3)' : 'rgba(111, 211, 232, 0.25)')
        grad.addColorStop(0.12, battleTheme ? 'rgba(240, 140, 90, 0)' : 'rgba(111, 211, 232, 0)')
        grad.addColorStop(1, 'rgba(111, 211, 232, 0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, RR, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }

      if (combatAlpha > 0) {
        // ---- COMBAT PICTURE · THE SCOPE (docs/the-scope.md, locked) ----
        // Edge-lit vessel (cap rims + walls fading at mid-height), the
        // plane as a tinted SURFACE the ship sits on (below-plane ink is
        // drawn first and seen THROUGH the tint), the PDC ring as master
        // status light, corridor axes, TEWA-truth stem tint, one digit.
        ctx.save()
        ctx.translate(cx, cy)
        ctx.globalAlpha = combatAlpha
        const RINGU = 300
        const HORIZON = 1800
        const capH = RR * 0.52 * k
        const capRy = RR * (0.1 + 0.35 * (1 - cosT)) * Math.min(1, k * 2)
        const sq = Math.max(0.02, capRy / RR)
        const rp = 0.3 * RR
        const EDGE = 'rgba(140,220,230,'

        // vessel rims + edge-lit walls
        ctx.strokeStyle = EDGE + '0.5)'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.ellipse(0, -capH, RR, Math.max(2, capRy), 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.strokeStyle = EDGE + '0.32)'
        ctx.beginPath()
        ctx.ellipse(0, capH, RR, Math.max(2, capRy), 0, 0, Math.PI * 2)
        ctx.stroke()
        for (let w = 0; w < 24; w++) {
          const th = (w / 24) * Math.PI * 2
          const x = Math.sin(th) * RR
          const yOff = Math.cos(th) * capRy
          const base = Math.cos(th) > 0 ? 0.3 : 0.13
          const yTop = -capH + yOff
          if (Math.abs(yTop) > 2) {
            const gTop = ctx.createLinearGradient(0, yTop, 0, yTop * 0.3)
            gTop.addColorStop(0, EDGE + base + ')')
            gTop.addColorStop(1, EDGE + '0)')
            ctx.strokeStyle = gTop
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(x, yTop)
            ctx.lineTo(x, yTop * 0.3)
            ctx.stroke()
          }
          const yBot = capH + yOff
          if (Math.abs(yBot) > 2) {
            const gBot = ctx.createLinearGradient(0, yBot, 0, yBot * 0.3)
            gBot.addColorStop(0, EDGE + base * 0.75 + ')')
            gBot.addColorStop(1, EDGE + '0)')
            ctx.strokeStyle = gBot
            ctx.beginPath()
            ctx.moveTo(x, yBot)
            ctx.lineTo(x, yBot * 0.3)
            ctx.stroke()
          }
        }

        // project a world point into the vessel (outer-weighted range)
        const mapR = (ground: number) =>
          ground <= RINGU
            ? (ground / RINGU) * 0.3 * RR
            : (0.3 + Math.min(1, (ground - RINGU) / (HORIZON - RINGU)) * 0.7) * RR
        const proj = (wx: number, wy: number, wz: number) => {
          const dx = wx - shipRig.position.x
          const dy = wy - shipRig.position.y
          const dz = wz - shipRig.position.z
          const rx = dx * Math.cos(yaw) - dz * Math.sin(yaw)
          const rz = dx * Math.sin(yaw) + dz * Math.cos(yaw)
          const ground = Math.hypot(rx, rz) || 1e-6
          const r = mapR(ground)
          const dist = Math.hypot(dx, dy, dz) || 1e-6
          const elev = Math.asin(Math.max(-1, Math.min(1, dy / dist)))
          const eh = Math.max(-1, Math.min(1, elev / (Math.PI / 4))) * capH
          return { fx: (rx / ground) * r, fy: (rz / ground) * r * sq, eh, ground }
        }

        // gather the picture: statuses, soonest, escortee
        const threats = activityState.threats
        let escorteePos: { x: number; y: number; z: number } | null = null
        const stats: number[] = []
        let soonestIdx = -1
        let soonest = Infinity
        for (let i = 0; i < threats.length; i++) {
          const th = threats[i]
          if (!th.alive || !th.launched) {
            stats.push(-1)
            continue
          }
          if (!escorteePos && th.targetPos) escorteePos = th.targetPos
          stats.push(th.tracked ? 2 : assessThreat(th.position))
          const dx = th.position.x - shipRig.position.x
          const dy = th.position.y - shipRig.position.y
          const dz = th.position.z - shipRig.position.z
          const dist = Math.hypot(dx, dy, dz) || 1
          const closing = -(th.velocity.x * dx + th.velocity.y * dy + th.velocity.z * dz) / dist
          if (closing > 1) {
            const tgo = dist / closing
            if (tgo < soonest) {
              soonest = tgo
              soonestIdx = i
            }
          }
        }
        const statusCol = (st: number) =>
          st === 3 ? 'rgba(159,178,200,0.75)' : st === 2 ? '#57e6c4' : st === 1 ? '#ffb454' : '#ff5040'

        const ePt = escorteePos ? proj(escorteePos.x, escorteePos.y, escorteePos.z) : null

        const stemDot = (f: { fx: number; fy: number; eh: number }, col: string) => {
          ctx.strokeStyle = 'rgba(2,8,20,0.9)'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(f.fx, f.fy)
          ctx.lineTo(f.fx, f.fy - f.eh)
          ctx.stroke()
          ctx.strokeStyle = col
          ctx.lineWidth = 1.3
          ctx.beginPath()
          ctx.moveTo(f.fx, f.fy)
          ctx.lineTo(f.fx, f.fy - f.eh)
          ctx.stroke()
          ctx.fillStyle = col
          ctx.beginPath()
          ctx.arc(f.fx, f.fy - f.eh, size * 0.0075, 0, Math.PI * 2)
          ctx.fill()
        }
        const pts: ({ fx: number; fy: number; eh: number; ground: number } | null)[] = []
        for (let i = 0; i < threats.length; i++) {
          const th = threats[i]
          pts.push(stats[i] < 0 ? null : proj(th.position.x, th.position.y, th.position.z))
        }
        const halfPass = (below: boolean) => {
          for (let i = 0; i < threats.length; i++) {
            const f = pts[i]
            if (!f) continue
            if (f.eh < 0 !== below) continue
            let a2 = 1
            if (i === soonestIdx) a2 = 0.45 + 0.55 * Math.abs(Math.sin(now * 0.009))
            ctx.globalAlpha = combatAlpha * a2
            stemDot(f, statusCol(stats[i]))
            ctx.globalAlpha = combatAlpha
          }
          if (ePt && ePt.eh < 0 === below) {
            ctx.strokeStyle = 'rgba(87,230,196,0.5)'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(ePt.fx, ePt.fy)
            ctx.lineTo(ePt.fx, ePt.fy - ePt.eh)
            ctx.stroke()
            ctx.fillStyle = '#57e6c4'
            ctx.save()
            ctx.translate(ePt.fx, ePt.fy - ePt.eh)
            ctx.rotate(Math.PI / 4)
            const s2 = size * 0.011
            ctx.fillRect(-s2, -s2, s2 * 2, s2 * 2)
            ctx.restore()
          }
        }

        // BELOW the surface first — the tint will sit over it
        halfPass(true)

        // THE PLANE: a surface, not a circle
        ctx.save()
        ctx.scale(1, sq)
        const pg = ctx.createRadialGradient(0, 0, RR * 0.15, 0, 0, RR)
        pg.addColorStop(0, 'rgba(96,158,178,0.07)')
        pg.addColorStop(0.85, 'rgba(96,158,178,0.16)')
        pg.addColorStop(1, 'rgba(120,190,205,0.05)')
        ctx.fillStyle = pg
        ctx.beginPath()
        ctx.arc(0, 0, RR, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // the PDC ring: master status light + crossing flash
        let worst = 2
        let anyNear = false
        for (let i = 0; i < threats.length; i++) {
          if (stats[i] < 0 || stats[i] === 3) continue
          anyNear = true
          worst = Math.min(worst, stats[i])
        }
        const ringCol = anyNear ? (worst === 2 ? '#57e6c4' : worst === 1 ? '#ffb454' : '#ff5040') : '#dce8f4'
        ctx.strokeStyle = ringCol
        ctx.lineWidth = size > 160 ? 2.2 : 1.4
        ctx.beginPath()
        ctx.ellipse(0, 0, rp, Math.max(2, rp * sq), 0, 0, Math.PI * 2)
        ctx.stroke()
        for (let i = 0; i < threats.length; i++) {
          const f = pts[i]
          if (!f) continue
          if (Math.abs(f.ground - RINGU) < 26) {
            ctx.strokeStyle = 'rgba(220,232,244,0.5)'
            ctx.lineWidth = 5
            ctx.beginPath()
            ctx.ellipse(0, 0, rp, Math.max(2, rp * sq), 0, 0, Math.PI * 2)
            ctx.stroke()
            break
          }
        }

        // corridor axes on the plane, tested in true 3D against my reach
        if (escorteePos && ePt) {
          for (let i = 0; i < threats.length; i++) {
            const th = threats[i]
            const f = pts[i]
            if (!f || !th.targetPos) continue
            const ax = th.position.x - shipRig.position.x
            const ay = th.position.y - shipRig.position.y
            const az = th.position.z - shipRig.position.z
            const abx = th.targetPos.x - th.position.x
            const aby = th.targetPos.y - th.position.y
            const abz = th.targetPos.z - th.position.z
            const len2 = abx * abx + aby * aby + abz * abz || 1
            const tt = Math.max(0, Math.min(1, -(ax * abx + ay * aby + az * abz) / len2))
            const covered = Math.hypot(ax + abx * tt, ay + aby * tt, az + abz * tt) < RINGU
            const eTgt = proj(th.targetPos.x, th.targetPos.y, th.targetPos.z)
            ctx.strokeStyle = covered ? 'rgba(87,230,196,0.55)' : 'rgba(255,80,64,0.75)'
            ctx.lineWidth = covered ? 1 : 1.4
            ctx.setLineDash(covered ? [] : [4, 4])
            ctx.beginPath()
            ctx.moveTo(f.fx, f.fy)
            ctx.lineTo(eTgt.fx, eTgt.fy)
            ctx.stroke()
            ctx.setLineDash([])
          }
        }

        // feet on the surface
        for (let i = 0; i < threats.length; i++) {
          const f = pts[i]
          if (!f) continue
          ctx.fillStyle = statusCol(stats[i])
          ctx.fillRect(f.fx - 1.5, f.fy - 1.5, 3, 3)
        }
        if (ePt) {
          ctx.fillStyle = '#57e6c4'
          ctx.fillRect(ePt.fx - 1.5, ePt.fy - 1.5, 3, 3)
        }

        // ABOVE the surface
        halfPass(false)

        // the one digit, fighter practice: soonest impact only
        if (soonestIdx >= 0 && pts[soonestIdx] && size >= 160 && soonest < 30) {
          const f = pts[soonestIdx]!
          ctx.font = '10px "Space Mono", ui-monospace, monospace'
          ctx.fillStyle = '#dce8f4'
          ctx.fillText('T-' + Math.max(0, Math.ceil(soonest)), f.fx + 9, f.fy - f.eh - 6)
        }
        ctx.globalAlpha = 1
        ctx.restore()
      }

      // Ship marker — the constant center of both pictures
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(cx, cy - 5)
      ctx.lineTo(cx - 3.5, cy + 4)
      ctx.lineTo(cx + 3.5, cy + 4)
      ctx.closePath()
      ctx.fill()
    }
    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__radarBlips = blips
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('click', onClick)
    }
  }, [])

  return (
    <div className="hud-mfd-radar">
      <canvas ref={canvasRef} width={SIZE} height={SIZE} />
    </div>
  )
}
