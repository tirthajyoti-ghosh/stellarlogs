import type { ContentItem } from './types'

/**
 * The Hull & Hardware Registry — in-world asset attribution, dockmaster's
 * ledger style. These boards orbit the Comms Station with the contact boards:
 * every acquired model and texture in the neighborhood, logged with its maker
 * and a working link to the source. (The hidden SEO mirror carries the same
 * attributions for machine readability; the welcome card stays clean.)
 */
export const REGISTRY_ACCENT = '#ffb454'

export const REGISTRY: ContentItem[] = [
  {
    title: 'Port Registry',
    subtitle: 'Every hull, rock and fixture here, logged with its maker',
    tech: 'The ship you fly · this station · the wreck on the lane',
    overview:
      'This world is built on the generosity of artists who share their work under Creative Commons. Tap any entry for the source.',
    links: [
      { label: 'MCRN Tachi — Jakub.Vildomec', url: 'https://sketchfab.com/3d-models/mcrn-tachi-expanse-tv-show-76fc983ab08c449b9042491a00e621cf' },
      { label: 'Gateway — andreas9343', url: 'https://sketchfab.com/3d-models/gateway-57c6a27313794618a299ebe9ec8c2afd' },
      { label: 'Cargo Hauler (the Nilak) — NekoKuroHB', url: 'https://sketchfab.com/3d-models/cargo-hauler-cb41721a59d8485fb0a107983d054ad5' },
    ],
  },
  {
    title: 'Registry · Ordnance',
    overview:
      'Torpedoes from "Low Poly Missiles and Torpedos" by sakigakefuruzawa (CC BY 4.0). Nav buoys marking the range and the race gates: "Sci-Fi Beacon/Way Point Marker" by AMMediaGames (CC BY 4.0). Belt rocks: "Asteroids Pack (metallic version)" by SebastianSosnowski (CC BY 4.0).',
    links: [
      { label: 'Missiles — sakigakefuruzawa', url: 'https://sketchfab.com/3d-models/low-poly-missiles-and-torpedos-99783c90ce904951a3c71e851a527d35' },
      { label: 'Beacon buoy — AMMediaGames', url: 'https://sketchfab.com/3d-models/sci-fi-beaconway-point-marker-free-model-a1d91ebb3e2d41bba31c02b11423d97f' },
      { label: 'Asteroids — SebastianSosnowski', url: 'https://sketchfab.com/3d-models/asteroids-pack-metallic-version-eff495d9315c47dbb2777ec80bef40d8' },
    ],
  },
  {
    title: 'Registry · Fire & Sky',
    overview:
      'Explosion animation by WrathGames Studio (OpenGameArt, CC BY 3.0). Damage vapor, embers and arcs from the Kenney Particle Pack (CC0). Nebulae photographed by ESA/Hubble (CC BY 4.0). The Milky Way behind everything: NASA/Goddard SVS "Deep Star Maps 2020" (public domain).',
    links: [
      { label: 'Explosion — WrathGames Studio', url: 'https://opengameart.org/content/wgstudio-explosion-animation' },
      { label: 'Particles — Kenney (CC0)', url: 'https://kenney.nl/assets/particle-pack' },
      { label: 'Nebulae — ESA/Hubble', url: 'https://esahubble.org' },
      { label: 'Star map — NASA/SVS', url: 'https://svs.gsfc.nasa.gov/4851' },
    ],
  },
]
