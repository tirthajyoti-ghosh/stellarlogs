import { useEffect, useRef } from 'react'
import { activityState } from '../state/activityState'
import { turretControl } from '../state/turretControl'
import { shipRig } from '../state/shipRig'

/**
 * Battle-mode combat HUD, built on space-combat-game anatomy (Everspace,
 * Ace Combat, House of the Dying Sun): everything anchors to a CENTER
 * boresight reticle — velocity tape on its left, PDC turret status on its
 * right, segmented hull bar beneath — plus the genre-standard blinking
 * TORPEDO INBOUND warning strip top-center. Replaces the cruise panels
 * entirely while a drill runs. Driven per frame via rAF, no React state.
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

      // PDC turret pips: lit while that turret has a lock, hot while firing
      const firing = turretControl.spin > 0.85
      for (let i = 0; i < 6; i++) {
        const pip = pipRefs.current[i]
        if (!pip) continue
        const muzzle = turretControl.muzzles[i]
        const engaged = !!muzzle && muzzle.targetIndex >= 0
        pip.dataset.on = engaged ? '1' : ''
        pip.dataset.hot = engaged && firing ? '1' : ''
      }
      if (turretControl.locks !== lastLocks && pdcCountRef.current) {
        pdcCountRef.current.textContent =
          turretControl.locks > 0 ? `ENGAGING ×${turretControl.locks}` : 'SEARCHING'
        lastLocks = turretControl.locks
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

      <div className="hud-bh-center">
        <svg viewBox="-75 -75 150 150" width="170" height="170">
          <circle r="47" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.7" />
          <line x1="0" y1="-47" x2="0" y2="-57" stroke="currentColor" strokeWidth="1.2" opacity="0.8" />
          <line x1="0" y1="47" x2="0" y2="57" stroke="currentColor" strokeWidth="1.2" opacity="0.8" />
          <line x1="-47" y1="0" x2="-57" y2="0" stroke="currentColor" strokeWidth="1.2" opacity="0.8" />
          <line x1="47" y1="0" x2="57" y2="0" stroke="currentColor" strokeWidth="1.2" opacity="0.8" />
          <line x1="-73" y1="0" x2="-61" y2="0" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          <line x1="61" y1="0" x2="73" y2="0" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          <path d="M -33 -33 A 47 47 0 0 1 33 -33" fill="none" stroke="currentColor" strokeWidth="2.4" opacity="0.28" />
          <circle r="1.7" fill="currentColor" opacity="0.9" />
        </svg>

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
