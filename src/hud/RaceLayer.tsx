/**
 * Race guidance marker: a single pooled DOM element pointing at the next
 * gate — circle bracket + label + range on screen, edge chevron when the
 * gate is off-screen. Driven imperatively by HudBridge each frame from
 * activityState.raceTarget (same pattern as the threat layer).
 */

export const raceEls: { root: HTMLDivElement | null } = { root: null }

export function RaceLayer() {
  return (
    <div
      className="hud-race"
      style={{ opacity: 0 }}
      aria-hidden
      ref={(el) => {
        raceEls.root = el
      }}
    >
      <span className="hud-race-arrow">▲</span>
      <span className="hud-race-ring" />
      <span className="hud-race-label" />
      <span className="hud-race-dist" />
    </div>
  )
}
