import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { ALL_SYSTEMS } from '../config/systems'
import { STATION_POSITION } from '../config/universe'
import { DRIFT_POI, GUNNERY_POI, TRACK_POI, WRECK_POI } from '../config/pois'
import { CONTACT } from '../content/contact'
import { hudLabels } from './hudState'
import { shipRig } from '../state/shipRig'
import { activityState } from '../state/activityState'
import { turretArcsWorld } from '../scene/shipTurrets'
import { startWarp, warp } from '../physics/warp'

const SIZE = 132
const R = SIZE / 2 - 8
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

    const onClick = (e: MouseEvent) => {
      if (warp.phase !== 'idle') return
      const rect = canvas.getBoundingClientRect()
      const mx = ((e.clientX - rect.left) / rect.width) * SIZE
      const my = ((e.clientY - rect.top) / rect.height) * SIZE
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
      ctx.clearRect(0, 0, SIZE, SIZE)
      blips.current.length = 0
      const cx = SIZE / 2
      const cy = SIZE / 2

      const battleTheme = activityState.battle
      // Rings + crosshairs
      ctx.strokeStyle = battleTheme ? 'rgba(240, 150, 110, 0.3)' : 'rgba(150, 190, 225, 0.2)'
      ctx.lineWidth = 1
      for (const r of [R, R * 0.66, R * 0.33]) {
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.moveTo(cx - R, cy)
      ctx.lineTo(cx + R, cy)
      ctx.moveTo(cx, cy - R)
      ctx.lineTo(cx, cy + R)
      ctx.strokeStyle = battleTheme ? 'rgba(240, 150, 110, 0.14)' : 'rgba(150, 190, 225, 0.1)'
      ctx.stroke()

      // Battle mode: short-range tactical scope — threats + turret coverage
      const battle = activityState.battle
      // Range: zoomed when inside a system
      let nearSystem: (typeof ALL_SYSTEMS)[number] | null = null
      for (const system of ALL_SYSTEMS) {
        _rel.set(...system.position)
        if (_rel.distanceTo(shipRig.position) < 1800) {
          nearSystem = system
          break
        }
      }
      const range = battle ? 900 : nearSystem ? 1900 : 15500

      const yaw = shipRig.yaw
      const plot = (wx: number, wz: number, color: string, size: number) => {
        const dx = wx - shipRig.position.x
        const dz = wz - shipRig.position.z
        // rotate so "up" is the ship's heading (R(yaw) maps forward to -Y)
        const rx = dx * Math.cos(yaw) - dz * Math.sin(yaw)
        const rz = dx * Math.sin(yaw) + dz * Math.cos(yaw)
        const px = cx + (rx / range) * R
        const py = cy + (rz / range) * R
        const dist = Math.hypot(px - cx, py - cy)
        if (dist > R - 2) {
          // clamp to rim as a faint tick
          const s = (R - 2) / dist
          ctx.globalAlpha = 0.5
          ctx.fillStyle = color
          ctx.fillRect(cx + (px - cx) * s - 1, cy + (py - cy) * s - 1, 2, 2)
          ctx.globalAlpha = 1
          return null
        }
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(px, py, size, 0, Math.PI * 2)
        ctx.fill()
        return { px, py }
      }

      if (battle) {
        // Turret arc wedges: which sectors the guns currently cover
        for (const arc of turretArcsWorld()) {
          const rx = arc.dx * Math.cos(yaw) - arc.dz * Math.sin(yaw)
          const rz = arc.dx * Math.sin(yaw) + arc.dz * Math.cos(yaw)
          const theta = Math.atan2(rz, rx)
          const SPREAD = 0.55 // rad, visual half-width
          ctx.fillStyle = arc.engaged ? 'rgba(232, 120, 60, 0.2)' : 'rgba(200, 150, 90, 0.07)'
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.arc(cx, cy, R - 3, theta - SPREAD, theta + SPREAD)
          ctx.closePath()
          ctx.fill()
        }
        // 3D tactical plot: bare canvas coords + elevation stem for a point
        const toXY = (wx: number, wz: number) => {
          const dx = wx - shipRig.position.x
          const dz = wz - shipRig.position.z
          const rx = dx * Math.cos(yaw) - dz * Math.sin(yaw)
          const rz = dx * Math.sin(yaw) + dz * Math.cos(yaw)
          let px = cx + (rx / range) * R
          let py = cy + (rz / range) * R
          const d = Math.hypot(px - cx, py - cy)
          if (d > R - 3) {
            const s = (R - 3) / d
            px = cx + (px - cx) * s
            py = cy + (py - cy) * s
          }
          return { px, py }
        }
        const stemFor = (wy: number) =>
          Math.max(-24, Math.min(24, ((wy - shipRig.position.y) / range) * R * 3))

        // Escortee (the hauler the torpedoes are hunting): cyan square + stem
        let escortee: { x: number; y: number; z: number } | null = null
        for (const threat of activityState.threats) {
          if (threat.alive && threat.launched && threat.targetPos) {
            escortee = threat.targetPos
            break
          }
        }
        let ex = 0
        let ey = 0
        if (escortee) {
          const e = toXY(escortee.x, escortee.z)
          const stem = stemFor(escortee.y)
          ex = e.px
          ey = e.py - stem
          ctx.strokeStyle = 'rgba(111, 232, 200, 0.5)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(e.px, e.py)
          ctx.lineTo(e.px, ey)
          ctx.stroke()
          ctx.fillStyle = '#6fe8c8'
          ctx.fillRect(ex - 3, ey - 3, 6, 6)
        }

        // Threats: base dot on the plane, contact at the stem tip, motion
        // trail + (escort) the threat AXIS it is riding toward its target —
        // stationing = putting your center dot on those lines
        for (const threat of activityState.threats) {
          if (!threat.alive || !threat.launched) continue
          const p = toXY(threat.position.x, threat.position.z)
          const stem = stemFor(threat.position.y)
          const tipY = p.py - stem
          ctx.fillStyle = 'rgba(255, 90, 70, 0.45)'
          ctx.fillRect(p.px - 1, p.py - 1, 2, 2)
          ctx.strokeStyle = 'rgba(255, 110, 90, 0.45)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(p.px, p.py)
          ctx.lineTo(p.px, tipY)
          ctx.stroke()
          if (escortee) {
            ctx.strokeStyle = 'rgba(255, 80, 64, 0.28)'
            ctx.beginPath()
            ctx.moveTo(p.px, tipY)
            ctx.lineTo(ex, ey)
            ctx.stroke()
          }
          ctx.fillStyle = '#ff5040'
          ctx.beginPath()
          ctx.arc(p.px, tipY, 2.6, 0, Math.PI * 2)
          ctx.fill()
          const vdx = threat.velocity.x
          const vdz = threat.velocity.z
          const trx = vdx * Math.cos(yaw) - vdz * Math.sin(yaw)
          const trz = vdx * Math.sin(yaw) + vdz * Math.cos(yaw)
          const tl = Math.hypot(trx, trz) || 1
          ctx.strokeStyle = 'rgba(255, 80, 64, 0.5)'
          ctx.beginPath()
          ctx.moveTo(p.px - (trx / tl) * 7, tipY - (trz / tl) * 7)
          ctx.lineTo(p.px, tipY)
          ctx.stroke()
        }
      } else if (nearSystem) {
        plot(nearSystem.position[0], nearSystem.position[2], nearSystem.starColor, 4)
        // live planet positions come from the registered planet labels
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

      // Ship marker
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(cx, cy - 5)
      ctx.lineTo(cx - 3.5, cy + 4)
      ctx.lineTo(cx + 3.5, cy + 4)
      ctx.closePath()
      ctx.fill()

      // Sweep
      const angle = (now / 1400) % (Math.PI * 2)
      const grad = ctx.createConicGradient(angle, cx, cy)
      grad.addColorStop(0, battleTheme ? 'rgba(240, 140, 90, 0.3)' : 'rgba(111, 211, 232, 0.25)')
      grad.addColorStop(0.12, battleTheme ? 'rgba(240, 140, 90, 0)' : 'rgba(111, 211, 232, 0)')
      grad.addColorStop(1, 'rgba(111, 211, 232, 0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
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
