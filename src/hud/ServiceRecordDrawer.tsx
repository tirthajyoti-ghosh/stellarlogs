import { useEffect, useRef, useState } from 'react'
import { activityState } from '../state/activityState'
import {
  ENDORSEMENT_DEFS,
  getEndorsements,
  pendingEndorsements,
  recordVersion,
  systemsEntered,
  type Endorsement,
} from '../systems/serviceRecord'
import { getTorpsDowned, getRocksStopped } from '../systems/tallies'
import { bbEvent } from '../systems/blackbox'
import { RecordHull } from './RecordHull'

/**
 * THE SERVICE RECORD drawer — terminal v3, LOCKED 2026-09-10.
 * Content-first: the hero is the pilot's ACTUAL hull (tachi.glb as a
 * true orange wireframe, PDCs visible, slowly turning) and the
 * endorsements are unboxed annotations on its flank. The instrument
 * cluster is FIXED — top bar, folder tabs, tick ruler, empty traced
 * frame, thumbnail sockets, register cells, micro-text, grip zone —
 * and data fills its sockets; absence renders as traced glass and
 * [ AVAILABLE ], never as missing UI.
 *
 * The whole slab is a 430x880 stage scaled to the viewport; below a
 * floor scale the drawer scrolls instead of shrinking further.
 */

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
function fmtDate(ms: number): string {
  const d = new Date(ms)
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')} ${d.getFullYear()}`
}

function annValue(e: Endorsement): { v: string; d: string } {
  if (e.signedAt === 0) return { v: '[AWAITING COUNTERSIGN]', d: 'DOCK AT THE DRIFT' }
  const def = ENDORSEMENT_DEFS[e.id]
  const v = e.count > 1 ? `×${e.count}` : e.id === 'pdc-certification' ? 'CERTIFIED' : 'LOGGED'
  return { v, d: `${e.count > 1 ? 'FIRST ' : ''}${fmtDate(e.firstAt)} · ${def.detail}` }
}

/** flank slots (stage y): six sockets down the hull's left side */
const ANN_Y = [158, 220, 282, 344, 406, 468]
const STAGE_W = 540 // 430 slab + off-glass rails
const STAGE_H = 880
const MIN_SCALE = 0.62

