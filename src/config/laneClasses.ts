import type {} from 'three'

export interface LaneClass {
  url: string
  halfLen: number
  radius: number
  collider: number
  plumeX: number
  plume: number
  bells: [number, number][]
  bellDia: number
  bellLen: number
  /** for raw hulls without a prepared 'hull' node: bow-to-+X wrap */
  mount?: { rotY: number; scale: number; offset: [number, number, number] }
}

/** The three hull classes working the ice lanes. Bow is +X on all.
 *  bells: engine positions [y, z] at the tail — big hulls run multiple
 *  drives, each flame sized to ITS bell (his ruling 2026-09-12).
 *  Lives here (not in IceRoute) so the ships bench can import the
 *  exact config without dragging the whole activity bundle. */
export const CLASSES: LaneClass[] = [
  // one great central barrel — measured off the mesh 2026-09-23: mouth ring
  // centered (0,0), bore ~9.5, exit plane x≈-33 (his fix: the two offset
  // flames never matched the single bell)
  { url: '/models/imiq.glb', halfLen: 30, radius: 10.5, collider: 24, plumeX: -34, plume: 2.6,
    bells: [[0, 0]] as [number, number][], bellDia: 12, bellLen: 24 },
  // salvage hauler — the Virgon Express (his pick, 2026-09-23): grey flatbed
  // working freighter, two cylinder nozzles measured at (4.7, 11.4/21.8)
  { url: '/models/candidates/virgon.glb', halfLen: 31, radius: 11, collider: 22, plumeX: -28.4, plume: 2.4,
    bells: [[5.0, 4.8], [5.0, 9.2]] as [number, number][], bellDia: 2.8, bellLen: 21,
    mount: { rotY: 0, scale: 0.421, offset: [0.86, 3.05, 0] as [number, number, number] } },
  // long-haul star freighter — the Perseus pod freighter, a PULLER: the
  // ten-bell drive block leads and the exhaust washes back over the pods,
  // so her "bow" is the engine end and plumeX is POSITIVE
  { url: '/models/candidates/perseus.glb', halfLen: 37, radius: 8, collider: 27, plumeX: 30.0, plume: 3.0,
    bells: [
      [-2.63, 1.47], [-2.63, -1.47], [-3.46, 2.36], [-3.46, -2.36], [-4.29, 3.25],
      [-4.29, -3.25], [-5.12, 4.15], [-5.12, -4.15], [-4.8, 1.53], [-4.8, -1.53],
    ] as [number, number][], bellDia: 1.3, bellLen: 26,
    mount: { rotY: -Math.PI / 2, scale: 0.319, offset: [3.16, -0.97, 0] as [number, number, number] } },
]
export const MAX_BELLS = 10
