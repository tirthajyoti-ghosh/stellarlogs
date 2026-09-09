import { Vector3 } from 'three'
import { say } from '../state/activityState'
import { bbEvent } from './blackbox'
import { DRIFT_POI } from '../config/pois'
import { ALL_SYSTEMS } from '../config/systems'

/**
 * THE SERVICE RECORD (docs/the-logbook.md, terminal.html v2 — LOCKED
 * 2026-09-09). The achievements verdict as this universe's own
 * paperwork: digital endorsements on the pilot's hand terminal,
 * issued in the field by the authority that witnessed the deed and
 * COUNTERSIGNED by the dockmaster when the pilot calls at the Drift.
 *
 * Laws carried from the exploration:
 * - Real feats only; the vigil NEVER appears here.
 * - No empty slots, no counts-of-remaining, nothing global. The
 *   record shows what is IN it.
 * - Repeats bump a count on the standing endorsement; the countersign
 *   belongs to the first issue.
 * - Local only (localStorage). The relay is not involved: an
 *   endorsement is personal paper, not a world-fact.
 * - Grandfathering: only what the ship can PROVE on first open
 *   (visited flag, a persisted gunnery best time). Everything else
 *   starts when the record starts.
 */

export type EndorsementId =
  | 'port-of-entry'
  | 'pdc-certification'
  | 'escort-duty'
  | 'interdiction'
  | 'picket-stood'
  | 'full-chart'

export interface Endorsement {
  id: EndorsementId
  /** repeat count (1 on first issue) */
  count: number
  /** epoch ms of first issue */
  firstAt: number
  /** epoch ms of the dockmaster's countersign; 0 = pending */
  signedAt: number
}

export const ENDORSEMENT_DEFS: Record<
  EndorsementId,
  { deed: string; issuer: string; detail: string }
> = {
  'port-of-entry': {
    deed: 'PORT OF ENTRY',
    issuer: 'AMNIA DOCKMASTER',
    detail: 'LANE 1',
  },
  'pdc-certification': {
    deed: 'PDC CERTIFICATION',
    issuer: 'MILITIA RANGE OFFICE',
    detail: 'ESCORT STANDARD',
  },
  'escort-duty': {
    deed: 'ESCORT DUTY',
    issuer: 'AMNIA DOCKMASTER',
    detail: 'CARGO DELIVERED',
  },
  interdiction: {
    deed: 'INTERDICTION',
    issuer: 'CONSTABULARY',
    detail: 'NO SHOTS',
  },
  'picket-stood': {
    deed: 'PICKET STOOD',
    issuer: 'CIVIL DEFENSE',
    detail: 'KHIONE PASS',
  },
  'full-chart': {
    deed: 'THE FULL CHART',
    issuer: "SURVEYOR'S OFFICE",
    detail: 'EVERY CHARTED SYSTEM',
  },
}

const RECORD_KEY = 'stellarlogs-service-record'
const VISITED_SYS_KEY = 'stellarlogs-systems-visited'
const GRANDFATHER_KEY = 'stellarlogs-service-record-issued'
/** proximity that counts as "having entered" a system */
const SYSTEM_RANGE = 2600
/** proximity to the Drift that lets the dockmaster countersign */
const DOCK_RANGE = 480

const DRIFT = new Vector3(...DRIFT_POI.position)
/** the chart the Surveyor's office cares about: the surveyed systems */
const CHARTED = ALL_SYSTEMS.filter((s) => !s.inert).map((s) => ({
  id: s.id,
  pos: new Vector3(...s.position),
}))

const record: Partial<Record<EndorsementId, Endorsement>> = (() => {
  try {
    const raw = localStorage.getItem(RECORD_KEY)
    return raw ? (JSON.parse(raw) as Partial<Record<EndorsementId, Endorsement>>) : {}
  } catch {
    return {}
  }
})()

const visitedSystems = new Set<string>(
  (() => {
    try {
      const raw = localStorage.getItem(VISITED_SYS_KEY)
      return raw ? (JSON.parse(raw) as string[]) : []
    } catch {
      return []
    }
  })(),
)

