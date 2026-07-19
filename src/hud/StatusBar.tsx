import { useEffect, useRef } from 'react'
import { hudReadouts } from './hudState'

/**
 * Flight readouts, Expanse-style: a left cluster (velocity + drive state +
 * thin speed bar) and a right cluster (system + heading). Values are written
 * imperatively by HudBridge.
 */
export function StatusBar() {
  const speedRef = useRef<HTMLSpanElement>(null)
  const speedBarRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLSpanElement>(null)
  const systemRef = useRef<HTMLDivElement>(null)
  const driveRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    hudReadouts.speedEl = speedRef.current
    hudReadouts.speedBarEl = speedBarRef.current
    hudReadouts.headingEl = headingRef.current
    hudReadouts.systemEl = systemRef.current
    hudReadouts.driveEl = driveRef.current
    return () => {
      hudReadouts.speedEl = null
      hudReadouts.speedBarEl = null
      hudReadouts.headingEl = null
      hudReadouts.systemEl = null
      hudReadouts.driveEl = null
    }
  }, [])

  return (
    <>
      <div className="hud-cluster hud-cluster-left" data-ui>
        <div className="hud-micro">VELOCITY M/S</div>
        <div className="hud-velocity-row">
          <span className="hud-velocity" ref={speedRef}>
            0
          </span>
          <span className="hud-drive" ref={driveRef}>
            IDLE
          </span>
        </div>
        <div className="hud-speedbar">
          <div className="hud-speedbar-fill" ref={speedBarRef} />
        </div>
      </div>

      <div className="hud-cluster hud-cluster-right" data-ui>
        <div className="hud-micro">SYSTEM</div>
        <div className="hud-system" ref={systemRef}>
          DEEP SPACE
        </div>
        <div className="hud-heading-row">
          <span className="hud-micro">HDG</span>
          <span className="hud-heading" ref={headingRef}>
            0°
          </span>
        </div>
      </div>
    </>
  )
}
