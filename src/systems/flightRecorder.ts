import { shipRig } from '../state/shipRig'
import { activityState } from '../state/activityState'
import { turretControl } from '../state/turretControl'
import { bbEvent } from './blackbox'

/**
 * THE FLIGHT RECORDER (docs/the-playtest.md part 5 — approved 2026-08-15).
 *
 * Every battle writes a black-box log at 1 Hz, and when the fight ends
 * the debrief prints to the console in plain language plus raw rows.
 * It turns "that felt unfair" into "at 0:42 three threats were inside
 * the ring while two mounts were locked out."
 *
 * Off switch: localStorage 'stellarlogs-recorder' = '0'.
 * Read past runs: window.__debriefs (last 10, newest first).
 */

const RING = 300

interface Row {
  t: number
  nearest: number
  threats: number
  locks: number
  lockouts: number
  hull: number
  speed: number
}

interface Debrief {
  startedAt: string
  noun: string
  seconds: number
  rows: Row[]
  summary: Record<string, string | number>
}

const enabled = localStorage.getItem('stellarlogs-recorder') !== '0'
let live: { t0: number; lastSample: number; rows: Row[]; noun: string; hull0: number } | null = null

function sample(now: number): void {
  if (!live) return
  let nearest = Infinity
  let count = 0
  for (const th of activityState.threats) {
    if (!th.alive || !th.launched) continue
    count++
    const d = Math.hypot(
      th.position.x - shipRig.position.x,
      th.position.y - shipRig.position.y,
      th.position.z - shipRig.position.z,
    )
    if (d < nearest) nearest = d
  }
  let lockouts = 0
  for (const m of turretControl.muzzles) if (m.overheated) lockouts++
  live.rows.push({
    t: Math.round(now - live.t0),
    nearest: nearest === Infinity ? -1 : Math.round(nearest),
    threats: count,
    locks: turretControl.locks,
    lockouts,
    hull: activityState.hull,
    speed: Math.round(shipRig.speed),
  })
}

function debrief(): void {
  if (!live || live.rows.length < 3) {
    live = null
    return
  }
  const rows = live.rows
  const secs = rows.length
  const inRing = rows.filter((r) => r.nearest >= 0 && r.nearest < RING).length
  const nakedInRing = rows.filter((r) => r.nearest >= 0 && r.nearest < RING && r.locks === 0).length
  const lockoutS = rows.filter((r) => r.lockouts > 0).length
  const sittingS = rows.filter((r) => r.speed < 20).length
  const minNearest = Math.min(...rows.map((r) => (r.nearest < 0 ? Infinity : r.nearest)))
  const hullLost = live.hull0 - rows[rows.length - 1].hull
  const d: Debrief = {
    startedAt: new Date(Date.now() - secs * 1000).toISOString(),
    noun: live.noun,
    seconds: secs,
    rows,
    summary: {
      'fight length': `${secs}s`,
      'closest anything got': minNearest === Infinity ? 'never close' : `${minNearest}u`,
      'time with threats inside your gun ring': `${inRing}s`,
      'of that, seconds your guns held NO lock': `${nakedInRing}s`,
      'seconds with a mount in thermal lockout': `${lockoutS}s`,
      'seconds spent nearly stationary': `${sittingS}s (${Math.round((sittingS / secs) * 100)}%)`,
      'hull lost': hullLost,
    },
  }
  bbEvent('debrief', { noun: d.noun, seconds: d.seconds, ...d.summary, rows: rows.slice(0, 240) })
  const w = window as unknown as { __debriefs?: Debrief[] }
  w.__debriefs = [d, ...(w.__debriefs ?? [])].slice(0, 10)
  try {
    localStorage.setItem('stellarlogs-debriefs', JSON.stringify(w.__debriefs.map(({ rows: _r, ...rest }) => rest)))
  } catch {
    /* full disk is not a reason to crash a debrief */
  }
  console.log(
    `%c▍FLIGHT RECORDER — ${live.noun} engagement, ${secs}s`,
    'color:#57e6c4;font-weight:bold',
    '\n' + Object.entries(d.summary).map(([k, v]) => `  ${k}: ${v}`).join('\n'),
    '\n  rows: window.__debriefs[0].rows',
  )
  live = null
}

/** call every frame from the bridge; samples at 1 Hz while a battle runs */
export function updateFlightRecorder(): void {
  if (!enabled) return
  const now = performance.now() / 1000
  if (activityState.battle) {
    if (!live) {
      live = { t0: now, lastSample: 0, rows: [], noun: activityState.threatNoun, hull0: activityState.hull }
    }
    if (now - live.lastSample >= 1) {
      live.lastSample = now
      sample(now)
    }
  } else if (live) {
    debrief()
  }
}
