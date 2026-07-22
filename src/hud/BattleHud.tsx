import { useEffect, useRef } from 'react'
import { activityState } from '../state/activityState'
import { turretControl } from '../state/turretControl'
import { shipRig } from '../state/shipRig'
import { hudReadouts } from './hudState'

/**
 * Battle-mode combat HUD, built on space-combat-game anatomy (Everspace,
 * Ace Combat, House of the Dying Sun): readouts cluster around screen
 * center — velocity left, PDC turret status right, segmented hull bar
 * beneath — plus the genre-standard blinking TORPEDO INBOUND warning strip
 * top-center. No decorative boresight: the guns aim themselves, so the only
 * center-screen element is the DRIFT marker (projected by HudBridge at the
 * ship's true velocity direction — the datum that makes Newtonian evasion
 * flyable). Replaces the cruise panels entirely while a drill runs. Driven
 * per frame via rAF, no React state.
 */
export function BattleHud() {
  const rootRef = useRef<HTMLDivElement>(null)
  const warnTextRef = useRef<HTMLDivElement>(null)
  const warnSubRef = useRef<HTMLDivElement>(null)
  const waveRef = useRef<HTMLDivElement>(null)
  const velRef = useRef<HTMLDivElement>(null)
  const pdcCountRef = useRef<HTMLDivElement>(null)
  const pipRefs = useRef<(HTMLElement | null)[]>([])
  const hullSegRefs = useRef<(HTMLElement | null)[]>([])
  const hullPctRef = useRef<HTMLElement>(null)
  const coachRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    let lastVel = -1
    let lastLocks = -1
    let lastHull = -1
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const root = rootRef.current
      if (!root) return
      const on = activityState.battle
      root.dataset.on = on ? '1' : ''
      if (!on) return

      // Threat sweep: count + soonest impact across live torpedoes
      let count = 0
      let soonest = Infinity
      for (const threat of activityState.threats) {
        if (!threat.alive || !threat.launched) continue
        count++
        const dx = threat.position.x - shipRig.position.x
        const dy = threat.position.y - shipRig.position.y
        const dz = threat.position.z - shipRig.position.z
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        const closing =
          -(threat.velocity.x * dx + threat.velocity.y * dy + threat.velocity.z * dz) /
          Math.max(1, dist)
        if (closing > 1) soonest = Math.min(soonest, dist / closing)
      }
      const warn = warnTextRef.current
      if (warn) {
        const strip = warn.parentElement as HTMLElement
        strip.dataset.on = count > 0 ? '1' : ''
        strip.dataset.crit = soonest < 6 ? '1' : ''
        if (count > 0) {
          const text = `TORPEDO INBOUND ×${count}`
          if (warn.textContent !== text) warn.textContent = text
          const sub = warnSubRef.current
          if (sub) {
            const subText = soonest < 30 ? `IMPACT T-${Math.max(0, soonest).toFixed(0)}S` : 'TRACKING'
            if (sub.textContent !== subText) sub.textContent = subText
          }
        }
      }
      const wave = waveRef.current
      if (wave) {
        const text = activityState.wave > 0 ? `WAVE ${activityState.wave} / ${activityState.waveMax}` : ''
        if (wave.textContent !== text) wave.textContent = text
      }

      // Velocity tape
      const vel = Math.round(shipRig.speed)
      if (vel !== lastVel && velRef.current) {
        velRef.current.textContent = String(vel)
        lastVel = vel
      }

      // PDC turret pips: lit on lock, hot while firing, red on thermal lockout
      const firing = turretControl.spin > 0.85
      let overheatedCount = 0
      for (let i = 0; i < 6; i++) {
        const pip = pipRefs.current[i]
        if (!pip) continue
        const muzzle = turretControl.muzzles[i]
        const engaged = !!muzzle && muzzle.targetIndex >= 0
        const ovr = !!muzzle && muzzle.overheated
        if (ovr) overheatedCount++
        pip.dataset.on = engaged ? '1' : ''
        pip.dataset.hot = engaged && firing ? '1' : ''
        pip.dataset.ovr = ovr ? '1' : ''
      }
      const locksNow = turretControl.locks - overheatedCount * 1000 // force refresh on ovr change
      if (locksNow !== lastLocks && pdcCountRef.current) {
        pdcCountRef.current.textContent =
          overheatedCount > 0
            ? `OVERHEAT ×${overheatedCount}`
            : turretControl.locks > 0
              ? `ENGAGING ×${turretControl.locks}`
              : 'SEARCHING'
        lastLocks = locksNow
      }

      // Hull segments
      if (activityState.hull !== lastHull) {
        lastHull = activityState.hull
        for (let i = 0; i < 3; i++) {
          const seg = hullSegRefs.current[i]
          if (seg) seg.dataset.lost = i >= activityState.hull ? '1' : ''
        }
        if (hullPctRef.current) {
          const pct = Math.round((activityState.hull / activityState.hullMax) * 100)
          hullPctRef.current.textContent = `${pct}`
        }
        root.dataset.critical = activityState.hull <= 1 ? '1' : ''
      }

      // Coach line (only present when the drill has something to say)
      const coach = coachRef.current
      if (coach && coach.textContent !== activityState.hint) coach.textContent = activityState.hint
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="hud-battlehud" ref={rootRef} aria-hidden>
      <div className="hud-bh-warning">
        <div className="hud-bh-warning-text" ref={warnTextRef} />
        <div className="hud-bh-warning-sub" ref={warnSubRef} />
      </div>
      <div className="hud-bh-wave" ref={waveRef} />

      {/* Drift marker: projected at the TRUE velocity vector by HudBridge */}
      <div
        className="hud-bh-drift"
        ref={(el) => {
          hudReadouts.driftEl = el
        }}
      >
        <svg viewBox="-12 -12 24 24" width="24" height="24">
          <circle r="5.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <line x1="0" y1="-5.5" x2="0" y2="-10.5" stroke="currentColor" strokeWidth="1.3" />
          <line x1="-5.5" y1="0" x2="-10.5" y2="0" stroke="currentColor" strokeWidth="1.3" />
          <line x1="5.5" y1="0" x2="10.5" y2="0" stroke="currentColor" strokeWidth="1.3" />
          <circle r="0.9" fill="currentColor" />
        </svg>
        <b>DRIFT</b>
      </div>

      <div className="hud-bh-center">
        <div className="hud-bh-vel">
          <b>VEL</b>
          <div className="hud-bh-vel-num" ref={velRef}>0</div>
          <b>M/S</b>
        </div>

        <div className="hud-bh-pdc">
          <b>PDC · AUTO</b>
          <div className="hud-bh-pips">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <i
                key={i}
                ref={(el) => {
                  pipRefs.current[i] = el
                }}
              />
            ))}
          </div>
          <div className="hud-bh-pdc-count" ref={pdcCountRef}>
            SEARCHING
          </div>
        </div>

        <div className="hud-bh-hull">
          <b>HULL</b>
          <div className="hud-bh-hull-segs">
            {[0, 1, 2].map((i) => (
              <i
                key={i}
                ref={(el) => {
                  hullSegRefs.current[i] = el
                }}
              />
            ))}
          </div>
          <b>
            <span ref={hullPctRef}>100</span>%
          </b>
        </div>
        <div className="hud-bh-coach" ref={coachRef} />
      </div>
    </div>
  )
}
