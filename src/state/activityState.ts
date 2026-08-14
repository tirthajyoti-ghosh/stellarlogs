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
  /** A turret is currently locked onto this threat */
  tracked?: boolean
  /** DARK RUNNER coast: track lost — the scope draws a ghost, guns drop it */
  dark?: boolean
  /** last known position at the moment the track dropped */
  lastKnown?: { x: number; y: number; z: number }
  /**
   * What this torpedo is homing on when it is NOT the player (escort work:
   * the hauler's live position ref). The battle radar draws the threat axis
   * to it — stationing reads as "put my dot on those lines".
   */
  targetPos?: { x: number; y: number; z: number }
}

export const activityState = {
  /** Ship is inside an activity zone */
  active: false,
  /** Which activity currently owns the shared panel/banner state */
  owner: '',
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
  /** Tier of the live banner (0 alarm/command · 1 event · 2 outcome) */
  bannerTier: 3,
  /** T3 FLAVOR — cargo toasts, radio chatter. Lives in the panel's quiet
   *  region, never the center (docs/the-voice.md) */
  flavor: { text: '', until: 0 },
  /** A T2 outcome blocked by a live alarm; promoted the moment it clears */
  pendingOutcome: null as null | {
    text: string
    kind: 'info' | 'battle' | 'win' | 'fail'
    seconds: number
  },
  /** Damage-direction indicator: CSS degrees around screen center (0 = up) */
  hitDirDeg: 0,
  hitDirUntil: 0,
  /** Battle vitals for the combat HUD cluster (written by the activity) */
  hull: 3,
  hullMax: 3,
  wave: 0,
  waveMax: 3,
  /** What the battle HUD calls a wave — drills run WAVEs, raiders fire SALVOs */
  waveLabel: 'WAVE',
  /** Drill finished while the ship is still inside — offer a re-run */
  canRestart: false,
  /** One-shot re-run request (Space / touch button), consumed by the activity */
  restartRequest: false,
  /** A job is on the table (label for the accept UI), empty when none */
  offer: '',
  /** One-shot accept (G / touch button), consumed by the offering activity */
  acceptRequest: false,
  /** The STANDING manhunt on the same board (label; empty when none) */
  offerHunt: '',
  /** One-shot accept for the manhunt (H / its touch button) */
  acceptHuntRequest: false,
  /** THE HUNT FOCUS: on contract the world's tourist signage goes dark —
   *  only mission labels survive (the bridge clears the board for a hunt) */
  focus: false,
  /** THE HUNT's hostile hull (live position ref) — the scope's only ship glyph */
  hostile: null as null | { x: number; y: number; z: number },
  hostileVel: { x: 0, y: 0, z: 0 },
  /** surrender-lock progress 0..1, drawn as an arc around the hostile glyph */
  hostileLock: 0,
  /** Her name — the ONE name the scope prints (the show's move: a single
   *  white name outranks a dozen labels) */
  hostileName: '',
  /** She has squawked and gone dark: the hunt becomes an ARREST, and the
   *  instrument stops calling her a threat */
  hostileYielded: false,
  /** Race guidance: world position of the next gate (null = no marker) */
  raceTarget: null as { x: number; y: number; z: number } | null,
  /** Label shown on the race marker ("START", "GATE 4", "FINISH") */
  raceTargetLabel: '',
  /** The activity's game clock (three elapsedTime), stamped each frame so the
   *  DOM layers can compare `until` fields against the same timebase */
  bannerClock: 0,
}

/**
 * THE VOICE (docs/the-voice.md): the HUD is one crew member talking, and a
 * crew member does not interrupt "hull's failing" to mention what the
 * station drinks. Every banner write goes through this arbiter:
 *
 *   T0 ALARM/COMMAND — owns the center; only a newer T0 may replace it.
 *   T1 EVENT — takes a free center; blocked by a live T0 it is DROPPED
 *              (events are moments; a delayed moment is a lie).
 *   T2 OUTCOME — takes a free center; blocked, it QUEUES and follows the
 *              alarm out (outcomes are why the alarm ended).
 *   T3 FLAVOR — never the center: the panel's quiet flash region.
 */
export function say(
  tier: 0 | 1 | 2 | 3,
  text: string,
  kind: 'info' | 'battle' | 'win' | 'fail',
  seconds: number,
): void {
  const now = activityState.bannerClock
  if (tier === 3) {
    activityState.flavor = { text, until: now + seconds }
    return
  }
  const live = activityState.banner.text !== '' && activityState.banner.until > now
  if (live && tier > activityState.bannerTier) {
    if (tier === 2) activityState.pendingOutcome = { text, kind, seconds }
    return
  }
  activityState.banner = { text, kind, until: now + seconds }
  activityState.bannerTier = tier
}
