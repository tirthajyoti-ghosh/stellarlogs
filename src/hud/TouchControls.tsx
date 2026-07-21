import { useEffect, useRef, useState } from 'react'
import { shipInput } from '../physics/shipInput'
import { turretControl } from '../state/turretControl'
import { activityState } from '../state/activityState'
import { IS_TOUCH } from '../config/quality'

const STICK_RADIUS = 56

/**
 * Touch flight controls: left virtual stick rotates the ship (yaw/pitch via
 * the same RCS couples), right-side buttons burn / afterburn / reverse.
 */
export function TouchControls() {
  const areaRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  // FIRE appears only inside an activity zone (polled at low frequency)
  const [inActivity, setInActivity] = useState(false)
  useEffect(() => {
    if (!IS_TOUCH) return
    const id = setInterval(() => setInActivity(activityState.active), 300)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const area = areaRef.current
    const knob = knobRef.current
    if (!area || !knob) return
    let pointerId: number | null = null

    const setFromEvent = (e: PointerEvent) => {
      const rect = area.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      let dx = (e.clientX - cx) / STICK_RADIUS
      let dy = (e.clientY - cy) / STICK_RADIUS
      const len = Math.hypot(dx, dy)
      if (len > 1) {
        dx /= len
        dy /= len
      }
      shipInput.yaw = -dx
      shipInput.pitch = -dy
      knob.style.transform = `translate(${dx * STICK_RADIUS * 0.6}px, ${dy * STICK_RADIUS * 0.6}px)`
    }
    const reset = () => {
      pointerId = null
      shipInput.yaw = 0
      shipInput.pitch = 0
      knob.style.transform = 'translate(0px, 0px)'
    }

    const onDown = (e: PointerEvent) => {
      pointerId = e.pointerId
      area.setPointerCapture(e.pointerId)
      setFromEvent(e)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId === pointerId) setFromEvent(e)
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId === pointerId) reset()
    }

    area.addEventListener('pointerdown', onDown)
    area.addEventListener('pointermove', onMove)
    area.addEventListener('pointerup', onUp)
    area.addEventListener('pointercancel', onUp)
    return () => {
      area.removeEventListener('pointerdown', onDown)
      area.removeEventListener('pointermove', onMove)
      area.removeEventListener('pointerup', onUp)
      area.removeEventListener('pointercancel', onUp)
    }
  }, [])

  if (!IS_TOUCH) return null

  const hold = (field: 'thrust' | 'reverse' | 'boost') => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      if (field === 'boost') shipInput.boost = true
      else shipInput[field] = 1
    },
    onPointerUp: () => {
      if (field === 'boost') shipInput.boost = false
      else shipInput[field] = 0
    },
    onPointerCancel: () => {
      if (field === 'boost') shipInput.boost = false
      else shipInput[field] = 0
    },
    onLostPointerCapture: () => {
      if (field === 'boost') shipInput.boost = false
      else shipInput[field] = 0
    },
  })

  return (
    <div className="hud-touch" data-ui>
      <div className="hud-stick" ref={areaRef}>
        <div className="hud-stick-knob" ref={knobRef} />
      </div>
      <div className="hud-touch-buttons">
        {inActivity && (
          <button
            className="hud-touch-btn hud-touch-fire"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              turretControl.fireIntent = true
            }}
            onPointerUp={() => (turretControl.fireIntent = false)}
            onPointerCancel={() => (turretControl.fireIntent = false)}
            onLostPointerCapture={() => (turretControl.fireIntent = false)}
          >
            ARM
          </button>
        )}
        <button className="hud-touch-btn hud-touch-boost" {...hold('boost')}>
          BOOST
        </button>
        <button className="hud-touch-btn hud-touch-burn" {...hold('thrust')}>
          BURN
        </button>
        <button className="hud-touch-btn hud-touch-rev" {...hold('reverse')}>
          REV
        </button>
      </div>
    </div>
  )
}
