import { useEffect, useState } from 'react'
import { Vector3 } from 'three'
import { ALL_SYSTEMS } from '../config/systems'
import { STATION_POSITION } from '../config/universe'
import { CONTACT } from '../content/contact'
import { startWarp, warp } from '../physics/warp'
import { shipRig } from '../state/shipRig'

interface Destination {
  id: string
  name: string
  color: string
  position: Vector3
  standoff: number
}

const DESTINATIONS: Destination[] = [
  ...ALL_SYSTEMS.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.starColor,
    position: new Vector3(...s.position),
    standoff: s.starRadius * 6 + 1600,
  })),
  {
    id: 'station',
    name: CONTACT.name,
    color: CONTACT.starColor,
    position: new Vector3(...STATION_POSITION),
    standoff: 420,
  },
]

/**
 * Jump-drive navigation: press N to open, click a destination to warp.
 * Distances refresh while open.
 */
export function NavPanel() {
  const [open, setOpen] = useState(false)
  const [, setTick] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyN') setOpen((o) => !o)
      if (e.code === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setTick((t) => t + 1), 500)
    return () => clearInterval(id)
  }, [open])

  return (
    <>
      <button className="hud-nav-toggle" data-ui onClick={() => setOpen((o) => !o)}>
        NAV <span className="hud-key-hint">N</span>
      </button>
      {open && (
        <div className="hud-nav" data-ui>
          <div className="hud-nav-title">JUMP DRIVE — SELECT DESTINATION</div>
          {DESTINATIONS.map((dest) => {
            const dist = dest.position.distanceTo(shipRig.position)
            const here = dist < dest.standoff * 1.3
            return (
              <button
                key={dest.id}
                className="hud-nav-dest"
                disabled={here}
                onClick={() => {
                  if (warp.phase === 'idle') {
                    startWarp(dest.position, shipRig.position, dest.standoff)
                    setOpen(false)
                  }
                }}
              >
                <span className="hud-nav-dot" style={{ background: dest.color }} />
                <span className="hud-nav-name">{dest.name}</span>
                <span className="hud-nav-dist">{here ? 'HERE' : `${(dist / 1000).toFixed(1)}k`}</span>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
