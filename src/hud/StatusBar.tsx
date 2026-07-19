import { useEffect, useRef } from 'react'
import { hudReadouts } from './hudState'

const RCS_KEYS = ['yawL', 'yawR', 'pitchU', 'pitchD', 'strafeL', 'strafeR', 'retro'] as const
const RCS_GLYPH: Record<(typeof RCS_KEYS)[number], string> = {
  yawL: '⟲',
  yawR: '⟳',
  pitchU: '▲',
  pitchD: '▼',
  strafeL: '◀',
  strafeR: '▶',
  retro: '⇊',
}

/**
 * Flight readouts. Left cluster: velocity, drive state, speed bar, RCS
 * activity, position, gravity-well warning. Right cluster: current system,
 * heading, nearest-target data. All values written by HudBridge.
 */
export function StatusBar() {
  const speedRef = useRef<HTMLSpanElement>(null)
  const speedBarRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLSpanElement>(null)
  const systemRef = useRef<HTMLDivElement>(null)
  const driveRef = useRef<HTMLSpanElement>(null)
  const posRef = useRef<HTMLDivElement>(null)
  const gravRef = useRef<HTMLSpanElement>(null)
  const targetNameRef = useRef<HTMLSpanElement>(null)
  const targetDistRef = useRef<HTMLSpanElement>(null)
  const targetCloseRef = useRef<HTMLSpanElement>(null)
  const rcsRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    hudReadouts.speedEl = speedRef.current
    hudReadouts.speedBarEl = speedBarRef.current
    hudReadouts.headingEl = headingRef.current
    hudReadouts.systemEl = systemRef.current
    hudReadouts.driveEl = driveRef.current
    hudReadouts.posEl = posRef.current
    hudReadouts.gravEl = gravRef.current
    hudReadouts.targetNameEl = targetNameRef.current
    hudReadouts.targetDistEl = targetDistRef.current
    hudReadouts.targetCloseEl = targetCloseRef.current
    hudReadouts.rcsEls = rcsRefs.current
    return () => {
      hudReadouts.speedEl = null
      hudReadouts.speedBarEl = null
      hudReadouts.headingEl = null
      hudReadouts.systemEl = null
      hudReadouts.driveEl = null
      hudReadouts.posEl = null
      hudReadouts.gravEl = null
      hudReadouts.targetNameEl = null
      hudReadouts.targetDistEl = null
      hudReadouts.targetCloseEl = null
      hudReadouts.rcsEls = {}
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
          <span className="hud-grav" ref={gravRef}>
            GRAV
          </span>
        </div>
        <div className="hud-speedbar">
          <div className="hud-speedbar-fill" ref={speedBarRef} />
        </div>
        <div className="hud-rcs-row">
          <span className="hud-micro">RCS</span>
          {RCS_KEYS.map((key) => (
            <span
              key={key}
              className="hud-rcs-light"
              ref={(el) => {
                rcsRefs.current[key] = el
              }}
            >
              {RCS_GLYPH[key]}
            </span>
          ))}
        </div>
        <div className="hud-pos" ref={posRef}>
          POS +0 +0 +0
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
        <div className="hud-target">
          <div className="hud-micro">NEAREST CONTACT</div>
          <div className="hud-target-row">
            <span className="hud-target-name" ref={targetNameRef}>
              —
            </span>
          </div>
          <div className="hud-target-row hud-target-data">
            <span ref={targetDistRef}>—</span>
            <span ref={targetCloseRef} className="hud-target-close">
              —
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
