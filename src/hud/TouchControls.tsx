import { useEffect, useRef, useState } from 'react'
import { shipInput } from '../physics/shipInput'
import { cameraLook } from '../state/cameraLook'
import { activityState } from '../state/activityState'
import { startWarp, warp } from '../physics/warp'
import { shipRig } from '../state/shipRig'
import { IS_TOUCH } from '../config/quality'
import { deckState, clearJump } from './deckState'
import { bbEvent } from '../systems/blackbox'

const STICK_RADIUS = 60

/** Icons from Lucide (ISC) drawn in our stroke weight, plus the house
 *  warp diamond. The drive flame is the same fire the plume burns. */
function Glyph({ kind }: { kind: 'burn' | 'jump' | 'up' | 'down' | 'thrust' }) {
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
  const camZoneRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const [canRestart, setCanRestart] = useState(false)
  const [hasOffer, setHasOffer] = useState(false)
  const [hasHunt, setHasHunt] = useState(false)
  const [battle, setBattle] = useState(false)
  const [armed, setArmed] = useState<string | null>(null)
  const [burnLock, setBurnLock] = useState(false)
  const burnRef = useRef<HTMLButtonElement>(null)
  const speedRef = useRef<HTMLDivElement>(null)
  const accelRef = useRef<HTMLSpanElement>(null)
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
      // the ring clamps fully on-screen (his fix: it was sinking off the
      // bottom edge); input still tracks the true thumb position
      const M = STICK_RADIUS + 14
      cx = Math.min(Math.max(e.clientX, M), innerWidth * 0.44)
      cy = Math.min(Math.max(e.clientY, M), innerHeight - M)
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
      // back to the parked ghost spot — visible, waiting for the thumb
      stick.style.left = ''
      stick.style.top = ''
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

  // ---- THE CAMERA ZONE: the right half orbits the eye around the ship.
  // Owned directly (not via the window handler) so a real thumb on a real
  // phone cannot be eaten by whatever sits over the canvas. No visual —
  // his ruling: no indication, it simply works. Drag down = camera up. ----
  useEffect(() => {
    const zone = camZoneRef.current
    if (!zone) return
    const SENS = 0.0085
    let pid: number | null = null
    let lx = 0
    let ly = 0
    const onDown = (e: PointerEvent) => {
      if (pid !== null) return
      pid = e.pointerId
      try {
        zone.setPointerCapture(e.pointerId)
      } catch {
        /* synthetic pointers may refuse capture */
      }
      lx = e.clientX
      ly = e.clientY
      cameraLook.dragging = true
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      cameraLook.orbitYaw -= (e.clientX - lx) * SENS
      cameraLook.orbitPitch -= (e.clientY - ly) * SENS
      lx = e.clientX
      ly = e.clientY
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      pid = null
      cameraLook.dragging = false
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

  // ---- THROTTLE THREE (docs/the-mobile-hud.md part C, his ruling):
  // HOLD = thrust · release = coast · SWIPE UP while holding = MAX BURN
  // LOCK (tap kills it) · REVERSE is its own small hold-only button.
  // Eyes-free: position, not aiming. ----
  useEffect(() => {
    const btn = burnRef.current
    if (!btn) return
    const SWIPE = 42
    let pid: number | null = null
    let y0 = 0
    let locked = false
    const onDown = (e: PointerEvent) => {
      e.preventDefault()
      pid = e.pointerId
      y0 = e.clientY
      try {
        btn.setPointerCapture(e.pointerId)
      } catch {
        /* synthetic pointers may refuse capture */
      }
      if (locked) {
        // the tap that releases the lock; holding through it burns plain
        locked = false
        setBurnLock(false)
        shipInput.boost = false
        bbEvent('deck', { drive: 'unlock' })
      }
      shipInput.thrust = 1
      shipInput.reverse = 0
      if (!used.current.has('burn')) {
        used.current.add('burn')
        bbEvent('deck', { first: 'burn' })
      }
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pid || locked) return
      if (y0 - e.clientY > SWIPE) {
        locked = true
        setBurnLock(true)
        shipInput.thrust = 1
        shipInput.boost = true
        navigator.vibrate?.(18)
        bbEvent('deck', { drive: 'max-lock' })
      }
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      pid = null
      if (!locked) {
        shipInput.thrust = 0
        shipInput.boost = false
      }
    }
    btn.addEventListener('pointerdown', onDown)
    btn.addEventListener('pointermove', onMove)
    btn.addEventListener('pointerup', onUp)
    btn.addEventListener('pointercancel', onUp)
    const onBlur = () => {
      locked = false
      setBurnLock(false)
    }
    window.addEventListener('blur', onBlur)
    return () => {
      btn.removeEventListener('pointerdown', onDown)
      btn.removeEventListener('pointermove', onMove)
      btn.removeEventListener('pointerup', onUp)
      btn.removeEventListener('pointercancel', onUp)
      window.removeEventListener('blur', onBlur)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- THE SPEED BUG (M2): the drive fact beside the drive control ----
  useEffect(() => {
    if (!IS_TOUCH) return
    let last = 0
    const id = setInterval(() => {
      const el = speedRef.current
      const ac = accelRef.current
      if (!el || !ac) return
      const v = Math.round(shipRig.speed)
      el.textContent = String(v)
      ac.textContent = v > last + 1 ? '\u25b2' : v < last - 1 ? '\u25bc' : '\u00b7'
      ac.dataset.dir = v > last + 1 ? 'up' : v < last - 1 ? 'down' : ''
      last = v
    }, 250)
    return () => clearInterval(id)
  }, [])

  if (!IS_TOUCH) return null

  return (
    <div className="hud-touch" data-ui>
      {/* the right half: an invisible camera surface — thumb orbits the
          eye around the ship; buttons rendered after it take precedence */}
      <div className="hud-cam-zone" ref={camZoneRef} />

      {/* the left zone: a parked translucent stick shows WHERE to touch;
          it relocates under the thumb on grab and fades back when released */}
      <div className="hud-stick-zone" ref={zoneRef}>
        <div className="hud-stick hud-stick-floating" ref={stickRef}>
          <div className="hud-stick-knob" ref={knobRef} />
        </div>
      </div>

      {/* CONTEXT PILLS (the genre's "the world asks" pattern): icon +
          at most two words, pop in only when the world offers something,
          gone in battle. Decisions still get words — short ones. */}
      {!battle && (
        <div className="hud-pills">
          {canRestart && (
            <button
              className="hud-pill"
              onClick={() => {
                activityState.restartRequest = true
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M7 5 L19 12 L7 19 Z" fill="currentColor" />
              </svg>
              RUN DRILL
            </button>
          )}
          {hasOffer && (
            <button
              className="hud-pill"
              onClick={() => {
                activityState.acceptRequest = true
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M12 3 L20 7 V12 C20 17 16.5 20 12 21 C7.5 20 4 17 4 12 V7 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              ESCORT
            </button>
          )}
          {hasHunt && (
            <button
              className="hud-pill"
              onClick={() => {
                activityState.acceptHuntRequest = true
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              MANHUNT
            </button>
          )}
        </div>
      )}

      {/* THROTTLE THREE: the speed bug above, REVERSE small and
          deliberate, BURN big at the thumb's rest. Hold to burn, let go
          to coast, flick up to lock the max — tap to let it go. */}
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
        <div className="hud-speedbug">
          <div className="hud-speedbug-num" ref={speedRef}>0</div>
          <div className="hud-speedbug-sub">
            <span className="hud-speedbug-accel" ref={accelRef}>·</span> M/S
          </div>
        </div>
        <button
          className="hud-arc-btn hud-arc-rev"
          onPointerDown={(e) => {
            try {
              e.currentTarget.setPointerCapture(e.pointerId)
            } catch {
              /* capture is best-effort */
            }
            shipInput.reverse = 1
            shipInput.thrust = 0
            if (!used.current.has('rev')) {
              used.current.add('rev')
              bbEvent('deck', { first: 'rev' })
            }
          }}
          onPointerUp={() => {
            shipInput.reverse = 0
          }}
          onPointerCancel={() => {
            shipInput.reverse = 0
          }}
          onLostPointerCapture={() => {
            shipInput.reverse = 0
          }}
        >
          <Glyph kind="down" />
        </button>
        <button
          className="hud-arc-btn hud-arc-burn"
          ref={burnRef}
          data-lock={burnLock ? '1' : ''}
        >
          <span className="hud-arc-burn-up">
            <Glyph kind="up" />
          </span>
          <Glyph kind="burn" />
        </button>
      </div>
    </div>
  )
}
