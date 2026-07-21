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
  /** Big center-screen banner ("WAVE 2 / 3", "DRILL COMPLETE") */
  banner: { text: '', kind: 'info' as 'info' | 'battle' | 'win' | 'fail', until: 0 },
  /** Damage-direction indicator: CSS degrees around screen center (0 = up) */
  hitDirDeg: 0,
  hitDirUntil: 0,
  /** The activity's game clock (three elapsedTime), stamped each frame so the
   *  DOM layers can compare `until` fields against the same timebase */
  bannerClock: 0,
}
