import { useEffect, useRef, useState } from 'react'
import { IS_TOUCH } from '../config/quality'
import { NAV_SECTIONS } from './Cockpit'
import { shipRig } from '../state/shipRig'
import { warp } from '../physics/warp'
import { activityState } from '../state/activityState'
import { armJump } from './deckState'
import { bbEvent } from '../systems/blackbox'

/**
 * THE CHART (docs/the-mobile-deck.md A) — the phone's jump drive.
 *
 * Desktop jumps live in the console list and the radar's blips; both
 * are hidden on phones, which until this file meant a phone could
 * never leave the neighborhood. Now: the top-left nav chip opens a
 * full-height drawer of the same sectioned chart — DOCKS / PORTFOLIO
 * SYSTEMS / UNSURVEYED — in big thumb rows. Tapping a row ARMS the
 * jump; the ◇ satellite in the right-thumb arc fires it.
 */
export function ChartDrawer() {
  const [open, setOpen] = useState(false)
  const [, force] = useState(0)
  const systemRef = useRef<HTMLDivElement>(null)

  // the chip mirrors the nav computer's system line at 1 Hz
  useEffect(() => {
    if (!IS_TOUCH) return
    const id = setInterval(() => {
      const src = document.querySelector('.hud-system')
      const el = systemRef.current
      if (src && el && el.textContent !== src.textContent) el.textContent = src.textContent
      if (open) force((n) => n + 1) // live distances while the chart is out
    }, 1000)
    return () => clearInterval(id)
  }, [open])

  if (!IS_TOUCH) return null

  return (
    <>
      <button
        className="hud-chart-chip"
        data-ui
        onClick={() => {
          setOpen((o) => !o)
          bbEvent('deck', { chart: 'toggle' })
        }}
      >
        {/* a MAP says map (Lucide 'map', ISC) — the ◇ alone did not */}
        <svg className="hud-chart-chip-icon" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
          />
          <path d="M15 5.764v15M9 3.236v15" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        <span ref={systemRef}>DEEP SPACE</span>
      </button>
      {open && (
        <>
          <div className="hud-chart-scrim" data-ui onClick={() => setOpen(false)} />
          <div className="hud-chart" data-ui>
          <div className="hud-chart-title">THE CHART — FIRST CHARTS REGISTRY</div>
          <div className="hud-chart-list">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <div className="hud-chart-section" style={{ color: section.color }}>
                  {section.title}
                </div>
                {section.dests.map((dest) => {
                  const dist = dest.position.distanceTo(shipRig.position)
                  const here = dist < dest.standoff * 1.3
                  const frontier = section.title === 'UNSURVEYED'
                  const locked = here || frontier || activityState.battle || warp.phase !== 'idle'
                  return (
                    <button
                      key={dest.id}
                      className="hud-chart-row"
                      data-frontier={frontier ? '1' : ''}
                      disabled={locked}
                      onClick={() => {
                        if (locked) return
                        armJump(dest.name, dest.position, dest.standoff)
                        setOpen(false)
                        bbEvent('deck', { chart: 'arm', dest: dest.id })
                      }}
                    >
                      <span className="hud-chart-dot" style={{ background: dest.color }} />
                      <span className="hud-chart-name">{dest.name}</span>
                      <span className="hud-chart-dist">
                        {frontier ? 'NO CHART' : here ? 'HERE' : `${(dist / 1000).toFixed(1)}K`}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          {activityState.battle && <div className="hud-chart-lock">NO JUMPS UNDER FIRE</div>}
          </div>
        </>
      )}
    </>
  )
}
