import { useEffect, useRef, useState } from 'react'
import { shipInput } from '../physics/shipInput'
import { requestFlip } from '../physics/flip'
import { activityState } from '../state/activityState'
import { startWarp, warp } from '../physics/warp'
import { shipRig } from '../state/shipRig'
import { IS_TOUCH } from '../config/quality'
import { deckState, clearJump } from './deckState'
import { bbEvent } from '../systems/blackbox'

const STICK_RADIUS = 60

/** Icons from Lucide (ISC) drawn in our stroke weight, plus the house
 *  warp diamond. The drive flame is the same fire the plume burns. */
function Glyph({ kind }: { kind: 'burn' | 'flip' | 'jump' | 'up' | 'down' | 'thrust' }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (kind) {
    case 'burn':
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" />
        </svg>
      )
    case 'thrust':
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="m17 14-5-5-5 5" />
        </svg>
      )
    case 'up':
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="m17 11-5-5-5 5" />
          <path d="m17 18-5-5-5 5" />
        </svg>
      )
    case 'down':
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="m7 6 5 5 5-5" />
          <path d="m7 13 5 5 5-5" />
        </svg>
      )
    case 'flip':
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      )
    case 'jump':
      return (
        <svg viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M12 3 L21 12 L12 21 L3 12 Z" />
          <path d="M12 8 L16 12 L12 16 L8 12 Z" fill="currentColor" stroke="none" />
        </svg>
      )
  }
}

/**
 * THE MOBILE DECK (docs/the-mobile-deck.md) — the genre's grammar in
 * our language.
 *
 * Left zone: a FLOATING stick — it appears under the thumb wherever
 * the thumb lands, steers the nose, and ghosts away when idle. Right
 * corner: the ARC — BURN big at the thumb's rest, BOOST above, REV
 * inner, FLIP outer, all icons. The ◇ jump satellite appears only
 * when the chart has armed a destination. Accept chips sit
 * bottom-center and hide during battle. Everything else on the right
 * half of the screen is camera drag (the window-level orbit handler
 * takes anything that isn't [data-ui]).
 */
