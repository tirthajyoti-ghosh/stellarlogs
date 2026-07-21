/**
 * Battle-mode threat markers: a pooled DOM layer of red diamonds, one per
 * live threat. Positions/visibility are written imperatively by HudBridge
 * each frame (same pattern as the label layer). The nearest threat carries
 * an impact-time readout.
 */

export const THREAT_POOL = 12

/** DOM nodes for HudBridge to drive; filled by ThreatLayer on mount. */
export const threatEls: (HTMLDivElement | null)[] = Array(THREAT_POOL).fill(null)

export function ThreatLayer() {
  return (
    <div className="hud-threats" aria-hidden>
      {Array.from({ length: THREAT_POOL }, (_, i) => (
        <div
          key={i}
          className="hud-threat"
          style={{ opacity: 0 }}
          ref={(el) => {
            threatEls[i] = el
          }}
        >
          <span className="hud-threat-arrow">▲</span>
          <span className="hud-threat-diamond" />
          <span className="hud-threat-info" />
        </div>
      ))}
    </div>
  )
}