export function ServiceRecordDrawer() {
  const [open, setOpen] = useState(false)
  const [battle, setBattle] = useState(false)
  const [scale, setScale] = useState(1)
  const [, setTick] = useState(0)
  const openRef = useRef(open)

  useEffect(() => {
    openRef.current = open
    if (open) bbEvent('sr-open', {})
  }, [open])

  useEffect(() => {
    const fit = () =>
      setScale(Math.max(MIN_SCALE, Math.min((innerHeight * 0.94) / STAGE_H, (innerWidth * 0.96) / STAGE_W)))
    fit()
    addEventListener('resize', fit)
    return () => removeEventListener('resize', fit)
  }, [])

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

  const list = getEndorsements().slice(0, ANN_Y.length)
  const pending = pendingEndorsements().length
  const drillBest = Number(localStorage.getItem('stellarlogs-defense-best-time-v3') ?? 0)
  const runBest = Number(localStorage.getItem('stellarlogs-waterrun-best') ?? 0)

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
          <path d="M5 3 L17 3 L20 6 L20 21 L5 21 Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
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
          <div className="hud-sr-viewport" data-ui>
            <div style={{ width: STAGE_W * scale, height: STAGE_H * scale, margin: 'auto', flexShrink: 0 }}>
              <div className="hud-sr-stage" style={{ transform: `scale(${scale})` }}>
                {/* off-glass: glyph rail (left) + status cluster (right) */}
                <div className="hud-sr-glyphrail">
                  <div className="hud-sr-glyph"><span>◈</span><small>RECORD</small></div>
                  <div className="hud-sr-glyph"><span>⬡</span><small>CERTS</small></div>
                  <div className={`hud-sr-glyph${pending > 0 ? ' primary' : ''}`}><span>✦</span><small>COUNTERSIGN</small></div>
                  <div
                    className="hud-sr-glyph"
                    onClick={() => setOpen(false)}
                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                  >
                    <span>⊖</span><small>CLOSE</small>
                  </div>
                </div>
                <div className="hud-sr-status">
                  <div className="hud-sr-dial" />
                  {pending > 0 && <div className="hud-sr-dot" />}
                  <div className="hud-sr-sqchip g" />
                  <div className="hud-sr-sqchip" />
                  <div>[STATUS]</div>
                </div>

                <div className="hud-sr-slab">
                  <svg className="hud-sr-lines" viewBox="0 0 430 880" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M40 16 L300 16 L312 26 L392 26 L400 34 L400 250 L408 258 L408 560 L400 568 L400 700 L36 700 L28 692 L28 356 L20 348 L20 108 L28 100 L28 26 L40 16 Z" stroke="rgba(216,232,242,0.5)" strokeWidth="1.1" />
                    <g fill="rgba(230,240,250,0.8)">
                      <rect x="37" y="13" width="4.5" height="4.5" /><rect x="397" y="31" width="4.5" height="4.5" />
                      <rect x="405" y="255" width="4.5" height="4.5" /><rect x="405" y="557" width="4.5" height="4.5" />
                      <rect x="25" y="345" width="4.5" height="4.5" /><rect x="33" y="695" width="4.5" height="4.5" />
                    </g>
                    <path d="M60 16 L64 8 L128 8 L132 16" stroke="rgba(195,207,82,0.7)" strokeWidth="1" />
                    <path d="M140 16 L144 8 L196 8 L200 16" stroke="rgba(216,232,242,0.3)" strokeWidth="1" />
                    <path d="M34 24 L268 24 L276 32 L276 54 L42 54 L34 46 Z" stroke="rgba(216,232,242,0.4)" strokeWidth="1" />
                    <g stroke="rgba(216,232,242,0.45)" strokeWidth="1">
                      <rect x="284" y="30" width="18" height="15" rx="2" />
                      <rect x="306" y="30" width="18" height="15" rx="2" />
                      <rect x="328" y="30" width="18" height="15" rx="2" />
                      <circle cx="366" cy="38" r="8" />
                    </g>
                    <path d="M40 150 L52 138 L336 138 L348 150" stroke="rgba(242,196,106,0.55)" strokeWidth="1.2" />
                    <g stroke="rgba(216,232,242,0.5)" strokeWidth="1">
                      <line x1="44" y1="160" x2="44" y2="560" />
                      {ANN_Y.map((y) => (
                        <line key={y} x1="44" y1={y + 10} x2="50" y2={y + 10} />
                      ))}
                      {ANN_Y.map((y) => (
                        <line key={`m${y}`} x1="44" y1={y + 40} x2="47" y2={y + 40} />
                      ))}
                    </g>
                    <path d="M298 158 L390 158 L396 164 L396 198 L304 198 L298 192 Z" stroke="rgba(216,232,242,0.28)" strokeWidth="1" />
                    <g stroke="rgba(216,232,242,0.26)" strokeWidth="1">
                      <rect x="352" y="330" width="44" height="34" />
                      <rect x="352" y="372" width="44" height="34" />
                      <rect x="352" y="414" width="44" height="34" />
                    </g>
                    <path d="M408 300 L422 300 L426 306 L426 330 L422 336 L408 336" stroke="rgba(195,207,82,0.55)" strokeWidth="1" />
                    <g stroke="rgba(216,232,242,0.32)" strokeWidth="1">
                      <path d="M36 576 L160 576 L166 582 L166 666 L36 666 Z" />
                      <path d="M176 576 L294 576 L300 582 L300 666 L176 666 Z" />
                      <path d="M310 576 L394 576 L400 582 L400 620 L310 620 Z" />
                      <path d="M310 630 L394 630 L400 636 L400 666 L310 666 Z" />
                    </g>
                    <path d="M28 742 L402 742" stroke="rgba(216,232,242,0.28)" strokeWidth="1" strokeDasharray="6 5" />
                  </svg>

                  <div className="hud-sr-tab olive" style={{ left: 66 }}>AMNIA REG</div>
                  <div className="hud-sr-tab" style={{ left: 146 }}>PILOT FILE</div>

                  <div className="hud-sr-bar">
                    <span className="fill" />
                    <span className="segs"><i /><i /><i /><i className="c" /><i className="o" /><i className="o" /></span>
                    <span className="pct">CARRIER 61%</span>
                  </div>

                  <div className="hud-sr-head">
                    <div className="anchor">BLT-1129</div>
                    <div className="m">SERVICE RECORD &gt;&gt; ROCINANTE-CLASS / REC 2251-J</div>
                    <div className="m">PILOT <b>NAME WITHHELD</b> / AMNIA PORT AUTHORITY</div>
                  </div>

                  {/* the hero: the real hull, wireframe, PDCs out */}
                  <div className="hud-sr-hero">
                    <RecordHull />
                    <div className="tag">HULL SCAN · LIVE</div>
                  </div>

                  {list.map((e, i) => {
                    const def = ENDORSEMENT_DEFS[e.id]
                    const { v, d } = annValue(e)
                    return (
                      <div
                        key={e.id}
                        className={`hud-sr-ann${e.signedAt === 0 ? ' pending' : ''}`}
                        style={{ top: ANN_Y[i] }}
                      >
                        <div className="issuer">{def.issuer}</div>
                        <div className="deed">{def.deed}</div>
                        <div className="val">{v}</div>
                        <div className="d">{d}</div>
                      </div>
                    )
                  })}

                  <div className="hud-sr-regtag">REG 2251-J</div>

                  <div className="hud-sr-cell" style={{ left: 44, top: 583, width: 114 }}>
                    <div className="cellname">SHIP LOG</div>
                    <div className="kv"><span>SYSTEMS ENTERED</span><b>{systemsEntered()}</b></div>
                    <div className="kv"><span>TORPEDOES DOWNED</span><b>{getTorpsDowned()}</b></div>
                    <div className="kv"><span>ROCKS STOPPED</span><b>{getRocksStopped()}</b></div>
                  </div>
                  <div className="hud-sr-cell" style={{ left: 184, top: 583, width: 108 }}>
                    <div className="cellname">STANDING RECORDS</div>
                    {drillBest <= 0 && runBest <= 0 && (
                      <div className="kv"><span>NONE POSTED</span><b>—</b></div>
                    )}
                    {drillBest > 0 && (
                      <div className="kv"><span>PDC DRILL · BEST</span><b>{drillBest.toFixed(1)}S</b></div>
                    )}
                    {runBest > 0 && (
                      <div className="kv"><span>WATER RUN · BEST</span><b>{runBest.toFixed(1)}S</b></div>
                    )}
                  </div>
                  <div className="hud-sr-avail" style={{ left: 310, top: 576, width: 90, height: 44 }}>[ AVAILABLE ]</div>
                  <div className="hud-sr-avail" style={{ left: 310, top: 630, width: 90, height: 36 }}>[ AVAILABLE ]</div>

                  <div className="hud-sr-micro">
                    reg.amnia/portauthority spool 2251-J relay mirror confirmed uplink drift-9 checksum 88A2 F0C1
                    44E9 001B endorsement ledger schema 11c countersign authority delegated dockmaster militia
                    constabulary civil defense surveyor office record retention indefinite no liens posted no
                    warrants posted clearance class c
                  </div>
                  <div className="hud-sr-loglines">
                    {list.length === 0 && <div>&gt; no endorsements on file — the lane provides</div>}
                    {pending > 0 && (
                      <>
                        <div>&gt; AMNIA.REG/endorse :: <span className="a">countersign PENDING ×{pending}</span></div>
                        <div>&gt; call at INTERAMNIA DRIFT to countersign <span className="hud-sr-cursor" /></div>
                      </>
                    )}
                    {pending === 0 && list.length > 0 && (
                      <>
                        <div>&gt; #2251944::Record_Sync[] <span className="g">OK</span> · all endorsements countersigned</div>
                        <div>&gt; record is the pilot&apos;s own · authorities stamp what they witness <span className="hud-sr-cursor" /></div>
                      </>
                    )}
                  </div>

                  <div className="hud-sr-keypad"><i /><i /><i /><i /><i /><i /><i /><i /></div>
                  <div className="hud-sr-thumb" />
                  <div className="hud-sr-edge" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
