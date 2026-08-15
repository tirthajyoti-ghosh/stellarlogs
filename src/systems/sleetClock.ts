/**
 * THE KHIONE CLOCK (docs/the-storm.md pass 4) — global truth.
 *
 * The pass is CHARTED: its times are pure functions of the wall clock,
 * which means the docks board can always post the next one, the event
 * itself just reads the same clock, and when the liveness backend
 * lands every visitor shares the same schedule for free. The colony's
 * oldest protection is still the Surveyor's arithmetic.
 */

/** seconds between pass starts — a rare, posted event, not a subway.
 *  Dev override: localStorage 'stellarlogs-sleet-period' (seconds). */
export const STORM_S = 110
export const WARN_S = 30
const PERIOD_S = (() => {
  const raw = Number(localStorage.getItem('stellarlogs-sleet-period'))
  const want = Number.isFinite(raw) && raw >= 60 ? raw : 1200
  // a period shorter than storm+warn would make the phase math lie
  return Math.max(want, STORM_S + WARN_S + 60)
})()

export interface SleetPhase {
  phase: 'idle' | 'warn' | 'storm'
  /** seconds until the next pass begins (0 while one is running) */
  toPass: number
  /** seconds left in the current storm (0 outside one) */
  left: number
  /** 0..1 how far through the current storm */
  t: number
}

export function sleetPhase(nowMs = Date.now()): SleetPhase {
  const t = (nowMs / 1000) % PERIOD_S
  if (t < STORM_S) return { phase: 'storm', toPass: 0, left: STORM_S - t, t: t / STORM_S }
  const toPass = PERIOD_S - t
  if (toPass < WARN_S) return { phase: 'warn', toPass, left: 0, t: 0 }
  return { phase: 'idle', toPass, left: 0, t: 0 }
}

/** the board line: what the dockmaster posts about the stream */
export function sleetBoardRow(): string {
  const p = sleetPhase()
  if (p.phase === 'storm') return 'KHIONE PASS · OVERHEAD'
  const mm = Math.floor(p.toPass / 60)
  const ss = Math.floor(p.toPass % 60)
  return `KHIONE PASS · T-${mm}:${String(ss).padStart(2, '0')} · FIRST CHARTS SCHEDULE`
}
