import { useEffect, useRef, useState } from 'react'
import { Vector3 } from 'three'
import { hudReadouts } from './hudState'
import { Radar } from './Radar'
import { ALL_SYSTEMS } from '../config/systems'
import { STATION_POSITION } from '../config/universe'
import { CONTACT } from '../content/contact'
import { startWarp, warp } from '../physics/warp'
import { shipRig } from '../state/shipRig'

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

/**
 * The pilot's dashboard: a center drive console tilted toward the seat and
 * two side MFDs canted inward — navigation (with the jump-drive computer) on
 * the left, tactical (radar + nearest contact) on the right.
 */
export function Cockpit() {
  const speedRef = useRef<HTMLSpanElement>(null)
  const speedBarRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLElement>(null)
  const systemRef = useRef<HTMLDivElement>(null)
  const driveRef = useRef<HTMLSpanElement>(null)
  const posRef = useRef<HTMLElement>(null)
  const gravRef = useRef<HTMLSpanElement>(null)
  const targetNameRef = useRef<HTMLSpanElement>(null)
  const targetDistRef = useRef<HTMLElement>(null)
  const targetCloseRef = useRef<HTMLElement>(null)
  const rcsRefs = useRef<Record<string, HTMLElement | null>>({})
  const [navOpen, setNavOpen] = useState(false)
  const [, setTick] = useState(0)

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyN') setNavOpen((o) => !o)
      if (e.code === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!navOpen) return
    const id = setInterval(() => setTick((t) => t + 1), 500)
    return () => clearInterval(id)
  }, [navOpen])

  return (
    <div className="hud-cockpit">
      {/* Console housing shadow along the bottom */}
      <div className="hud-console-housing" />

      {/* Left MFD — navigation computer */}
      <div className="hud-mfd hud-mfd-left" data-ui>
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
        <button className="hud-jump-btn" onClick={() => setNavOpen((o) => !o)}>
          JUMP DRIVE <span className="hud-key-hint">N</span>
        </button>
        {navOpen && (
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
                      setNavOpen(false)
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
        )}
      </div>

      {/* Center console — the drive */}
      <div className="hud-console" data-ui>
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

      {/* Right MFD — tactical */}
      <div className="hud-mfd hud-mfd-right" data-ui>
        <div className="hud-mfd-title">TACTICAL</div>
        <Radar />
        <div className="hud-target-name-row">
          <span className="hud-target-name" ref={targetNameRef}>
            —
          </span>
        </div>
        <div className="hud-mfd-data">
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
