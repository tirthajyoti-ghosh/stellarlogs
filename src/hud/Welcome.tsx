import { useEffect, useState } from 'react'
import { IS_TOUCH } from '../config/quality'

const STORAGE_KEY = 'stellarlogs-visited'

/** First-visit onboarding overlay. Dismiss with the button or by flying. */
export function Welcome() {
  const [open, setOpen] = useState(() => !localStorage.getItem(STORAGE_KEY))

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Enter' || e.code === 'Escape') {
        dismiss()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="hud-welcome" data-ui>
      <div className="hud-welcome-card">
        <h1>Welcome to my Universe</h1>
        <p>
          👋 I'm <strong>Tirtha</strong> — Senior AI Engineer with 6+ years of experience. I've
          built 30+ production AI agents for enterprise clients, a custom agent loop engine, and a
          production observability platform.
        </p>
        <p>
          You're piloting a ship through my portfolio: each <strong>star system</strong> is a
          section — work, projects, writing, and more. Fly close to a planet and read the boards in
          orbit.
        </p>
        <div className="hud-welcome-controls">
          {IS_TOUCH ? (
            <div>
              <span className="hud-key">STICK</span> steer · <span className="hud-key">BURN</span>{' '}
              thrust · <span className="hud-key">BOOST</span> afterburner ·{' '}
              <span className="hud-key">REV</span> reverse · <span className="hud-key">JUMP DRIVE</span>{' '}
              fast travel
            </div>
          ) : (
            <>
              <div>
                <span className="hud-key">W</span> burn · <span className="hud-key">S</span> reverse ·{' '}
                <span className="hud-key">A/D</span> turn · <span className="hud-key">R/F</span> pitch
              </div>
              <div>
                <span className="hud-key">Q/E</span> strafe · <span className="hud-key">SHIFT</span>{' '}
                afterburner · <span className="hud-key">N</span> jump ·{' '}
                <span className="hud-key">drag</span> admire the ship
              </div>
            </>
          )}
        </div>
        <button className="hud-welcome-go" onClick={dismiss}>
          {IS_TOUCH ? 'Start flying' : 'Press W to fly'}
        </button>
        <p className="hud-welcome-credit">
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
            CC BY
          </a>{' '}
          assets:{' '}
          <a
            href="https://sketchfab.com/3d-models/mcrn-tachi-expanse-tv-show-76fc983ab08c449b9042491a00e621cf"
            target="_blank"
            rel="noreferrer"
          >
            "MCRN Tachi"
          </a>{' '}
          by Jakub.Vildomec ·{' '}
          <a
            href="https://sketchfab.com/3d-models/gateway-57c6a27313794618a299ebe9ec8c2afd"
            target="_blank"
            rel="noreferrer"
          >
            "Gateway"
          </a>{' '}
          by andreas9343 ·{' '}
          <a
            href="https://sketchfab.com/3d-models/asteroids-pack-metallic-version-eff495d9315c47dbb2777ec80bef40d8"
            target="_blank"
            rel="noreferrer"
          >
            "Asteroids Pack"
          </a>{' '}
          by SebastianSosnowski ·{' '}
          <a
            href="https://sketchfab.com/3d-models/low-poly-missiles-and-torpedos-99783c90ce904951a3c71e851a527d35"
            target="_blank"
            rel="noreferrer"
          >
            "Missiles"
          </a>{' '}
          by sakigakefuruzawa ·{' '}
          <a
            href="https://sketchfab.com/3d-models/sci-fi-beaconway-point-marker-free-model-a1d91ebb3e2d41bba31c02b11423d97f"
            target="_blank"
            rel="noreferrer"
          >
            "Beacon"
          </a>{' '}
          by AMMediaGames ·{' '}
          <a
            href="https://opengameart.org/content/wgstudio-explosion-animation"
            target="_blank"
            rel="noreferrer"
          >
            explosion FX
          </a>{' '}
          by WrathGames Studio · nebulae by{' '}
          <a href="https://esahubble.org" target="_blank" rel="noreferrer">
            ESA/Hubble
          </a>{' '}
          · star map by{' '}
          <a href="https://svs.gsfc.nasa.gov/4851" target="_blank" rel="noreferrer">
            NASA/SVS
          </a>
        </p>
      </div>
    </div>
  )
}
