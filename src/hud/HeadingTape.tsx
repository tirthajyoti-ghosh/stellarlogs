import { useEffect, useRef } from 'react'
import { shipRig } from '../state/shipRig'
import { warp } from '../physics/warp'

const W = 340
const H = 34
const WINDOW_DEG = 120 // degrees of tape visible

/**
 * Top-center heading tape: degree ticks with cardinal marks and a caret
 * showing the bearing to the jump target while one is set.
 */
export function HeadingTape() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0

    const draw = () => {
      raf = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, W, H)
      const heading = ((-shipRig.yaw * 180) / Math.PI + 360) % 360
      const pxPerDeg = W / WINDOW_DEG

      ctx.font = '600 10px Rajdhani, sans-serif'
      ctx.textAlign = 'center'
      for (let d = -WINDOW_DEG / 2; d <= WINDOW_DEG / 2; d++) {
        const deg = (((heading + d) % 360) + 360) % 360
        if (deg % 15 !== 0) continue
        const x = W / 2 + d * pxPerDeg
        const major = deg % 45 === 0
        ctx.strokeStyle = major ? 'rgba(200, 220, 240, 0.7)' : 'rgba(150, 185, 215, 0.35)'
        ctx.beginPath()
        ctx.moveTo(x, H - 8)
        ctx.lineTo(x, H - (major ? 18 : 13))
        ctx.stroke()
        if (major) {
          const label =
            deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : String(deg)
          ctx.fillStyle = 'rgba(200, 220, 240, 0.75)'
          ctx.fillText(label, x, H - 22)
        }
      }

      // Bearing caret to the warp destination while a jump is set up
      if (warp.phase !== 'idle') {
        const dx = warp.target.x - shipRig.position.x
        const dz = warp.target.z - shipRig.position.z
        const bearing = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360
        let rel = bearing - heading
        while (rel > 180) rel -= 360
        while (rel < -180) rel += 360
        const x = W / 2 + Math.max(-WINDOW_DEG / 2, Math.min(WINDOW_DEG / 2, rel)) * pxPerDeg
        ctx.fillStyle = '#a8c4ff'
        ctx.beginPath()
        ctx.moveTo(x, H - 4)
        ctx.lineTo(x - 4, H)
        ctx.lineTo(x + 4, H)
        ctx.closePath()
        ctx.fill()
      }

      // Center marker
      ctx.strokeStyle = '#6fd3e8'
      ctx.beginPath()
      ctx.moveTo(W / 2, H - 8)
      ctx.lineTo(W / 2, H - 20)
      ctx.stroke()
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="hud-tape" data-ui>
      <canvas ref={canvasRef} width={W} height={H} />
    </div>
  )
}