export function TouchControls() {
  const zoneRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const [canRestart, setCanRestart] = useState(false)
  const [hasOffer, setHasOffer] = useState(false)
  const [hasHunt, setHasHunt] = useState(false)
  const [battle, setBattle] = useState(false)
  const [armed, setArmed] = useState<string | null>(null)
  const [detent, setDetent] = useState<'max' | 'thrust' | 'coast' | 'rev'>('coast')
  const columnRef = useRef<HTMLDivElement>(null)
  const used = useRef(new Set<string>())

  useEffect(() => {
    if (!IS_TOUCH) return
    const id = setInterval(() => {
      setCanRestart(activityState.canRestart)
      setHasOffer(activityState.offer !== '')
      setHasHunt(activityState.offerHunt !== '')
      setBattle(activityState.battle)
      setArmed(deckState.armed?.name ?? null)
      // a warp begun any other way clears the armed satellite
      if (deckState.armed && warp.phase !== 'idle') clearJump()
    }, 300)
    return () => clearInterval(id)
  }, [])

  // ---- the floating stick ----
  useEffect(() => {
    const zone = zoneRef.current
    const stick = stickRef.current
    const knob = knobRef.current
    if (!zone || !stick || !knob) return
    let pointerId: number | null = null
    let cx = 0
    let cy = 0

    const setFromEvent = (e: PointerEvent) => {
      let dx = (e.clientX - cx) / STICK_RADIUS
      let dy = (e.clientY - cy) / STICK_RADIUS
      const len = Math.hypot(dx, dy)
      if (len > 1) {
        dx /= len
        dy /= len
      }
      shipInput.yaw = -dx
      shipInput.pitch = -dy
      knob.style.transform = `translate(${dx * STICK_RADIUS * 0.55}px, ${dy * STICK_RADIUS * 0.55}px)`
    }
    const onDown = (e: PointerEvent) => {
      if (pointerId !== null) return
      pointerId = e.pointerId
      try {
        zone.setPointerCapture(e.pointerId)
      } catch {
        /* synthetic or exotic pointers may refuse capture; the stick works anyway */
      }
      cx = e.clientX
      cy = e.clientY
      // the stick materialises under the thumb
      stick.style.left = `${cx}px`
      stick.style.top = `${cy}px`
      stick.dataset.on = '1'
      setFromEvent(e)
      if (!used.current.has('stick')) {
        used.current.add('stick')
        bbEvent('deck', { first: 'stick' })
      }
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId === pointerId) setFromEvent(e)
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      pointerId = null
      shipInput.yaw = 0
      shipInput.pitch = 0
      knob.style.transform = 'translate(0,0)'
      stick.dataset.on = ''
    }
    zone.addEventListener('pointerdown', onDown)
    zone.addEventListener('pointermove', onMove)
    zone.addEventListener('pointerup', onUp)
    zone.addEventListener('pointercancel', onUp)
    return () => {
      zone.removeEventListener('pointerdown', onDown)
      zone.removeEventListener('pointermove', onMove)
      zone.removeEventListener('pointerup', onUp)
      zone.removeEventListener('pointercancel', onUp)
    }
  }, [])

  // ---- THE THROTTLE: four detents, one thumb, a state that stays ----
  useEffect(() => {
    const col = columnRef.current
    if (!col) return
    const DETENTS = ['max', 'thrust', 'coast', 'rev'] as const
    let pid: number | null = null

    const applyDetent = (d: (typeof DETENTS)[number]) => {
      shipInput.thrust = d === 'max' || d === 'thrust' ? 1 : 0
      shipInput.boost = d === 'max'
      shipInput.reverse = d === 'rev' ? 1 : 0
      setDetent(d)
      navigator.vibrate?.(12)
      bbEvent('deck', { throttle: d })
    }
    const fromY = (clientY: number) => {
      const r = col.getBoundingClientRect()
      const t = Math.max(0, Math.min(1, (clientY - r.top) / r.height))
      return DETENTS[Math.min(3, Math.floor(t * 4))]
    }
    const onDown = (e: PointerEvent) => {
      e.preventDefault()
      pid = e.pointerId
      try {
        col.setPointerCapture(e.pointerId)
      } catch {
        /* synthetic pointers may refuse capture */
      }
      const d = fromY(e.clientY)
      if (d !== detentRef.current) applyDetent(d)
      if (!used.current.has('throttle')) {
        used.current.add('throttle')
        bbEvent('deck', { first: 'throttle' })
      }
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      const d = fromY(e.clientY)
      if (d !== detentRef.current) applyDetent(d)
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId === pid) pid = null
    }
    col.addEventListener('pointerdown', onDown)
    col.addEventListener('pointermove', onMove)
    col.addEventListener('pointerup', onUp)
    col.addEventListener('pointercancel', onUp)
    // window blur zeroes shipInput (useShipControls clearAll): resync the lever
    const onBlur = () => {
      detentRef.current = 'coast'
      setDetent('coast')
    }
    window.addEventListener('blur', onBlur)
    return () => {
      col.removeEventListener('pointerdown', onDown)
      col.removeEventListener('pointermove', onMove)
      col.removeEventListener('pointerup', onUp)
      col.removeEventListener('pointercancel', onUp)
      window.removeEventListener('blur', onBlur)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const detentRef = useRef<'max' | 'thrust' | 'coast' | 'rev'>('coast')
  useEffect(() => {
    detentRef.current = detent
  }, [detent])

  if (!IS_TOUCH) return null

  return (
    <div className="hud-touch" data-ui>
      {/* the left zone: the stick lives wherever the thumb lands */}
      <div className="hud-stick-zone" ref={zoneRef}>
        <div className="hud-stick hud-stick-floating" ref={stickRef}>
          <div className="hud-stick-knob" ref={knobRef} />
        </div>
      </div>

      {/* job accepts between the thumbs; decisions deserve words */}
      {!battle && (
        <div className="hud-touch-accepts">
          {canRestart && (
            <button
              className="hud-touch-btn hud-touch-fire"
              onPointerDown={() => {
                activityState.restartRequest = true
              }}
            >
              RE-RUN
            </button>
          )}
          {hasOffer && (
            <button
              className="hud-touch-btn hud-touch-fire"
              onPointerDown={() => {
                activityState.acceptRequest = true
              }}
            >
              ESCORT
            </button>
          )}
          {hasHunt && (
            <button
              className="hud-touch-btn hud-touch-fire"
              onPointerDown={() => {
                activityState.acceptHuntRequest = true
              }}
            >
              MANHUNT
            </button>
          )}
        </div>
      )}

      {/* THE THROTTLE (docs/the-mobile-controls.md): speed is a STATE.
          A lever with four detents — set it and your thumb goes home.
          The nose is the stick's job; the drive is this lever's. */}
      <div className="hud-arc">
        {armed && (
          <button
            className="hud-arc-btn hud-arc-jump"
            title={`JUMP — ${armed}`}
            onPointerDown={() => {
              const j = deckState.armed
              if (j && warp.phase === 'idle') {
                startWarp(j.position, shipRig.position, j.standoff)
                bbEvent('deck', { jump: j.name })
              }
              clearJump()
            }}
          >
            <Glyph kind="jump" />
          </button>
        )}
        <button
          className="hud-arc-btn hud-arc-flip"
          onPointerDown={() => {
            requestFlip()
            if (!used.current.has('flip')) {
              used.current.add('flip')
              bbEvent('deck', { first: 'flip' })
            }
          }}
        >
          <Glyph kind="flip" />
        </button>
        <div className="hud-throttle" ref={columnRef} data-detent={detent}>
          <div className="hud-throttle-track" />
          {(['max', 'thrust', 'coast', 'rev'] as const).map((d) => (
            <div key={d} className={`hud-throttle-detent hud-throttle-${d}`} data-live={detent === d ? '1' : ''}>
              {d === 'max' ? <Glyph kind="up" /> : d === 'thrust' ? <Glyph kind="thrust" /> : d === 'rev' ? <Glyph kind="down" /> : <span className="hud-throttle-dot" />}
            </div>
          ))}
          <div className="hud-throttle-puck" />
        </div>
      </div>
    </div>
  )
}
