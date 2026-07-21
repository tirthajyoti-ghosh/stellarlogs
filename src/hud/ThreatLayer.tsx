/**
 * Battle-mode threat markers: pooled corner-bracket target boxes (the
 * video-game convention — four L corners around the contact) with a range
 * readout and a TRK tag while a turret is locked on. Off-screen threats
 * become edge chevrons. Positions/visibility are written imperatively by
 * HudBridge each frame (same pattern as the label layer).
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
          <span className="hud-threat-box">
            <i /><i /><i /><i />
          </span>
          <span className="hud-threat-trk">TRK</span>
          <span className="hud-threat-info" />
        </div>
      ))}
    </div>
  )
}
