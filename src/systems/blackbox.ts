import { activityState } from '../state/activityState'
import { getReserve } from './reserve'

/**
 * THE BLACK BOX (docs/roadmap.md 3.9) — the ship's data recorder and
 * the first brick of the liveness backend.
 *
 * Everything notable a session does becomes an EVENT: who (anonymous
 * pilot id), on what (device, GPU, touch, screen), doing what
 * (activity transitions, battles, debriefs, tallies, errors, frame
 * rate), for how long. Events batch and post to /api/blackbox — and
 * the pipeline is STORE-AND-FORWARD: a batch only leaves the local
 * buffer once the backend confirms it stored, so with no database
 * attached yet NOTHING is lost; backlogs ride up whenever storage
 * appears. By the playtest, the treasure trove is simply there.
 *
 * Mobile is a first-class citizen now, before the landscape build:
 * touch, orientation and viewport changes are already events.
 *
 * Off switch: localStorage 'stellarlogs-blackbox' = '0'.
 */

const ENDPOINT = '/api/blackbox'
const BUFFER_KEY = 'stellarlogs-blackbox-buffer'
const PILOT_KEY = 'stellarlogs-pilot'
/** keep the offline buffer sane: newest ~600 events survive */
const BUFFER_CAP = 600
const FLUSH_EVERY_MS = 20_000
const FLUSH_AT_COUNT = 40

interface BBEvent {
  /** epoch ms */
  t: number
  type: string
  data?: Record<string, unknown>
}

const enabled = localStorage.getItem('stellarlogs-blackbox') !== '0'

const pilot = (() => {
  let id = localStorage.getItem(PILOT_KEY)
  if (!id) {
    id = 'plt-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
    localStorage.setItem(PILOT_KEY, id)
  }
  return id
})()
const session = 'ses-' + Math.random().toString(36).slice(2, 10)
const startedAt = Date.now()

let queue: BBEvent[] = (() => {
  try {
    const raw = localStorage.getItem(BUFFER_KEY)
    return raw ? (JSON.parse(raw) as BBEvent[]) : []
  } catch {
    return []
  }
})()
let dirty = false
let flushing = false

function persist(): void {
  if (!dirty) return
  dirty = false
  try {
    localStorage.setItem(BUFFER_KEY, JSON.stringify(queue.slice(-BUFFER_CAP)))
  } catch {
    // a full disk loses oldest data, never crashes the bridge
    queue = queue.slice(-100)
  }
}

/** the one public verb */
export function bbEvent(type: string, data?: Record<string, unknown>): void {
  if (!enabled) return
  queue.push({ t: Date.now(), type, data })
  if (queue.length > BUFFER_CAP) queue = queue.slice(-BUFFER_CAP)
  dirty = true
  if (queue.length >= FLUSH_AT_COUNT) void flush()
}

async function flush(useBeacon = false): Promise<void> {
  if (!enabled || flushing || queue.length === 0) return
  flushing = true
  const batch = queue.slice(0, 120)
  const payload = JSON.stringify({ pilot, session, events: batch })
  try {
    if (useBeacon && navigator.sendBeacon) {
      // last words on pagehide: fire and TRUST — beacon can't confirm,
      // so the buffer keeps the batch and dedup happens server-side
      navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }))
      persist()
      return
    }
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
      keepalive: true,
    })
    if (res.ok) {
      const body = (await res.json().catch(() => null)) as { stored?: boolean } | null
      // only a CONFIRMED store clears the buffer — store-and-forward
      if (body?.stored) {
        queue = queue.slice(batch.length)
        dirty = true
      }
    }
  } catch {
    // no backend, offline, dev server: the buffer holds; retry later
  } finally {
    flushing = false
    persist()
  }
}

function deviceSnapshot(): Record<string, unknown> {
  const nav = navigator as Navigator & { connection?: { effectiveType?: string } }
  let gpu = ''
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') ?? c.getContext('webgl')
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''
    }
  } catch {
    /* fingerprint shields may refuse; the box records what it can */
  }
  return {
    ua: nav.userAgent,
    touch: nav.maxTouchPoints > 0,
    screen: `${screen.width}x${screen.height}@${devicePixelRatio}`,
    viewport: `${innerWidth}x${innerHeight}`,
    orientation: screen.orientation?.type ?? '',
    lang: nav.language,
    net: nav.connection?.effectiveType ?? '',
    gpu,
    referrer: document.referrer || '',
  }
}

/** watches the world at 1 Hz and turns transitions into events */
let lastOwner = ''
let lastBattle = false
let lastTitle = ''
let frames = 0
let fpsWindowStart = 0
let lastFpsReport = 0

/** call once per rendered frame (cheap; heavy work runs at 1 Hz) */
export function updateBlackbox(now: number): void {
  if (!enabled) return
  frames++
  if (fpsWindowStart === 0) fpsWindowStart = now
  // 1 Hz watcher
  if (now - lastFpsReport < 1) return
  lastFpsReport = now

  const owner = activityState.owner
  if (owner !== lastOwner) {
    if (lastOwner) bbEvent('activity-end', { owner: lastOwner })
    if (owner) bbEvent('activity-start', { owner, title: activityState.title })
    lastOwner = owner
  }
  if (activityState.battle !== lastBattle) {
    lastBattle = activityState.battle
    bbEvent(lastBattle ? 'battle-start' : 'battle-end', {
      noun: activityState.threatNoun,
      owner,
      reserve: Math.round(getReserve()),
    })
  }
  if (activityState.title !== lastTitle) {
    lastTitle = activityState.title
    if (lastTitle) bbEvent('title', { title: lastTitle })
  }
  // fps every 30 s: the mobile build will live or die by this number
  if (now - fpsWindowStart >= 30) {
    bbEvent('fps', { avg: Math.round(frames / (now - fpsWindowStart)) })
    frames = 0
    fpsWindowStart = now
  }
  if (Date.now() - lastFlushAt > FLUSH_EVERY_MS) {
    lastFlushAt = Date.now()
    void flush()
  }
}
let lastFlushAt = Date.now()

/** boot: session metadata, error hooks, lifecycle hooks */
export function installBlackbox(): void {
  if (!enabled) return
  bbEvent('session-start', { ...deviceSnapshot(), buffered: queue.length })
  addEventListener('error', (e) => bbEvent('error', { msg: String(e.message).slice(0, 300) }))
  addEventListener('unhandledrejection', (e) =>
    bbEvent('error', { msg: ('reason' in e ? String(e.reason) : 'rejection').slice(0, 300) }),
  )
  // the landscape build's future telemetry, live already
  addEventListener('orientationchange', () =>
    bbEvent('orientation', { o: screen.orientation?.type ?? '', viewport: `${innerWidth}x${innerHeight}` }),
  )
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      bbEvent('session-pause', { seconds: Math.round((Date.now() - startedAt) / 1000) })
      void flush(true)
    } else {
      bbEvent('session-resume')
    }
  })
  addEventListener('pagehide', () => {
    bbEvent('session-end', { seconds: Math.round((Date.now() - startedAt) / 1000) })
    void flush(true)
  })
  // whatever survived from past sessions goes up first
  void flush()
}
