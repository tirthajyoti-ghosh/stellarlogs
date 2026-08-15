import { Vector3 } from 'three'
import { DRIFT_POI } from '../config/pois'
import { ALL_SYSTEMS } from '../config/systems'

/**
 * THE CRIB (docs/the-storm.md passes 3-4) — the Drift's working water
 * stock: ICE, in the MV NILAK'S OWN CARGO HOLDS, cut from her hull and
 * bolted into a cradle on the rim under a sunshade. "HER TANKS ARE OUR
 * WATER" — literally. The deep reserve is buried in the rock and safe;
 * this is the MARGIN, and after the Dry Weeks margin is what the
 * colony cannot afford to lose.
 *
 * Economics (audit-corrected): an open hold BLEEDS — visibly and
 * meaningfully — until it is patched, and the patch boats do not fly
 * into falling rock: repairs hold until the pass is over (the sleet
 * calls holdRepairsUntil), then the skiffs muster and close wounds one
 * at a time. Whole crib refills slowly. All wall-clock: the colony
 * keeps living whether or not anyone is watching.
 */

const KEY = 'stellarlogs-reserve'
const KEY_AT = 'stellarlogs-reserve-at'
const KEY_WOUNDS = 'stellarlogs-crib-wounds'
const KEY_WOUND_AT = 'stellarlogs-crib-wound-at'
const KEY_HOLDOFF = 'stellarlogs-crib-holdoff'

/** refill per real hour when whole */
const REFILL_PER_HOUR = 6
/** an OPEN hold vents this much per MINUTE — real stakes while the
 *  pass runs and the boats wait. ~0.13%/s across a whole pass ≈ lose
 *  the strike cost again if you let it bleed. */
const BLEED_PER_MIN = 2.2
/** ice shattered by the strike itself */
const STRIKE_COST = 3
export const HOLDS = 4
export const REPAIR_S = 45
export const MUSTER_S = 10

const KHIONE = ALL_SYSTEMS.find((s) => s.id === 'khione')
/** THE RADIANT — the real direction of the real star the Surveyor
 *  named for snow. The fiction and the geometry are the same fact. */
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
let woundAt = Number(localStorage.getItem(KEY_WOUND_AT)) || 0
/** repairs may not begin before this (the sleet is still falling) */
let holdOffUntil = Number(localStorage.getItem(KEY_HOLDOFF)) || 0

function save(): void {
  localStorage.setItem(KEY, String(level))
  localStorage.setItem(KEY_AT, String(stampAt))
  localStorage.setItem(KEY_WOUNDS, String(wounds))
  localStorage.setItem(KEY_WOUND_AT, String(woundAt))
  localStorage.setItem(KEY_HOLDOFF, String(holdOffUntil))
}

/** when the repair crew could first go to work */
function workStart(): number {
  return Math.max(woundAt, holdOffUntil) + MUSTER_S * 1000
}

function closedSince(now: number): number {
  if (!wounds || !woundAt) return 0
  const working = (now - workStart()) / 1000
  if (working <= 0) return 0
  return Math.min(wounds, Math.floor(working / REPAIR_S))
}

/** wounds still open right now — what vents, what the skiffs owe */
export function openWounds(): number {
  return Math.max(0, wounds - closedSince(Date.now()))
}

/** the boats are out and welding */
export function skiffsWorking(): boolean {
  if (!wounds || !woundAt) return false
  return Date.now() > workStart() && openWounds() > 0
}

/** seconds until the boats launch (0 unless mustering) */
export function musterIn(): number {
  if (!wounds || !woundAt || openWounds() === 0) return 0
  return Math.max(0, (workStart() - Date.now()) / 1000)
}

/** which hold index a given open wound occupies (stable: 0..wounds-1) */
export function woundHolds(): number[] {
  const open = openWounds()
  const closed = wounds - open
  const out: number[] = []
  for (let i = closed; i < wounds; i++) out.push(i % HOLDS)
  return out
}

/** the sleet is still falling: no boats until it stops */
export function holdRepairsUntil(untilMs: number): void {
  if (untilMs > holdOffUntil) {
    holdOffUntil = untilMs
    save()
  }
}

/** level settled to now: open holds bleed by the minute, a whole crib
 *  refills by the hour — the colony lives without an audience */
export function getReserve(): number {
  const now = Date.now()
  const mins = (now - stampAt) / 60_000
  if (mins > 0.02) {
    const open = openWounds()
    const rate = open > 0 ? -BLEED_PER_MIN * open : REFILL_PER_HOUR / 60
    level = Math.max(0, Math.min(100, level + mins * rate))
    stampAt = now
    if (open === 0 && wounds > 0) {
      wounds = 0
      woundAt = 0
      holdOffUntil = 0
    }
    save()
  }
  return level
}

/** a rock through a hold */
export function holeHold(): number {
  getReserve()
  if (wounds < HOLDS) wounds++
  woundAt = Date.now()
  level = Math.max(0, level - STRIKE_COST)
  stampAt = Date.now()
  save()
  return level
}
