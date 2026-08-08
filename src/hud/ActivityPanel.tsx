import { useEffect, useRef } from 'react'
import { activityState } from '../state/activityState'

/**
 * Compact HUD panel that wakes up inside an activity zone (Bruno-Simon style:
 * fly into it and it comes alive). Contents are written each frame from
 * activityState via rAF — no React state at frame rate.
 */
export function ActivityPanel() {
  const rootRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const linesRef = useRef<HTMLDivElement>(null)
  const coachRef = useRef<HTMLDivElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const flavorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const root = rootRef.current
      if (!root) return
      root.dataset.active = activityState.active ? '1' : ''
      // the coach lives OUTSIDE the transformed panel (fixed inside a
      // transform positions against the ancestor, not the viewport)
      const coach = coachRef.current
      if (coach) {
        const text = activityState.active ? activityState.hint : ''
        if (coach.textContent !== text) coach.textContent = text
        coach.dataset.on = text ? '1' : ''
      }
      if (!activityState.active) return
      if (titleRef.current) titleRef.current.textContent = activityState.title
      const flash = flashRef.current
      if (flash) {
        flash.textContent = activityState.flash
        flash.dataset.on = activityState.flash ? '1' : ''
      }
      const flavor = flavorRef.current
      if (flavor) {
        const on = activityState.flavor.text !== '' && activityState.flavor.until > activityState.bannerClock
        if (on && flavor.textContent !== activityState.flavor.text) flavor.textContent = activityState.flavor.text
        flavor.dataset.on = on ? '1' : ''
      }
      const lines = linesRef.current
      if (lines) {
        // Rebuild only when the line count changes; otherwise update in place
        if (lines.childElementCount !== activityState.lines.length) {
          lines.textContent = ''
          for (const line of activityState.lines) {
            const el = document.createElement('span')
            el.className = 'hud-activity-line'
            const label = document.createElement('b')
            label.textContent = line.label
            const value = document.createElement('i')
            value.textContent = line.value
            el.append(label, value)
            lines.append(el)
          }
        } else {
          activityState.lines.forEach((line, i) => {
            const el = lines.children[i]
            const label = el.children[0]
            const value = el.children[1]
            if (label.textContent !== line.label) label.textContent = line.label
            if (value.textContent !== line.value) value.textContent = line.value
          })
        }
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
    <div className="hud-activity" ref={rootRef} data-ui>
      <div className="hud-mfd-title" ref={titleRef} />
      <div className="hud-activity-lines" ref={linesRef} />
      <div className="hud-activity-flash" ref={flashRef} />
      <div className="hud-activity-flavor" ref={flavorRef} />
    </div>
    <div className="hud-coach" ref={coachRef} aria-hidden />
    </>
  )
}
