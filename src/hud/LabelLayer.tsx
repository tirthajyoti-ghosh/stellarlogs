import { useEffect, useReducer } from 'react'
import { hudLabels, markerCategory, markerColor } from './hudState'
import { MarkerIcon } from './MarkerIcon'

/** Re-render when orbiting planets register/unregister their labels. */
let notify: (() => void) | null = null
export function labelsChanged(): void {
  notify?.()
}

/**
 * DOM layer for world-anchored labels: system names, planet names, station.
 * Positions are written imperatively by HudBridge each frame.
 */
export function LabelLayer() {
  const [, bump] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    notify = bump
    return () => {
      notify = null
    }
  }, [])

  return (
    <div className="hud-labels" aria-hidden>
      {hudLabels.map((label) => (
        <div
          key={label.id}
          className={`hud-label hud-label-${label.kind}`}
          data-mission={label.mission ? '1' : undefined}
          data-category={markerCategory(label)}
          style={{ color: markerColor(label), opacity: 0 }}
          ref={(el) => {
            label.el = el
          }}
        >
          <span className="hud-label-arrow">➤</span>
          <MarkerIcon category={markerCategory(label)} kind={label.kind} />
          <span className="hud-label-name">{label.name}</span>
          <span className="hud-label-dist" />
        </div>
      ))}
    </div>
  )
}