/** bumped on every mutation so the drawer re-renders cheaply */
export const recordVersion = { n: 0 }

function persist(): void {
  try {
    localStorage.setItem(RECORD_KEY, JSON.stringify(record))
  } catch {
    /* a full disk never crashes the bridge */
  }
  recordVersion.n++
}

export function getEndorsements(): Endorsement[] {
  return Object.values(record as Record<string, Endorsement>).sort(
    (a, b) => a.firstAt - b.firstAt,
  )
}

export function pendingEndorsements(): Endorsement[] {
  return getEndorsements().filter((e) => e.signedAt === 0)
}

/**
 * A deed happened, witnessed by its authority. First time creates the
 * pending endorsement (the countersign pull); repeats bump the count.
 * preSigned covers deeds that happen AT the dock (Port of Entry).
 */
export function issueEndorsement(id: EndorsementId, preSigned = false): void {
  const existing = record[id]
  if (existing) {
    existing.count++
    persist()
    bbEvent('sr-repeat', { id, count: existing.count })
    return
  }
  record[id] = { id, count: 1, firstAt: Date.now(), signedAt: preSigned ? Date.now() : 0 }
  persist()
  bbEvent('sr-issue', { id, preSigned })
  if (!preSigned) {
    say(1, 'ENDORSEMENT ISSUED — COUNTERSIGN AT THE DRIFT', 'info', 3.2)
  }
}

/** only what the ship can prove; runs once, before any UI mounts */
function grandfather(): void {
  if (localStorage.getItem(GRANDFATHER_KEY)) return
  localStorage.setItem(GRANDFATHER_KEY, '1')
  const now = Date.now()
  if (localStorage.getItem('stellarlogs-visited') && !record['port-of-entry']) {
    record['port-of-entry'] = { id: 'port-of-entry', count: 1, firstAt: now, signedAt: now }
  }
  if (Number(localStorage.getItem('stellarlogs-defense-best-time-v3') ?? 0) > 0 &&
      !record['pdc-certification']) {
    record['pdc-certification'] = { id: 'pdc-certification', count: 1, firstAt: now, signedAt: now }
  }
  persist()
}

let lastSweep = 0
let portLogged = !!record['port-of-entry']

/** called every frame from the ship loop; heavy work runs at ~1.5s */
export function updateServiceRecord(shipPos: Vector3, now: number): void {
  if (now - lastSweep < 1.5) return
  lastSweep = now

  // the dockmaster's desk: entering the Drift logs entry and signs ink
  const atDock = shipPos.distanceTo(DRIFT) < DOCK_RANGE
  if (atDock) {
    if (!portLogged) {
      portLogged = true
      issueEndorsement('port-of-entry', true)
      say(1, 'PORT OF ENTRY LOGGED — NEW RECORD, BOSMANG? FIRST PAGE IS ON THE HOUSE', 'win', 4)
    }
    const pending = pendingEndorsements()
    if (pending.length > 0) {
      const at = Date.now()
      for (const e of pending) e.signedAt = at
      persist()
      bbEvent('sr-countersign', { n: pending.length })
      say(
        1,
        pending.length === 1
          ? 'THE DOCKMASTER COUNTERSIGNS — THE ENDORSEMENT IS ON RECORD'
          : `THE DOCKMASTER COUNTERSIGNS — ${pending.length} ENDORSEMENTS ON RECORD`,
        'win',
        3.6,
      )
      if ('vibrate' in navigator) navigator.vibrate?.(24)
    }
  }

  // the Surveyor's sweep: which charted systems has this hull entered?
  if (!record['full-chart']) {
    let changed = false
    for (const sys of CHARTED) {
      if (!visitedSystems.has(sys.id) && shipPos.distanceTo(sys.pos) < SYSTEM_RANGE) {
        visitedSystems.add(sys.id)
        changed = true
      }
    }
    if (changed) {
      try {
        localStorage.setItem(VISITED_SYS_KEY, JSON.stringify([...visitedSystems]))
      } catch {
        /* held in memory for the session */
      }
      if (CHARTED.every((s) => visitedSystems.has(s.id))) {
        issueEndorsement('full-chart')
      }
    }
  }
}

grandfather()
