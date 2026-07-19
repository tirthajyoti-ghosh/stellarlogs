import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { hudLabels, hudReadouts } from './hudState'
import { shipRig } from '../state/shipRig'
import { shipInput } from '../physics/shipInput'
import { warp } from '../physics/warp'
import { getGravityBodies } from '../physics/gravity'
import { ALL_SYSTEMS } from '../config/systems'
import { FLIGHT } from '../config/flight'

const _p = new Vector3()
const EDGE = 96 // px margin when clamping off-screen markers
// Closing-speed estimate state for the nearest contact
let lastTargetId = ''
let lastTargetDist = 0
let lastTargetTime = 0
let closingSmooth = 0

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
    if (hudReadouts.speedBarEl) {
      const frac = Math.min(1, shipRig.speed / FLIGHT.boostMaxSpeed)
      hudReadouts.speedBarEl.style.width = `${(frac * 100).toFixed(1)}%`
    }
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

    document.body.dataset.warp = shipRig.warping ? '1' : ''
    document.body.dataset.warpphase = warp.phase

    // Position readout
    if (hudReadouts.posEl) {
      const p = shipRig.position
      hudReadouts.posEl.textContent = `POS ${(p.x / 1000).toFixed(1)} ${(p.y / 1000).toFixed(1)} ${(p.z / 1000).toFixed(1)}`
    }

    // Gravity-well warning: lit while inside any body's influence
    if (hudReadouts.gravEl) {
      let inWell = false
      for (const body of getGravityBodies()) {
        if (body.position.distanceTo(shipRig.position) < body.influenceRadius) {
          inWell = true
          break
        }
      }
      hudReadouts.gravEl.dataset.on = inWell ? '1' : ''
    }

    // RCS activity lights mirror the actual thruster firings
    const rcs = hudReadouts.rcsEls
    const setLight = (key: string, on: boolean) => {
      const el = rcs[key]
      if (el) el.dataset.on = on ? '1' : ''
    }
    setLight('yawL', shipInput.yaw > 0)
    setLight('yawR', shipInput.yaw < 0)
    setLight('pitchU', shipInput.pitch > 0)
    setLight('pitchD', shipInput.pitch < 0)
    setLight('strafeL', shipInput.strafeX < 0)
    setLight('strafeR', shipInput.strafeX > 0)
    setLight('retro', shipInput.reverse > 0)

    // Nearest contact: closest labeled body, with a smoothed closing rate
    let target: (typeof hudLabels)[number] | null = null
    let targetDist = Infinity
    for (const label of hudLabels) {
      const d = label.position.distanceTo(shipRig.position)
      if (d < targetDist) {
        targetDist = d
        target = label
      }
    }
    if (target && hudReadouts.targetNameEl && hudReadouts.targetDistEl && hudReadouts.targetCloseEl) {
      const now = performance.now() / 1000
      if (target.id === lastTargetId && now > lastTargetTime) {
        const rate = (lastTargetDist - targetDist) / Math.max(1e-3, now - lastTargetTime)
        closingSmooth += (rate - closingSmooth) * 0.12
      } else {
        closingSmooth = 0
      }
      lastTargetId = target.id
      lastTargetDist = targetDist
      lastTargetTime = now
      hudReadouts.targetNameEl.textContent = target.name
      hudReadouts.targetNameEl.style.color = target.color
      hudReadouts.targetDistEl.textContent = `${formatDistance(targetDist)} M`
      const closing = Math.round(closingSmooth)
      hudReadouts.targetCloseEl.textContent = `${closing >= 0 ? '−' : '+'}${Math.abs(closing)} M/S`
      hudReadouts.targetCloseEl.dataset.closing = closing >= 0 ? '1' : ''
    }

    // Jump-drive panel
    if (warp.phase !== 'idle' && hudReadouts.warpDestEl && hudReadouts.warpDistEl && hudReadouts.warpPhaseEl) {
      let destName = 'COMMS STATION'
      for (const system of ALL_SYSTEMS) {
        _p.set(...system.position)
        if (_p.distanceTo(warp.target) < 200) destName = system.name.toUpperCase()
      }
      const remaining = warp.arrival.distanceTo(shipRig.position)
      hudReadouts.warpDestEl.textContent = destName
      hudReadouts.warpPhaseEl.textContent = warp.phase === 'align' ? 'ALIGNING' : 'JUMPING'
      const eta = warp.phase === 'jump' ? remaining / Math.max(1, shipRig.speed) : 0
      hudReadouts.warpDistEl.textContent =
        warp.phase === 'jump' ? `${formatDistance(remaining)} M · ETA ${eta.toFixed(1)}S` : `${formatDistance(remaining)} M`
    }

    // Greedy overlap culling: nearer labels claim screen space first
    const placed: { x: number; y: number }[] = []
    const sorted = [...hudLabels].sort(
      (a, b) =>
        a.position.distanceTo(shipRig.position) - b.position.distanceTo(shipRig.position),
    )

    for (const label of sorted) {
      const el = label.el
      if (!el) continue
      const dist = label.position.distanceTo(shipRig.position)

      // Visibility rules per kind
      let visible: boolean
      if (label.kind === 'system') visible = dist > 1600
      else if (label.kind === 'planet') visible = dist < 3200 && dist > 140
      else visible = dist < 2600 && dist > 220

      // Mid-jump, focus the HUD: only the destination marker stays up
      if (warp.phase === 'jump') {
        visible = label.kind === 'system' && label.position.distanceTo(warp.target) < 200
      }

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

      // Skip labels that would collide with an already-placed one
      const collides = placed.some((p) => Math.abs(p.x - x) < 150 && Math.abs(p.y - y) < 22)
      if (collides) {
        el.style.opacity = '0'
        continue
      }
      placed.push({ x, y })

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
