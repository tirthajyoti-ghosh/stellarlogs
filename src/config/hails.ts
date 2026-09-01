/**
 * THE PHRASEBOOK (docs/the-liveness.md §4.3, Branch B — his ruling
 * 2026-09-01). A hail is never free text: it is composed from standard
 * Belter traffic phrases — stem × line × sign-off. Constrained
 * vocabulary is the entire moderation story (the Dark Souls lesson:
 * ambiguity generates meaning; an allowlist closes the abuse surface
 * completely). Curation law: every phrase must be victimless — no
 * entry can be aimed AT another pilot.
 *
 * This file is PURE DATA for the client. The server (api/liveness.ts)
 * cannot import across the api/ boundary at runtime, so it validates
 * against pinned PHRASE_BOUNDS = {o:7, l:16, s:7} — if you grow an
 * array here, bump the bound there. A desync degrades safely: an
 * index past an array renders as silence, never as text.
 */

export const HAIL_OPENERS = [
  '', // silence is a valid opener
  'TO ALL SHIPS —',
  'FROM A PASSING HULL —',
  'LOG THIS —',
  'OYE BOSMANG —',
  'TO WHOEVER READS THIS —',
  'RELAYED IN GOOD FAITH —',
] as const

export const HAIL_LINES = [
  'KEEP HER TANKS WET',
  'NO SHIP LEAVES THE DRIFT DRY',
  'I STOOD THE PICKET',
  'I LIT A CANDLE FOR THE NILAK',
  'THE LANE PROVIDES',
  'MIND THE SLEET HOUR',
  'THE DRAUGR HUNTS THESE LANES',
  'GOOD HUNTING ON THE LANE',
  'THE DOCKS BOARD PAYS FAIR',
  'FIRST TIME THIS FAR OUT',
  'CAME FOR THE WORK, STAYED FOR THE VIEW',
  'FLY LOOSE, LAND SOFT',
  'THE VOID IS KINDER THAN IT LOOKS',
  'SOMEBODY WAS HERE BEFORE YOU',
  'THE COFFEE AT THE DRIFT IS REAL',
  'I HEARD THE RADIO MURMUR TOO',
] as const

export const HAIL_SIGNOFFS = [
  '', // and a valid way to end
  '— FLY SAFE',
  '— SEE YOU ON THE LANE',
  '— A FRIEND',
  '— OUT',
  '— NO REPLY NEEDED',
  '— KEEP THE LIGHT ON',
] as const

export interface HailRecord {
  /** opener index */
  o: number
  /** line index */
  l: number
  /** sign-off index */
  s: number
  /** 2-letter country code or '' */
  f: string
  /** epoch ms when relayed */
  at: number
}

export function composeHail(o: number, l: number, s: number): string {
  const parts = [HAIL_OPENERS[o] ?? '', HAIL_LINES[l] ?? '', HAIL_SIGNOFFS[s] ?? '']
  return parts.filter(Boolean).join(' ')
}

export function validHail(o: unknown, l: unknown, s: unknown): boolean {
  return (
    typeof o === 'number' && Number.isInteger(o) && o >= 0 && o < HAIL_OPENERS.length &&
    typeof l === 'number' && Number.isInteger(l) && l >= 0 && l < HAIL_LINES.length &&
    typeof s === 'number' && Number.isInteger(s) && s >= 0 && s < HAIL_SIGNOFFS.length
  )
}
