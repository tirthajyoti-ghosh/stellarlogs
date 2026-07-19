import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { hudLabels, hudReadouts } from './hudState'
import { shipRig } from '../state/shipRig'
import { ALL_SYSTEMS } from '../config/systems'

const _p = new Vector3()
const EDGE = 96 // px margin when clamping off-screen markers

function formatDistance(d: number): string {
  return d >= 1000 ? `${(d / 1000).toFixed(1)}k` : `${Math.round(d)}`
}

/**
 * Runs inside the Canvas: projects every registered label into screen space
 * and writes styles directly onto the DOM nodes. Off-screen targets clamp to
 * the viewport edge with a bearing arrow — the HUD's direction indicators.
 */
export function HudBridge() {
  useFrame(({ camera, size }) => {
    // Current system readout (nearest star within its outer orbits)
    let nearestName = 'DEEP SPACE'
    let nearestDist = Infinity
    for (const system of ALL_SYSTEMS) {
      _p.set(...system.position)
      const d = _p.distanceTo(shipRig.position)
      if (d < 6000 && d < nearestDist) {
        nearestDist = d
        nearestName = system.name.toUpperCase()
      }
    }
    hudReadouts.currentSystemName = nearestName
    if (hudReadouts.systemEl) hudReadouts.systemEl.textContent = nearestName
    if (hudReadouts.speedEl) hudReadouts.speedEl.textContent = String(Math.round(shipRig.speed))
    if (hudReadouts.headingEl) {
      const deg = Math.round(((-shipRig.yaw * 180) / Math.PI + 360) % 360)
      hudReadouts.headingEl.textContent = `${deg}°`
    }
    if (hudReadouts.driveEl) {
      hudReadouts.driveEl.textContent = shipRig.warping
        ? 'WARP'
        : shipRig.boosting
          ? 'BURN'
          : shipRig.thrusting
            ? 'THRUST'
            : 'IDLE'
      hudReadouts.driveEl.dataset.mode = hudReadouts.driveEl.textContent.toLowerCase()
    }

    for (const label of hudLabels) {
      const el = label.el
      if (!el) continue
      const dist = label.position.distanceTo(shipRig.position)

      // Visibility rules per kind
      let visible: boolean
      if (label.kind === 'system') visible = dist > 1600
      else if (label.kind === 'planet') visible = dist < 3200 && dist > 140
      else visible = dist < 2600 && dist > 220

      if (!visible) {
        el.style.opacity = '0'
        continue
      }

      _p.copy(label.position)
      _p.y += label.yOffset
      _p.project(camera)
      const behind = _p.z > 1
      let x = (_p.x * 0.5 + 0.5) * size.width
      let y = (-_p.y * 0.5 + 0.5) * size.height
      if (behind) {
        // Mirror so the marker clamps to the correct edge
        x = size.width - x
        y = size.height
      }

      const offscreen =
        behind || x < EDGE || x > size.width - EDGE || y < EDGE || y > size.height - EDGE

      let arrow = ''
      if (offscreen) {
        const cx = size.width / 2
        const cy = size.height / 2
        const dx = x - cx
        const dy = y - cy
        const scale = Math.min(
          (size.width / 2 - EDGE) / Math.max(1e-4, Math.abs(dx)),
          (size.height / 2 - EDGE) / Math.max(1e-4, Math.abs(dy)),
        )
        x = cx + dx * scale
        y = cy + dy * scale
        arrow = ` ${Math.round((Math.atan2(dy, dx) * 180) / Math.PI)}deg`
      }

      el.style.opacity = label.kind === 'system' ? '0.92' : '0.85'
      el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
      const distEl = el.querySelector<HTMLElement>('.hud-label-dist')
      if (distEl) distEl.textContent = formatDistance(dist)
      const arrowEl = el.querySelector<HTMLElement>('.hud-label-arrow')
      if (arrowEl) {
        arrowEl.style.display = offscreen ? 'inline-block' : 'none'
        if (offscreen) arrowEl.style.transform = `rotate(${arrow})`
      }
    }
  })
  return null
}
