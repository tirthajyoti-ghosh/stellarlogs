/**
 * Local tallies painted on the world's signage (docs/the-neighborhood.md).
 * Honest numbers: they count THIS pilot's real deeds, kept in
 * localStorage. When the liveness backend lands (roadmap #4), these
 * frames stay and the numbers become everyone's.
 */

const TORPS_KEY = 'stellarlogs-torps-downed'
const CANDLES_KEY = 'stellarlogs-candles-lit'

let torps = Number(localStorage.getItem(TORPS_KEY) ?? 0)
let candles = Number(localStorage.getItem(CANDLES_KEY) ?? 0)

export function bumpTorpsDowned(): void {
  torps++
  localStorage.setItem(TORPS_KEY, String(torps))
}
export function getTorpsDowned(): number {
  return torps
}
export function lightCandle(): number {
  candles++
  localStorage.setItem(CANDLES_KEY, String(candles))
  return candles
}
export function getCandles(): number {
  return candles
}

/** When the pilot is at the bell, G belongs to the vigil — the jobs
 *  board (400u away at the Drift) must not eat the same keypress. */
export const gClaims = { vigil: false }
