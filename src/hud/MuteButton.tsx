import { useState } from 'react'
import { isMuted, toggleMute } from '../audio/engine'

/** Sound toggle, persisted across visits. */
export function MuteButton() {
  const [muted, setMuted] = useState(isMuted)

  return (
    <button
      className="hud-mute"
      data-ui
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      onClick={() => setMuted(toggleMute())}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
