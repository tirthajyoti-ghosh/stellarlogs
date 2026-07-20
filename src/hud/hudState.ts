import { Vector3 } from 'three'
import { ALL_SYSTEMS } from '../config/systems'
import { CONTACT } from '../content/contact'
import { STATION_POSITION } from '../config/universe'

/**
 * Shared HUD plumbing. World-space label entries are registered here; the
 * in-canvas HudBridge projects them each frame and writes styles straight
 * onto the DOM nodes (no React state at 60fps).
 */

export type LabelKind = 'system' | 'planet' | 'station' | 'poi'

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
  /** Parent system name, shown in the tactical chip for planets */
  group?: string
  /** One-line "what is this" for the tactical purpose readout */
  detail?: string
  /** Distance (world units) at which this body's boards become readable */
  readRange?: number
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
    detail: `${s.planets.length} PLANETS`,
  })),
  {
    id: 'station',
    name: CONTACT.name.toUpperCase(),
    color: CONTACT.starColor,
    kind: 'station' as const,
    position: new Vector3(...STATION_POSITION),
    yOffset: 90,
    el: null,
    detail: 'CONTACT & LINKS',
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
  headingEl: null as HTMLElement | null,
  systemEl: null as HTMLElement | null,
  driveEl: null as HTMLElement | null,
  posEl: null as HTMLElement | null,
  gravEl: null as HTMLElement | null,
  pitchEl: null as HTMLElement | null,
  shipVizEls: {} as Record<string, SVGElement | null>,
  targetChipEl: null as HTMLElement | null,
  targetNameEl: null as HTMLElement | null,
  targetBearingEl: null as HTMLElement | null,
  targetRangeEl: null as HTMLElement | null,
  targetCloseEl: null as HTMLElement | null,
  targetPurposeEl: null as HTMLElement | null,
  /** Jump destination for the current tactical contact (its system/station) */
  targetJump: null as { position: Vector3; standoff: number } | null,
  warpDestEl: null as HTMLElement | null,
  warpDistEl: null as HTMLElement | null,
  warpPhaseEl: null as HTMLElement | null,
  currentSystemName: 'DEEP SPACE',
}
