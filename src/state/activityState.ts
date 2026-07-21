/**
 * Shared state for the in-world activity zones (gunnery range, later the race
 * course). Written per frame by the active activity, read by the HUD's
 * ActivityPanel — imperative, like hudReadouts/shipRig, no React state at 60fps.
 */

export interface ActivityLine {
  label: string
  value: string
}

export interface Threat {
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  alive: boolean
  launched: boolean
}

export const activityState = {
  /** Ship is inside an activity zone */
  active: false,
  /** A combat drill is running — HUD goes to battle stations */
  battle: false,
  title: '',
  hint: '',
  /** Small label/value readouts (TIME, DESTROYED, BEST, ...) */
  lines: [] as ActivityLine[],
  /** Transient banner ("NEW BEST 14"), empty when none */
  flash: '',
  /** Live threat objects (torpedoes etc.), owned by the active activity */
  threats: [] as Threat[],
}
