import { useEffect, useRef, useState } from 'react'
import { activityState } from '../state/activityState'
import {
  ENDORSEMENT_DEFS,
  getEndorsements,
  pendingEndorsements,
  recordVersion,
  type Endorsement,
} from '../systems/serviceRecord'
import { bbEvent } from '../systems/blackbox'

/**
 * THE SERVICE RECORD drawer (terminal.html v2, LOCKED 2026-09-09).
 * The pilot's hand terminal as a HUD drawer: L on desktop, the record
 * chip on any platform. Carries the locked dress — stepped chamfered
 * frame with junction squares, the maroon header band, olive-hairline
 * endorsement rows with amber values, the segmented STANDING meter,
 * and the mono log strip that tells the countersign story.
 *
 * No empty slots ever: the drawer renders what is IN the record.
 */

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
function fmtDate(ms: number): string {
  const d = new Date(ms)
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')} ${d.getFullYear()}`
}

function rowValue(e: Endorsement): { n: string; d: string } {
  if (e.signedAt === 0) return { n: '[AWAITING COUNTERSIGN]', d: 'DOCK AT THE DRIFT' }
  const def = ENDORSEMENT_DEFS[e.id]
  const n = e.count > 1 ? `×${e.count}` : e.id === 'pdc-certification' ? 'CERTIFIED' : 'LOGGED'
  const d = `${e.count > 1 ? 'FIRST ' : ''}${fmtDate(e.firstAt)} · ${def.detail}`
  return { n, d }
}

export function ServiceRecordDrawer() {
  const [open, setOpen] = useState(false)
  const [battle, setBattle] = useState(false)
  const [, setTick] = useState(0)
  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
    if (open) bbEvent('sr-open', {})
  }, [open])

  // cheap refresh: follow recordVersion and battle state
  useEffect(() => {
    let last = recordVersion.n
    const id = setInterval(() => {
      if (recordVersion.n !== last) {
        last = recordVersion.n
        setTick((t) => t + 1)
      }
      setBattle(activityState.battle)
      if (activityState.battle && openRef.current) setOpen(false)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'KeyL' && !e.repeat && !activityState.battle) setOpen((o) => !o)
      if (e.code === 'Escape' && openRef.current) setOpen(false)
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  const list = getEndorsements()
  const pending = pendingEndorsements().length
  const signed = list.length - pending

  return (
    <>
      <button
        className="hud-sr-chip"
        data-ui
        data-pending={pending > 0 ? '1' : ''}
        data-battle={battle ? '1' : ''}
        onClick={() => setOpen((o) => !o)}
        aria-label="Service record"
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path
            d="M5 3 L17 3 L20 6 L20 21 L5 21 Z"
            fill="none" stroke="currentColor" strokeWidth="1.6"
          />
          <line x1="8" y1="9" x2="17" y2="9" stroke="currentColor" strokeWidth="1.4" />
          <line x1="8" y1="13" x2="17" y2="13" stroke="currentColor" strokeWidth="1.4" />
          <line x1="8" y1="17" x2="14" y2="17" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        <span className="hud-sr-chip-label">RECORD</span>
        <i className="hud-sr-chip-dot" />
      </button>

      {open && (
        <>
          <div className="hud-sr-scrim" data-ui onClick={() => setOpen(false)} />
          <div className="hud-sr" data-ui>
            <i className="hud-sr-jsq tl" /><i className="hud-sr-jsq tr" />
            <i className="hud-sr-jsq bl" /><i className="hud-sr-jsq br" />
            <div className="hud-sr-band">
              <div className="hud-sr-hull">BLT-1129</div>
              <div className="hud-sr-under">
                SERVICE RECORD · ROCINANTE-CLASS — <b>PILOT NAME WITHHELD</b>
              </div>
            </div>
            <div className="hud-sr-rows">
              {list.map((e) => {
                const def = ENDORSEMENT_DEFS[e.id]
                const v = rowValue(e)
                return (
                  <div className="hud-sr-row" data-pending={e.signedAt === 0 ? '1' : ''} key={e.id}>
                    <i className="hud-sr-tab" />
                    <div className="hud-sr-cell">
                      <div className="hud-sr-deed">
                        <div className="hud-sr-issuer">{def.issuer}</div>
                        <div className="hud-sr-what">{def.deed}</div>
                      </div>
                      <div className="hud-sr-val">
                        <div className="hud-sr-n">{v.n}</div>
                        <div className="hud-sr-d">{v.d}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="hud-sr-standing">
              <span className="hud-sr-slbl">STANDING:</span>
              <span className="hud-sr-segs">
                {Array.from({ length: 8 }, (_, i) => (
                  <i key={i} data-on={i < signed ? '1' : ''} />
                ))}
              </span>
              <span className="hud-sr-cap">
                {signed > 0
                  ? `${signed} ENDORSED`
                  : list.length > 0
                    ? 'PENDING COUNTERSIGN'
                    : 'NO ENDORSEMENTS'}
              </span>
              <span className="hud-sr-slbl hud-sr-clr">
                {signed >= 4 ? 'CLASS C CLEARANCE' : ''}
              </span>
            </div>
            <div className="hud-sr-log">
              {list.length === 0 && (
                <div>&gt; no endorsements on file — the lane provides</div>
              )}
              {pending > 0 && (
                <>
                  <div>
                    &gt; AMNIA.REG/endorse :: <span className="a">countersign PENDING ×{pending}</span>
                  </div>
                  <div>&gt; call at INTERAMNIA DRIFT to countersign</div>
                </>
              )}
              {pending === 0 && list.length > 0 && (
                <div>
                  &gt; #2251944::Record_Sync[] <span className="g">OK</span> · all endorsements countersigned
                </div>
              )}
              <div>
                &gt; record is the pilot&apos;s own · authorities stamp what they witness{' '}
                <span className="hud-sr-cursor" />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
