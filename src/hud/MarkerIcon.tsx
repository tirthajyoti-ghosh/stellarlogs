import type { LabelKind, MarkerCategory } from './hudState'

/**
 * THE MARKER SET (docs/the-hud-markers.md, pass 2) — proper designed
 * marks, Everspace-calibrated: big enough to spot against a starfield,
 * small enough to never shout. Every marker is an inline SVG on a soft
 * dark backing disc (the disc is what makes a mark readable over the
 * Milky Way — stars are points, marks are shapes on ground).
 *
 * The grammar: color answers WHAT (category), the shape agrees with it.
 *   portfolio — double diamond (a destination worth the burn)
 *   frontier  — dashed hollow diamond (charted line, nothing inside)
 *   infra     — docking brackets around a core (a place that receives)
 *   poi       — scanner reticle (something to look at)
 *   contact   — a hull chevron under way
 *   hostile   — hard double chevron (closing)
 *   memorial  — the candle
 */

const BACKING = (
  <circle cx="12" cy="12" r="10.5" fill="rgba(4, 10, 18, 0.55)" stroke="none" />
)

export function MarkerIcon({ category, kind }: { category: MarkerCategory; kind?: LabelKind }) {
  // planets are small ringed dots regardless of category — moons of the
  // grammar, not destinations of it
  if (kind === 'planet') {
    return (
      <svg className="hud-marker hud-marker-planet" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="8.5" fill="rgba(4, 10, 18, 0.5)" stroke="none" />
        <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.7" />
        <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  switch (category) {
    case 'portfolio':
      return (
        <svg className="hud-marker" viewBox="0 0 24 24" aria-hidden>
          {BACKING}
          <path d="M12 3.2 L20.8 12 L12 20.8 L3.2 12 Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M12 7.6 L16.4 12 L12 16.4 L7.6 12 Z" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'frontier':
      return (
        <svg className="hud-marker" viewBox="0 0 24 24" aria-hidden>
          {BACKING}
          <path
            d="M12 3.6 L20.4 12 L12 20.4 L3.6 12 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeDasharray="2.6 2.2"
          />
        </svg>
      )
    case 'infra':
      return (
        <svg className="hud-marker" viewBox="0 0 24 24" aria-hidden>
          {BACKING}
          <path d="M4.5 8.5 V4.5 H8.5 M15.5 4.5 H19.5 V8.5 M19.5 15.5 V19.5 H15.5 M8.5 19.5 H4.5 V15.5"
            fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="9.4" y="9.4" width="5.2" height="5.2" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'poi':
      return (
        <svg className="hud-marker" viewBox="0 0 24 24" aria-hidden>
          {BACKING}
          <circle cx="12" cy="12" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
          <path d="M12 2.8 V6 M12 18 V21.2 M2.8 12 H6 M18 12 H21.2" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      )
    case 'contact':
      return (
        <svg className="hud-marker" viewBox="0 0 24 24" aria-hidden>
          {BACKING}
          <path d="M6 5.5 L18 12 L6 18.5 L9.5 12 Z" fill="none" stroke="currentColor" strokeWidth="1.5"
            strokeLinejoin="round" />
        </svg>
      )
    case 'hostile':
      return (
        <svg className="hud-marker" viewBox="0 0 24 24" aria-hidden>
          {BACKING}
          <path d="M5 5 L12 12 L5 19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M11 5 L18 12 L11 19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      )
    case 'memorial':
      return (
        <svg className="hud-marker hud-marker-flame" viewBox="0 0 24 24" aria-hidden>
          {BACKING}
          <path d="M10.9 14.5 H13.1 V19.5 H10.9 Z" fill="currentColor" stroke="none" opacity="0.85" />
          <path
            d="M12 4.2 C13.9 6.8 15 8.6 15 10.4 C15 12.4 13.7 13.7 12 13.7 C10.3 13.7 9 12.4 9 10.4 C9 8.6 10.1 6.8 12 4.2 Z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      )
    default:
      return null
  }
}
