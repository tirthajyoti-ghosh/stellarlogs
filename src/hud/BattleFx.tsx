import { useEffect, useRef } from 'react'
import { activityState } from '../state/activityState'

/**
 * Battle-mode screen furniture: the big center banner (WAVE 2/3, DRILL
 * COMPLETE, HULL CRITICAL) and the damage-direction arc that flashes at the
 * screen edge a hit came from — both genre-standard combat HUD elements,
 * driven per frame from activityState (no React state).
 */
export function BattleFx() {
  const bannerRef = useRef<HTMLDivElement>(null)
  const hitDirRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const banner = bannerRef.current
      if (banner) {
        // a queued outcome follows the alarm out the moment it clears
        const st = activityState
        if (st.pendingOutcome && (st.banner.text === '' || st.banner.until <= st.bannerClock)) {
          const q = st.pendingOutcome
          st.pendingOutcome = null
          st.banner = { text: q.text, kind: q.kind, until: st.bannerClock + q.seconds }
          st.bannerTier = 2
        }
        const b = activityState.banner
        const show = b.text !== '' && b.until > activityState.bannerClock
        banner.dataset.on = show ? '1' : ''
        if (show) {
          banner.dataset.kind = b.kind
          if (banner.textContent !== b.text) banner.textContent = b.text
        } else if (banner.textContent !== '') {
          // no ghosts: a hidden banner keeps neither its text nor its kind
          banner.textContent = ''
          delete banner.dataset.kind
        }
      }
      const hitDir = hitDirRef.current
      if (hitDir) {
        const show = activityState.hitDirUntil > activityState.bannerClock
        hitDir.dataset.on = show ? '1' : ''
        if (show) hitDir.style.transform = `translate(-50%, -50%) rotate(${activityState.hitDirDeg}deg)`
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      <div className="hud-banner" ref={bannerRef} aria-hidden />
      <div className="hud-hitdir" ref={hitDirRef} aria-hidden>
        <span />
      </div>
    </>
  )
}
