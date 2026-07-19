import { useEffect, useRef } from 'react'
import { hudReadouts } from './hudState'

/**
 * Jump-drive status: phase, destination, remaining distance and ETA.
 * Visible only while the drive is active (CSS keyed on body[data-warpphase]).
 */
export function WarpPanel() {
  const destRef = useRef<HTMLSpanElement>(null)
  const distRef = useRef<HTMLSpanElement>(null)
  const phaseRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    hudReadouts.warpDestEl = destRef.current
    hudReadouts.warpDistEl = distRef.current
    hudReadouts.warpPhaseEl = phaseRef.current
    return () => {
      hudReadouts.warpDestEl = null
      hudReadouts.warpDistEl = null
      hudReadouts.warpPhaseEl = null
    }
  }, [])

  return (
    <div className="hud-warp-panel" data-ui>
      <span className="hud-warp-phase" ref={phaseRef}>
        ALIGNING
      </span>
      <span className="hud-warp-dest" ref={destRef}>
        —
      </span>
      <span className="hud-warp-dist" ref={distRef}>
        —
      </span>
    </div>
  )
}
