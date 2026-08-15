import { Vector3 } from 'three'
import { DRIFT_POI } from '../config/pois'
import { ALL_SYSTEMS } from '../config/systems'

/**
 * THE CRIB (docs/the-storm.md pass 3) — the Drift's working water stock.
 *
 * Not tanks of liquid: NOBODY keeps liquid water outside in the Belt (it
 * would freeze, and a breach would flash it away). It is ICE, held in the
 * MV NILAK'S OWN SALVAGED CARGO HOLDS — she was an ice hauler, her holds
 * were built for exactly this — bolted into a cradle on the rim under a
 * sunshade. "HER TANKS ARE OUR WATER" is literally true; a Belter calls
 * a hold a tank.
 *
 * The deep reserve is buried in the rock and safe. THIS is the working
 * margin, and after the Dry Weeks margin is what these people cannot
 * afford to lose. A holed hold loses ice at the impact AND keeps
 * sublimating while it is open — so damage BLEEDS until the colony's
 * skiffs patch it.
 */

const KEY = 'stellarlogs-reserve'
const KEY_AT = 'stellarlogs-reserve-at'
const KEY_WOUNDS = 'stellarlogs-crib-wounds'
const KEY_WOUND_AT = 'stellarlogs-crib-wound-at'

/** the reclaimers win this back per real hour when the crib is whole */
const REFILL_PER_HOUR = 6
/** an open hold sublimates this much per real hour, per wound */
const BLEED_PER_HOUR = 9
/** the shattered ice lost in the strike itself */
const STRIKE_COST = 3
/** how many holds the cradle carries */
export const HOLDS = 4
/** the colony's boats take this long to close one wound */
export const REPAIR_S = 45
/** they muster this long after the pass before the skiffs fly */
export const MUSTER_S = 14

const KHIONE = ALL_SYSTEMS.find((s) => s.id === 'khione')
/** THE RADIANT — the real direction of the real star the Surveyor named
 *  for snow. The fiction and the geometry are the same fact. */
export const SLEET_RADIANT = (() => {
  const v = KHIONE
    ? new Vector3(...KHIONE.position).sub(new Vector3(...DRIFT_POI.position))
    : new Vector3(1, 0, 1)
  return v.normalize()
})()

/** the crib faces the stream — it is what the rock meets first */
export const CRIB_POS = new Vector3(...DRIFT_POI.position).addScaledVector(
  new Vector3(SLEET_RADIANT.x, 0, SLEET_RADIANT.z).normalize(),
  430,
)
CRIB_POS.y += 55
export const CRIB_RADIUS = 46

let level = (() => {
  const raw = Number(localStorage.getItem(KEY))
  return Number.isFinite(raw) && raw > 0 ? Math.min(100, raw) : 100
})()
let stampAt = Number(localStorage.getItem(KEY_AT)) || Date.now()
let wounds = Math.max(0, Math.min(HOLDS, Number(localStorage.getItem(KEY_WOUNDS)) || 0))
/** when the last wound was opened — repair is timed off this */
let woundAt = Number(localStorage.getItem(KEY_WOUND_AT)) || 0

function save(): void {
  localStorage.setItem(KEY, String(level))
  localStorage.setItem(KEY_AT, String(stampAt))
  localStorage.setItem(KEY_WOUNDS, String(wounds))
  localStorage.setItem(KEY_WOUND_AT, String(woundAt))
}

/** How many wounds the boats have already closed since the pass. */
function closedSince(now: number): number {
  if (!wounds || !woundAt) return 0
  const working = (now - woundAt) / 1000 - MUSTER_S
  if (working <= 0) return 0
  return Math.min(wounds, Math.floor(working / REPAIR_S))
}

/** Wounds still open right now (what the crib shows, what bleeds). */
export function openWounds(): number {
  return Math.max(0, wounds - closedSince(Date.now()))
}

/** Are the boats out working? (mustered, and something still open) */
export function skiffsWorking(): boolean {
  if (!wounds || !woundAt) return false
  const since = (Date.now() - woundAt) / 1000
  return since > MUSTER_S && openWounds() > 0
}

/** Seconds until the boats launch (>0 only during the muster). */
export function musterIn(): number {
  if (!wounds || !woundAt) return 0
  return Math.max(0, MUSTER_S - (Date.now() - woundAt) / 1000)
}

/**
 * The level, settled to now: open holds bleed, a whole crib refills.
 * Runs whether or not anyone is watching — the colony keeps living.
 */
export function getReserve(): number {
  const now = Date.now()
  const hours = (now - stampAt) / 3_600_000
  if (hours > 0.002) {
    const open = openWounds()
    const rate = open > 0 ? -BLEED_PER_HOUR * open : REFILL_PER_HOUR
    level = Math.max(0, Math.min(100, level + hours * rate))
    stampAt = now
    if (open === 0 && wounds > 0) {
      // the boats finished: the crib is whole again
      wounds = 0
      woundAt = 0
    }
    save()
  }
  return level
}

/** A rock through a hold. Returns the level after the strike. */
export function holeHold(): number {
  getReserve()
  if (wounds < HOLDS) wounds++
  woundAt = Date.now()
  level = Math.max(0, level - STRIKE_COST)
  stampAt = Date.now()
  save()
  return level
}
