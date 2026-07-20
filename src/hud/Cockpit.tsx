import { useEffect, useRef, useState } from 'react'
import { Vector3 } from 'three'
import { hudReadouts } from './hudState'
import { Radar } from './Radar'
import { ALL_SYSTEMS } from '../config/systems'
import { STATION_POSITION } from '../config/universe'
import { CONTACT } from '../content/contact'
import { startWarp, warp } from '../physics/warp'
import { shipRig } from '../state/shipRig'

interface Destination {
  id: string
  name: string
  color: string
  position: Vector3
  standoff: number
}

const DESTINATIONS: Destination[] = [
  ...ALL_SYSTEMS.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.starColor,
    position: new Vector3(...s.position),
    standoff: s.starRadius * 6 + 1600,
  })),
  {
    id: 'station',
    name: CONTACT.name,
    color: CONTACT.starColor,
    position: new Vector3(...STATION_POSITION),
    standoff: 420,
  },
]

/** Live top-down ship schematic: thruster ticks light where exhaust fires. */
function ShipSchematic() {
  const refs = useRef<Record<string, SVGElement | null>>({})

  useEffect(() => {
    hudReadouts.shipVizEls = refs.current
    return () => {
      hudReadouts.shipVizEls = {}
    }
  }, [])

  const tick = (key: string, x: number, y: number, w: number, h: number) => (
    <rect
      key={key}
      ref={(el) => {
        refs.current[key] = el
      }}
      x={x}
      y={y}
      width={w}
      height={h}
      fill="#6fd3e8"
      opacity={0.12}
    />
  )

  return (
    <svg className="hud-shipviz" viewBox="0 0 132 96" aria-hidden>
      {/* Hull, top-down */}
      <polygon
        points="66,8 78,20 78,58 72,76 60,76 54,58 54,20"
        fill="rgba(111, 211, 232, 0.08)"
        stroke="rgba(140, 200, 225, 0.55)"
        strokeWidth="1"
      />
      {/* Drive section */}
      <rect x="57" y="66" width="18" height="10" fill="none" stroke="rgba(140, 200, 225, 0.4)" strokeWidth="1" />
      {/* Main drive flame */}
      <polygon
        ref={(el) => {
          refs.current.flame = el
        }}
        points="59,78 73,78 66,93"
        fill="#7fd4ff"
        opacity={0.1}
      />
      {/* Retro nozzles at the nose (fire forward) */}
      {tick('retroL', 58, 1, 4, 6)}
      {tick('retroR', 70, 1, 4, 6)}
      {/* Bow lateral thrusters */}
      {tick('bowL', 44, 18, 9, 4)}
      {tick('bowR', 79, 18, 9, 4)}
      {/* Stern lateral thrusters */}
      {tick('sternL', 44, 60, 9, 4)}
      {tick('sternR', 79, 60, 9, 4)}
      {/* Pitch chevrons (nose up / down) */}
      <polyline
        ref={(el) => {
          refs.current.chevU = el
        }}
        points="61,34 66,29 71,34"
        fill="none"
        stroke="#6fd3e8"
        strokeWidth="2"
        opacity={0.12}
      />
      <polyline
        ref={(el) => {
          refs.current.chevD = el
        }}
        points="61,42 66,47 71,42"
        fill="none"
        stroke="#6fd3e8"
        strokeWidth="2"
        opacity={0.12}
      />
    </svg>
  )
}

/**
 * The pilot's dashboard: center drive console (velocity + live thruster
 * schematic), left NAVIGATION MFD with a paged jump-drive computer, right
 * TACTICAL MFD (radar + nearest contact).
 */
