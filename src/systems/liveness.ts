import type { HailRecord } from '../config/hails'

/**
 * THE LIVENESS client (docs/the-liveness.md L0-L3 — his GO 2026-09-01).
 *
 * Local-first, relay on top: the boards render this pilot's own
 * numbers instantly (tallies.ts, unchanged), and when the relay
 * answers, the same frames carry everyone's. If the relay is down
 * nothing breaks and nothing lies — the world-facts stay null and the
 * boards simply say what they always said.
 *
 * Writes are store-and-forward like the black box, but simpler: the
 * pending deltas are three integers in localStorage, merged on every
 * bump, cleared only when the relay confirms the store. Displayed
 * totals = fetched global + still-pending local deltas, so a candle
 * you just lit counts once and immediately.
 */

const ENDPOINT = '/api/liveness'
const PENDING_KEY = 'stellarlogs-liveness-pending'
const SEEDED_KEY = 'stellarlogs-liveness-seeded'
const FLAG_SENT_KEY = 'stellarlogs-liveness-flag'
const PILOT_KEY = 'stellarlogs-pilot'
const REFRESH_MS = 5 * 60_000
const FLUSH_MS = 30_000

export interface WorldFacts {
  candles: number
  torps: number
  rocks: number
  countries: string[]
  hails: HailRecord[]
}

interface Pending {
  candles: number
  torps: number
  rocks: number
}

/** null until the relay has answered at least once this session */
export const livenessState: { facts: WorldFacts | null } = { facts: null }

let pending: Pending = (() => {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    const p = raw ? (JSON.parse(raw) as Pending) : null
    return {
      candles: Number(p?.candles) || 0,
      torps: Number(p?.torps) || 0,
      rocks: Number(p?.rocks) || 0,
    }
  } catch {
    return { candles: 0, torps: 0, rocks: 0 }
  }
})()

function persistPending(): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending))
  } catch {
    /* a full disk never crashes the bridge */
  }
}

function pilotId(): string {
  return localStorage.getItem(PILOT_KEY) ?? 'plt-unknown'
}

/** the pilot's locale-derived flag — never geo-IP (the privacy law) */
export function localFlag(): string {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region ?? ''
    return /^[A-Z]{2}$/.test(region) ? region : ''
  } catch {
    return ''
  }
}

/** deed enters the relay queue; tallies.ts calls these alongside its own counts */
export function lvBump(kind: keyof Pending, n = 1): void {
  pending[kind] += n
  persistPending()
}

/** displayed totals: global + not-yet-relayed local deeds; null while the relay hasn't answered */
export function lvTotals(): Pending | null {
  const f = livenessState.facts
  if (!f) return null
  return {
    candles: f.candles + pending.candles,
    torps: f.torps + pending.torps,
    rocks: f.rocks + pending.rocks,
  }
}

export function lvCountries(): string[] | null {
  return livenessState.facts ? livenessState.facts.countries : null
}

export function lvHails(): HailRecord[] | null {
  return livenessState.facts ? livenessState.facts.hails : null
}

async function post(body: Record<string, unknown>): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pilot: pilotId(), ...body }),
      keepalive: true,
    })
    const data = (await res.json().catch(() => null)) as { stored?: boolean } | null
    return { ok: res.ok && !!data?.stored, status: res.status }
  } catch {
    return { ok: false, status: 0 }
  }
}

let flushing = false
async function flushPending(): Promise<void> {
  if (flushing) return
  const { candles, torps, rocks } = pending
  if (candles + torps + rocks === 0) return
  flushing = true
  const r = await post({ kind: 'bump', candles, torps, rocks })
  if (r.ok) {
    // clear exactly what was sent; deeds done mid-flight stay queued
    pending.candles -= candles
    pending.torps -= torps
    pending.rocks -= rocks
    persistPending()
    if (livenessState.facts) {
      livenessState.facts.candles += candles
      livenessState.facts.torps += torps
      livenessState.facts.rocks += rocks
    }
  }
  flushing = false
}

/** one-time: fold this pilot's pre-backend local history into the world */
async function seedHistory(): Promise<void> {
  if (localStorage.getItem(SEEDED_KEY)) return
  const candles = Number(localStorage.getItem('stellarlogs-candles-lit') ?? 0)
  const torps = Number(localStorage.getItem('stellarlogs-torps-downed') ?? 0)
  const rocks = Number(localStorage.getItem('stellarlogs-rocks-stopped') ?? 0)
  const r = await post({ kind: 'seed', candles, torps, rocks })
  // the server accepts a seed exactly once per pilot; on any confirmed
  // answer (or explicit rejection) never ask again
  if (r.ok || r.status === 429) localStorage.setItem(SEEDED_KEY, '1')
}

async function sendFlag(): Promise<void> {
  if (localStorage.getItem(FLAG_SENT_KEY)) return
  const code = localFlag()
  if (!code) {
    localStorage.setItem(FLAG_SENT_KEY, '1')
    return
  }
  const r = await post({ kind: 'flag', code })
  if (r.ok) localStorage.setItem(FLAG_SENT_KEY, '1')
}

/** transmit a phrasebook hail; optimistically joins the local window on success */
export async function sendHail(o: number, l: number, s: number): Promise<'ok' | 'later' | 'down'> {
  const r = await post({ kind: 'hail', o, l, s, f: localFlag() })
  if (r.ok) {
    const f = livenessState.facts
    if (f) f.hails = [{ o, l, s, f: localFlag(), at: Date.now() }, ...f.hails].slice(0, 30)
    return 'ok'
  }
  return r.status === 429 ? 'later' : 'down'
}

async function refresh(): Promise<void> {
  try {
    const res = await fetch(ENDPOINT)
    if (!res.ok) return
    const data = (await res.json()) as Partial<WorldFacts> & { ok?: boolean }
    if (data.ok === false || typeof data.candles !== 'number') return
    livenessState.facts = {
      candles: data.candles ?? 0,
      torps: data.torps ?? 0,
      rocks: data.rocks ?? 0,
      countries: Array.isArray(data.countries) ? data.countries : [],
      hails: Array.isArray(data.hails) ? data.hails : [],
    }
  } catch {
    /* relay down: facts stay as they were; the boards stay honest */
  }
}

export function installLiveness(): void {
  // late and gentle: the world loads first, the relay is a whisper
  setTimeout(() => {
    void refresh().then(() => {
      void seedHistory()
      void sendFlag()
    })
  }, 4000)
  setInterval(() => void refresh(), REFRESH_MS)
  setInterval(() => void flushPending(), FLUSH_MS)
  window.addEventListener('pagehide', () => void flushPending())
}
