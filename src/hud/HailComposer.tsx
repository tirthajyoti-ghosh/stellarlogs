import { useEffect, useRef, useState } from 'react'
import { Vector3 } from 'three'
import { shipRig } from '../state/shipRig'
import { activityState, say } from '../state/activityState'
import { sendHail, localFlag } from '../systems/liveness'
import { HAIL_OPENERS, HAIL_LINES, HAIL_SIGNOFFS, composeHail } from '../config/hails'
import { STATION_POSITION } from '../config/universe'
import { bbEvent } from '../systems/blackbox'

/**
 * THE TRANSMITTER (docs/the-liveness.md L3 — his GO 2026-09-01).
 * The hail composer lives at the Comms Station only — writing costs
 * a trip (cheap but not free, the research's ceremony law). Inside
 * range a chip offers TRANSMIT (T on desktop, tap on touch); the
 * composer is three phrasebook columns — opener × line × sign-off —
 * because a hail is never free text (Branch B, his ruling). The relay
 * answers honestly: sent, throttled, or down.
 */

const STATION = new Vector3(...STATION_POSITION)
const RANGE = 460

export function HailComposer() {
  const [near, setNear] = useState(false)
  const [open, setOpen] = useState(false)
  const [o, setO] = useState(0)
  const [l, setL] = useState(0)
  const [s, setS] = useState(0)
  const [busy, setBusy] = useState(false)
  const openRef = useRef(open)
  const nearRef = useRef(near)
  useEffect(() => {
    openRef.current = open
    nearRef.current = near
  }, [open, near])

  useEffect(() => {
    const id = setInterval(() => {
      const inRange = shipRig.position.distanceTo(STATION) < RANGE && !activityState.battle
      if (inRange !== nearRef.current) setNear(inRange)
      if (!inRange && openRef.current) setOpen(false)
    }, 500)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'KeyT' && !e.repeat && nearRef.current && !openRef.current) {
        setOpen(true)
        bbEvent('hail-open', { via: 'key' })
      }
      if (e.code === 'Escape' && openRef.current) setOpen(false)
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  async function transmit(): Promise<void> {
    if (busy) return
    setBusy(true)
    const result = await sendHail(o, l, s)
    bbEvent('hail-send', { o, l, s, result })
    if (result === 'ok') {
      say(1, 'TRANSMISSION ON THE LINE — THE BUOY IS YOURS', 'win', 3)
      setOpen(false)
    } else if (result === 'later') {
      say(1, 'THE RELAY NEEDS TIME — TRY AGAIN LATER', 'info', 2.6)
    } else {
      say(1, 'RELAY UNREACHABLE — NOTHING SENT', 'fail', 2.6)
    }
    setBusy(false)
  }

  if (!near) return null
  const flag = localFlag()

  return (
    <>
      {!open && (
        <button
          className="hud-hail-chip"
          data-ui
          onClick={() => {
            setOpen(true)
            bbEvent('hail-open', { via: 'chip' })
          }}
        >
          ⌁ TRANSMIT<span className="hud-hail-chip-key"> — T</span>
        </button>
      )}
      {open && (
        <>
          <div className="hud-hail-scrim" data-ui onClick={() => setOpen(false)} />
          <div className="hud-hail" data-ui>
            <div className="hud-hail-title">COMMS ARRAY — STANDARD TRAFFIC PHRASES</div>
            <div className="hud-hail-cols">
              <div className="hud-hail-col">
                <div className="hud-hail-col-name">OPENER</div>
                {HAIL_OPENERS.map((p, i) => (
                  <button key={i} data-on={i === o ? '1' : ''} onClick={() => setO(i)}>
                    {p || '· SILENCE ·'}
                  </button>
                ))}
              </div>
              <div className="hud-hail-col">
                <div className="hud-hail-col-name">TRANSMISSION</div>
                {HAIL_LINES.map((p, i) => (
                  <button key={i} data-on={i === l ? '1' : ''} onClick={() => setL(i)}>
                    {p}
                  </button>
                ))}
              </div>
              <div className="hud-hail-col">
                <div className="hud-hail-col-name">SIGN-OFF</div>
                {HAIL_SIGNOFFS.map((p, i) => (
                  <button key={i} data-on={i === s ? '1' : ''} onClick={() => setS(i)}>
                    {p || '· NONE ·'}
                  </button>
                ))}
              </div>
            </div>
            <div className="hud-hail-preview">
              {composeHail(o, l, s)}
              {flag ? <span className="hud-hail-flag"> [{flag}]</span> : null}
            </div>
            <div className="hud-hail-actions">
              <button className="hud-hail-send" disabled={busy} onClick={() => void transmit()}>
                {busy ? 'RELAYING…' : 'TRANSMIT'}
              </button>
              <button className="hud-hail-close" onClick={() => setOpen(false)}>
                CLOSE
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
