import { Vector3 } from 'three'
import { ALL_SYSTEMS } from '../config/systems'
import { CONTACT } from '../content/contact'
import { STATION_POSITION } from '../config/universe'

/**
 * Shared HUD plumbing. World-space label entries are registered here; the
 * in-canvas HudBridge projects them each frame and writes styles straight
 * onto the DOM nodes (no React state at 60fps).
 */

export type LabelKind = 'system' | 'planet' | 'station' | 'poi' | 'memorial'

/**
 * THE MARKER GRAMMAR (docs/the-hud-markers.md, Tirtha's rule): on the
 * HUD, color answers "what KIND of thing is that?" — never "which one".
 * Portfolio content is amber, infrastructure teal, world texture
 * grey-blue, live contacts dim white, the hunted red, the memorial
 * cyan, the unsurveyed frontier ash. One glance, no reading.
 */
export type MarkerCategory =
  | 'portfolio'
  | 'infra'
  | 'poi'
  | 'contact'
  | 'hostile'
  | 'memorial'
  | 'frontier'

export const MARKER_COLORS: Record<MarkerCategory, string> = {
  portfolio: '#ffb45e',
  infra: '#5fd0c0',
  poi: '#8fa8bd',
  contact: '#aab6c2',
  hostile: '#ff7a5c',
  memorial: '#9fdcff',
  frontier: '#6c7a86',
}

export function markerCategory(label: HudLabel): MarkerCategory {
  if (label.category) return label.category
  if (label.kind === 'memorial') return 'memorial'
  if (label.kind === 'station') return 'infra'
  // live ships ride the codebase's ship-* id convention
  if (label.id === 'ship-draugr') return 'hostile'
  if (label.id.startsWith('ship-')) return 'contact'
  if (label.kind === 'system' || label.kind === 'planet') return 'portfolio'
  return 'poi'
}

export function markerColor(label: HudLabel): string {
  return MARKER_COLORS[markerCategory(label)]
}

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
  /** POIs: warp arrival distance (lands clear of auto-start triggers) */
  jumpStandoff?: number
  /** Survives THE HUNT FOCUS (mission truth; everything else goes dark) */
  mission?: boolean
  /** Marker category override; usually derived — see markerCategory() */
  category?: MarkerCategory
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
    detail: s.inert ? 'UNSURVEYED' : `${s.planets.length} PLANETS`,
    category: (s.inert ? 'frontier' : 'portfolio') as MarkerCategory,
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
  /** Battle drift marker — projected at the ship's true velocity vector */
  driftEl: null as HTMLElement | null,
  /** Jump destination for the current tactical contact (its system/station) */
  targetJump: null as { position: Vector3; standoff: number } | null,
  warpDestEl: null as HTMLElement | null,
  warpDistEl: null as HTMLElement | null,
  warpPhaseEl: null as HTMLElement | null,
  currentSystemName: 'DEEP SPACE',
}

// probe-only introspection
import { PROBES } from '../config/probes'
if (PROBES) (window as unknown as Record<string, unknown>).__hudLabels = hudLabels