export function Cockpit() {
  const speedRef = useRef<HTMLSpanElement>(null)
  const headingRef = useRef<HTMLElement>(null)
  const systemRef = useRef<HTMLDivElement>(null)
  const driveRef = useRef<HTMLSpanElement>(null)
  const posRef = useRef<HTMLElement>(null)
  const gravRef = useRef<HTMLSpanElement>(null)
  const pitchRef = useRef<HTMLElement>(null)
  const targetChipRef = useRef<HTMLSpanElement>(null)
  const targetNameRef = useRef<HTMLSpanElement>(null)
  const targetBearingRef = useRef<HTMLSpanElement>(null)
  const targetRangeRef = useRef<HTMLElement>(null)
  const targetCloseRef = useRef<HTMLElement>(null)
  const targetPurposeRef = useRef<HTMLSpanElement>(null)
  const [jumpPage, setJumpPage] = useState(false)
  const [, setTick] = useState(0)

  useEffect(() => {
    hudReadouts.speedEl = speedRef.current
    hudReadouts.headingEl = headingRef.current
    hudReadouts.systemEl = systemRef.current
    hudReadouts.driveEl = driveRef.current
    hudReadouts.posEl = posRef.current
    hudReadouts.gravEl = gravRef.current
    hudReadouts.pitchEl = pitchRef.current
    hudReadouts.targetChipEl = targetChipRef.current
    hudReadouts.targetNameEl = targetNameRef.current
    hudReadouts.targetBearingEl = targetBearingRef.current
    hudReadouts.targetRangeEl = targetRangeRef.current
    hudReadouts.targetCloseEl = targetCloseRef.current
    hudReadouts.targetPurposeEl = targetPurposeRef.current
    return () => {
      hudReadouts.speedEl = null
      hudReadouts.headingEl = null
      hudReadouts.systemEl = null
      hudReadouts.driveEl = null
      hudReadouts.posEl = null
      hudReadouts.gravEl = null
      hudReadouts.pitchEl = null
      hudReadouts.targetChipEl = null
      hudReadouts.targetNameEl = null
      hudReadouts.targetBearingEl = null
      hudReadouts.targetRangeEl = null
      hudReadouts.targetCloseEl = null
      hudReadouts.targetPurposeEl = null
    }
  }, [jumpPage])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyN') setJumpPage((o) => !o)
      if (e.code === 'Escape') setJumpPage(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!jumpPage) return
    const id = setInterval(() => setTick((t) => t + 1), 500)
    return () => clearInterval(id)
  }, [jumpPage])

  // Tactical contact → jump to its system/station (radar blips do the same)
  const jumpToContact = () => {
    const j = hudReadouts.targetJump
    if (!j || warp.phase !== 'idle') return
    if (j.position.distanceTo(shipRig.position) < j.standoff * 1.3) return
    startWarp(j.position, shipRig.position, j.standoff)
  }

  return (
    <div className="hud-cockpit">
      <div className="hud-console-housing" />

      {/* Left MFD — navigation computer with status / jump pages */}
      <div className="hud-mfd hud-mfd-left" data-ui>
        {!jumpPage ? (
          <div key="nav-page">
            <div className="hud-mfd-title">NAVIGATION</div>
            <div className="hud-system" ref={systemRef}>
              DEEP SPACE
            </div>
            <div className="hud-mfd-data">
              <span>
                HDG <b ref={headingRef}>0°</b>
              </span>
              <span>
                <b ref={posRef}>0 0 0</b>
              </span>
            </div>
            <button className="hud-jump-btn" onClick={() => setJumpPage(true)}>
              JUMP DRIVE <span className="hud-key-hint">N</span>
            </button>
          </div>
        ) : (
          <div key="jump-page">
            <div className="hud-mfd-title">JUMP DRIVE — DESTINATION</div>
            <div className="hud-jump-list">
              {DESTINATIONS.map((dest) => {
                const dist = dest.position.distanceTo(shipRig.position)
                const here = dist < dest.standoff * 1.3
                return (
                  <button
                    key={dest.id}
                    className="hud-nav-dest"
                    disabled={here}
                    onClick={() => {
                      if (warp.phase === 'idle') {
                        startWarp(dest.position, shipRig.position, dest.standoff)
                        setJumpPage(false)
                      }
                    }}
                  >
                    <span className="hud-nav-dot" style={{ background: dest.color }} />
                    <span className="hud-nav-name">{dest.name}</span>
                    <span className="hud-nav-dist">
                      {here ? 'HERE' : `${(dist / 1000).toFixed(1)}k`}
                    </span>
                  </button>
                )
              })}
            </div>
            <button className="hud-jump-btn" onClick={() => setJumpPage(false)}>
              BACK <span className="hud-key-hint">ESC</span>
            </button>
          </div>
        )}
      </div>

      {/* Center console — drive + live thruster schematic */}
      <div className="hud-console" data-ui>
        <div className="hud-console-cols">
          <div className="hud-console-drive">
            <div className="hud-mfd-title">DRIVE</div>
            <div className="hud-velocity-row">
              <span className="hud-velocity" ref={speedRef}>
                0
              </span>
              <span className="hud-velocity-unit">M/S</span>
            </div>
            <span className="hud-drive" ref={driveRef}>
              IDLE
            </span>
            <div className="hud-console-flags">
              <span className="hud-grav" ref={gravRef}>
                GRAV
              </span>
              <span className="hud-pitch">
                PITCH <b ref={pitchRef}>+0°</b>
              </span>
            </div>
          </div>
          <ShipSchematic />
        </div>
      </div>

      {/* Right MFD — tactical */}
      <div className="hud-mfd hud-mfd-right" data-ui>
        <div className="hud-mfd-title">TACTICAL</div>
        <Radar />
        <button className="hud-target" onClick={jumpToContact} title="Jump to this contact">
          <div className="hud-target-head">
            <span className="hud-target-chip" ref={targetChipRef}>
              —
            </span>
            <span className="hud-target-bearing" ref={targetBearingRef} aria-hidden>
              ▲
            </span>
          </div>
          <span className="hud-target-name" ref={targetNameRef}>
            —
          </span>
          <div className="hud-target-line">
            <span ref={targetRangeRef}>—</span>
            <span className="hud-target-close" ref={targetCloseRef}>
              —
            </span>
          </div>
          <span className="hud-target-purpose" ref={targetPurposeRef}>
            —
          </span>
        </button>
      </div>
    </div>
  )
}
