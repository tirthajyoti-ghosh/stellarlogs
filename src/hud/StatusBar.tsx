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
 * The cockpit dashboard: three chamfered instrument plates along the bottom —
 * drive (velocity, mode, RCS), navigation (system, heading, position), and
 * the nearest-contact sensor readout. All values written by HudBridge.
 */
export function StatusBar() {
  const speedRef = useRef<HTMLSpanElement>(null)
  const speedBarRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLSpanElement>(null)
  const systemRef = useRef<HTMLDivElement>(null)
  const driveRef = useRef<HTMLSpanElement>(null)
  const posRef = useRef<HTMLSpanElement>(null)
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
    <div className="hud-dash" data-ui>
      <div className="hud-plate hud-plate-drive">
        <div className="hud-plate-title">DRIVE</div>
        <div className="hud-velocity-row">
          <span className="hud-velocity" ref={speedRef}>
            0
          </span>
          <span className="hud-velocity-unit">M/S</span>
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
          <span className="hud-rcs-label">RCS</span>
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
      </div>

      <div className="hud-plate hud-plate-nav">
        <div className="hud-plate-title">NAVIGATION</div>
        <div className="hud-system" ref={systemRef}>
          DEEP SPACE
        </div>
        <div className="hud-nav-data">
          <span>
            HDG <b ref={headingRef}>0°</b>
          </span>
          <span>
            <b ref={posRef}>POS 0 0 0</b>
          </span>
        </div>
      </div>

      <div className="hud-plate hud-plate-contact">
        <div className="hud-plate-title">NEAREST CONTACT</div>
        <div className="hud-target-name-row">
          <span className="hud-target-name" ref={targetNameRef}>
            —
          </span>
        </div>
        <div className="hud-nav-data">
          <span>
            RNG <b ref={targetDistRef}>—</b>
          </span>
          <span>
            VEL <b ref={targetCloseRef} className="hud-target-close">—</b>
          </span>
        </div>
      </div>
    </div>
  )
}
