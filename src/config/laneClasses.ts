import type {} from 'three'

/** The three hull classes working the ice lanes. Bow is +X on all.
 *  bells: engine positions [y, z] at the tail — big hulls run multiple
 *  drives, each flame sized to ITS bell (his ruling 2026-09-12).
 *  Lives here (not in IceRoute) so the ships bench can import the
 *  exact config without dragging the whole activity bundle. */
export const CLASSES = [
  // one great central barrel — measured off the mesh 2026-09-23: mouth ring
  // centered (0,0), bore ~9.5, exit plane x≈-33 (his fix: the two offset
  // flames never matched the single bell)
  { url: '/models/imiq.glb', halfLen: 30, radius: 10.5, collider: 24, plumeX: -34, plume: 2.6,
    bells: [[0, 0]] as [number, number][], bellDia: 12, bellLen: 24 },
  // GS-100 salvage hauler — the battered industrial type
  { url: '/models/freighter-a.glb', halfLen: 27, radius: 10, collider: 22, plumeX: -34, plume: 2.4,
    bells: [[0, 3.2], [0, -3.2]] as [number, number][], bellDia: 4.2, bellLen: 21 },
  // long-haul star freighter — the big one
  { url: '/models/freighter-b.glb', halfLen: 37, radius: 12, collider: 27, plumeX: -46, plume: 3.0,
    bells: [[0, -4.6], [0, 0], [0, 4.6]] as [number, number][], bellDia: 4.4, bellLen: 26 },
]
export const MAX_BELLS = 3
