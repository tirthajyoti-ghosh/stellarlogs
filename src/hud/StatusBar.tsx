import { useEffect, useRef } from 'react'
import { hudReadouts } from './hudState'

/** Bottom status strip: velocity, heading, drive mode, current system. */
export function StatusBar() {
  const speedRef = useRef<HTMLSpanElement>(null)
  const headingRef = useRef<HTMLSpanElement>(null)
  const systemRef = useRef<HTMLSpanElement>(null)
  const driveRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    hudReadouts.speedEl = speedRef.current
    hudReadouts.headingEl = headingRef.current
    hudReadouts.systemEl = systemRef.current
    hudReadouts.driveEl = driveRef.current
    return () => {
      hudReadouts.speedEl = null
      hudReadouts.headingEl = null
      hudReadouts.systemEl = null
      hudReadouts.driveEl = null
    }
  }, [])

  return (
    <div className="hud-status" data-ui>
      <div className="hud-status-item">
        <span className="hud-status-label">VELOCITY</span>
        <span className="hud-status-value" ref={speedRef}>
          0
        </span>
      </div>
      <div className="hud-status-item">
        <span className="hud-status-label">HEADING</span>
        <span className="hud-status-value" ref={headingRef}>
          0°
        </span>
      </div>
      <div className="hud-status-item">
        <span className="hud-status-label">DRIVE</span>
        <span className="hud-status-value hud-drive" ref={driveRef}>
          IDLE
        </span>
      </div>
      <div className="hud-status-item">
        <span className="hud-status-label">SYSTEM</span>
        <span className="hud-status-value" ref={systemRef}>
          DEEP SPACE
        </span>
      </div>
    </div>
  )
}
