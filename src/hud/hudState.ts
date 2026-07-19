import { Vector3 } from 'three'
import { ALL_SYSTEMS } from '../config/systems'
import { CONTACT } from '../content/contact'
import { STATION_POSITION } from '../config/universe'

/**
 * Shared HUD plumbing. World-space label entries are registered here; the
 * in-canvas HudBridge projects them each frame and writes styles straight
 * onto the DOM nodes (no React state at 60fps).
 */

export type LabelKind = 'system' | 'planet' | 'station'

export interface HudLabel {
  id: string
  name: string
  color: string
  kind: LabelKind
  /** Live world position (mutated externally for orbiting bodies) */
  position: Vector3
  /** Vertical world offset so the label sits above the body */
  yOffset: number
  /** DOM node, attached by LabelLayer */
  el: HTMLDivElement | null
}

export const hudLabels: HudLabel[] = [
  ...ALL_SYSTEMS.map((s) => ({
    id: s.id,
    name: s.name.toUpperCase(),
    color: s.starColor,
    kind: 'system' as const,
    position: new Vector3(...s.position),
    yOffset: s.starRadius * 2.2,
    el: null,
  })),
  {
    id: 'station',
    name: CONTACT.name.toUpperCase(),
    color: CONTACT.starColor,
    kind: 'station' as const,
    position: new Vector3(...STATION_POSITION),
    yOffset: 90,
    el: null,
  },
]

export function registerHudLabel(label: HudLabel): () => void {
  hudLabels.push(label)
  return () => {
    const i = hudLabels.indexOf(label)
    if (i !== -1) hudLabels.splice(i, 1)
  }
}

/** Status readouts, written by HudBridge, rendered by the HUD components. */
export const hudReadouts = {
  speedEl: null as HTMLElement | null,
  speedBarEl: null as HTMLElement | null,
  headingEl: null as HTMLElement | null,
  systemEl: null as HTMLElement | null,
  driveEl: null as HTMLElement | null,
  posEl: null as HTMLElement | null,
  gravEl: null as HTMLElement | null,
  rcsEls: {} as Record<string, HTMLElement | null>,
  targetNameEl: null as HTMLElement | null,
  targetDistEl: null as HTMLElement | null,
  targetCloseEl: null as HTMLElement | null,
  progradeEl: null as HTMLElement | null,
  warpDestEl: null as HTMLElement | null,
  warpDistEl: null as HTMLElement | null,
  warpPhaseEl: null as HTMLElement | null,
  currentSystemName: 'DEEP SPACE',
}
