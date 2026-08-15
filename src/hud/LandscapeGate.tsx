import { useEffect, useState } from 'react'
import { IS_TOUCH } from '../config/quality'
import { bbEvent } from '../systems/blackbox'

/**
 * THE LANDSCAPE GATE (roadmap 3.5) — "THIS BRIDGE FLIES LANDSCAPE."
 *
 * Touch devices held in portrait get one full-screen card instead of a
 * broken cockpit. Tapping it uses the gesture we're owed to request
 * fullscreen and — where the platform allows (Android) — lock the
 * orientation. iOS has no lock, so the card simply stays until the
 * phone physically rotates: the YouTube pattern.
 */
export function LandscapeGate() {
  const [portrait, setPortrait] = useState(
    () => IS_TOUCH && window.matchMedia('(orientation: portrait)').matches,
  )

  useEffect(() => {
    if (!IS_TOUCH) return
    const mq = window.matchMedia('(orientation: portrait)')
    const onChange = () => {
      setPortrait(mq.matches)
      bbEvent('landscape-gate', { portrait: mq.matches })
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  if (!portrait) return null

  const engage = async () => {
    bbEvent('landscape-gate-tap', {})
    try {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    } catch {
      /* iOS: no fullscreen API on iPhone — the card waits for rotation */
    }
    try {
      const so = screen.orientation as ScreenOrientation & {
        lock?: (o: string) => Promise<void>
      }
      await so.lock?.('landscape')
    } catch {
      /* platforms without lock keep the card until the phone rotates */
    }
  }

  return (
    <div className="hud-lgate" data-ui onPointerDown={engage}>
      <div className="hud-lgate-phone" />
      <div className="hud-lgate-title">THIS BRIDGE FLIES LANDSCAPE</div>
      <div className="hud-lgate-sub">TURN YOUR SHIP SIDEWAYS · TAP FOR FULLSCREEN</div>
    </div>
  )
}
