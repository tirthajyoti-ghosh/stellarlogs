import { useEffect, useRef } from 'react'
import { hudReadouts } from './hudState'

/**
 * Flight reticle: a fixed boresight at screen center (where the nose points)
 * and a prograde marker (where the ship is actually drifting) positioned by
 * HudBridge. The gap between them is the drift — the core Newtonian readout.
 */
export function Reticle() {
  const progradeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    hudReadouts.progradeEl = progradeRef.current
    return () => {
      hudReadouts.progradeEl = null
    }
  }, [])

  return (
    <>
      <div className="hud-boresight" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="hud-prograde" ref={progradeRef} aria-hidden>
        <div className="hud-prograde-ring" />
        <span className="hud-prograde-label">PRG</span>
      </div>
    </>
  )
}
