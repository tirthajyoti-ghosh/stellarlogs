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

/** icon glyphs in the house line style — thin strokes, no text */
function Glyph({ kind }: { kind: 'burn' | 'boost' | 'rev' | 'flip' | 'jump' }) {
  const stroke = 'currentColor'
  const common = { fill: 'none', stroke, strokeWidth: 2.2, strokeLinecap: 'round' as const }
  switch (kind) {
    case 'burn':
      return (
        <svg viewBox="0 0 32 32" aria-hidden>
          <path d="M16 6 L24 20 L16 16.5 L8 20 Z" fill={stroke} stroke="none" />
          <path d="M11 24 L16 21 L21 24" {...common} />
        </svg>
      )
    case 'boost':
      return (
        <svg viewBox="0 0 32 32" aria-hidden>
          <path d="M8 17 L16 9 L24 17" {...common} />
          <path d="M8 24 L16 16 L24 24" {...common} />
        </svg>
      )
    case 'rev':
      return (
        <svg viewBox="0 0 32 32" aria-hidden>
          <path d="M8 13 L16 21 L24 13" {...common} />
        </svg>
      )
    case 'flip':
      return (
        <svg viewBox="0 0 32 32" aria-hidden>
          <path d="M9 12 A9 9 0 1 1 8 19" {...common} />
          <path d="M5 11 L9 12 L8 16" {...common} />
        </svg>
      )
    case 'jump':
      return (
        <svg viewBox="0 0 32 32" aria-hidden>
          <path d="M16 5 L27 16 L16 27 L5 16 Z" {...common} />
          <path d="M16 11 L21 16 L16 21 L11 16 Z" fill={stroke} stroke="none" />
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

  if (!IS_TOUCH) return null

  const hold = (field: 'thrust' | 'reverse' | 'boost', name: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* same guard as the stick */
      }
      if (field === 'boost') shipInput.boost = true
      else shipInput[field] = 1
      if (!used.current.has(name)) {
        used.current.add(name)
        bbEvent('deck', { first: name })
      }
    },
    onPointerUp: () => {
      if (field === 'boost') shipInput.boost = false
      else shipInput[field] = 0
    },
    onPointerCancel: () => {
      if (field === 'boost') shipInput.boost = false
      else shipInput[field] = 0
    },
    onLostPointerCapture: () => {
      if (field === 'boost') shipInput.boost = false
      else shipInput[field] = 0
    },
  })

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

      {/* THE ARC — BURN at the thumb's rest, satellites curved around */}
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
        <button className="hud-arc-btn hud-arc-boost" {...hold('boost', 'boost')}>
          <Glyph kind="boost" />
        </button>
        <button className="hud-arc-btn hud-arc-rev" {...hold('reverse', 'rev')}>
          <Glyph kind="rev" />
        </button>
        <button className="hud-arc-btn hud-arc-burn" {...hold('thrust', 'burn')}>
          <Glyph kind="burn" />
        </button>
      </div>
    </div>
  )
}
