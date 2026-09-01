/**
 * THE LIVENESS endpoint (docs/the-liveness.md L0 — his GO 2026-09-01).
 *
 * Fully separate from the black box: that pipe is analytics and stays
 * internal forever (his rule); THIS pipe carries only the approved
 * WORLD-FACTS — candles lit, torpedoes downed, rocks stopped, the
 * pennant countries, and phrasebook hails. Nothing here ever derives
 * from or exposes the bb:* keys.
 *
 * GET  -> the world-facts, edge-cached 60s (the whole planet reads
 *         Redis about once a minute no matter the traffic).
 * POST -> validated, clamped, rate-limited writes:
 *         {pilot, kind:'bump', candles?, torps?, rocks?}   deltas
 *         {pilot, kind:'seed', candles?, torps?, rocks?}   one-time
 *              per pilot: folds pre-backend local history in
 *         {pilot, kind:'flag', code}                       pennant
 *         {pilot, kind:'hail', o, l, s, f}                 phrasebook
 *
 * Abuse posture (the doc's §5): server-side clamps on every number
 * (One Million Checkboxes died of unvalidated input, not missing rate
 * limits); fixed-window rate limits per pilot AND per IP-hash (2-3
 * Redis commands, cheapest algorithm); hails additionally require the
 * pilot to have been seen >=5 minutes ago (server clock, not a client
 * claim); hail content is three enum indices validated against the
 * same phrasebook file the client imports — free text cannot exist.
 * Shadowban: a pilot id in lv:shadow gets stored:true and a write to
 * nowhere.
 */

// The phrasebook itself lives in src/config/hails.ts (the client
// renders hail text from indices; the server never needs the words).
// These BOUNDS are pinned to that file — grow the phrasebook there,
// bump these here. An index past the client's array renders as
// silence, never as text, so a desync degrades safely.
const PHRASE_BOUNDS = { o: 7, l: 16, s: 7 } // openers, lines, sign-offs
interface HailRecord {
  o: number
  l: number
  s: number
  f: string
  at: number
}
function validHail(o: unknown, l: unknown, s: unknown): boolean {
  const ok = (v: unknown, max: number): boolean =>
    typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < max
  return ok(o, PHRASE_BOUNDS.o) && ok(l, PHRASE_BOUNDS.l) && ok(s, PHRASE_BOUNDS.s)
}

const HAILS_KEPT = 30
/** per-request delta ceilings — generous for real play, absurd for bots */
const BUMP_CAP = { candles: 4, torps: 40, rocks: 90 }
/** one-time history fold-in ceilings */
const SEED_CAP = { candles: 40, torps: 900, rocks: 2500 }
/** fixed-window limits: [window seconds, allowed] */
const LIMITS: Record<string, [number, number]> = {
  bump: [3600, 40],
  seed: [86400, 2],
  flag: [86400, 3],
  hail: [3600, 2],
}
const HAIL_MIN_AGE_MS = 5 * 60 * 1000

interface Req {
  method?: string
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
}
interface Res {
  status: (code: number) => { json: (body: unknown) => void }
  setHeader: (k: string, v: string) => void
}

function redisEnv(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  return url && token ? { url, token } : null
}

/** pipeline: one round trip, results in order */
async function redis(cmds: (string | number)[][]): Promise<unknown[]> {
  const env = redisEnv()
  if (!env) throw new Error('no storage')
  const r = await fetch(`${env.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.token}` },
    body: JSON.stringify(cmds),
  })
  if (!r.ok) throw new Error(`redis ${r.status}`)
  const rows = (await r.json()) as { result?: unknown; error?: string }[]
  return rows.map((row) => {
    if (row.error) throw new Error(row.error)
    return row.result
  })
}

/** FNV-1a — a stable non-reversible bucket for rate-limit keys, never stored beyond the window */
function ipHash(req: Req): string {
  const fwd = req.headers?.['x-forwarded-for']
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim() ?? 'unknown'
  let h = 0x811c9dc5
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/** fixed window on both pilot and ip buckets; true = allowed */
async function allow(kind: string, pilot: string, ip: string): Promise<boolean> {
  const [win, cap] = LIMITS[kind]
  const slot = Math.floor(Date.now() / 1000 / win)
  const kp = `lv:rl:${kind}:p:${pilot}:${slot}`
  const ki = `lv:rl:${kind}:i:${ip}:${slot}`
  const [np, ni] = (await redis([
    ['INCR', kp],
    ['EXPIRE', kp, win + 60],
    ['INCR', ki],
    ['EXPIRE', ki, win + 60],
  ]).then((r) => [r[0], r[2]])) as [number, number]
  // the ip bucket runs looser (CGNAT shares addresses)
  return np <= cap && ni <= cap * 4
}

function clampDelta(v: unknown, cap: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0
  return Math.max(0, Math.min(n, cap))
}

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method === 'GET') {
    res.setHeader('cache-control', 'public, s-maxage=60, stale-while-revalidate=600')
    try {
      const [candles, torps, rocks, countries, hails] = await redis([
        ['GET', 'lv:candles'],
        ['GET', 'lv:torps'],
        ['GET', 'lv:rocks'],
        ['SMEMBERS', 'lv:countries'],
        ['LRANGE', 'lv:hails', 0, HAILS_KEPT - 1],
      ])
      res.status(200).json({
        candles: Number(candles ?? 0),
        torps: Number(torps ?? 0),
        rocks: Number(rocks ?? 0),
        countries: Array.isArray(countries) ? countries : [],
        hails: (Array.isArray(hails) ? hails : [])
          .map((h) => {
            try {
              return JSON.parse(String(h)) as HailRecord
            } catch {
              return null
            }
          })
          .filter(Boolean),
      })
    } catch {
      res.status(200).json({ ok: false })
    }
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'GET or POST' })
    return
  }
  res.setHeader('cache-control', 'no-store')

  let body: Record<string, unknown>
  try {
    body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as Record<
      string,
      unknown
    >
  } catch {
    res.status(400).json({ error: 'bad json' })
    return
  }
  const pilot = typeof body.pilot === 'string' ? body.pilot.slice(0, 40) : ''
  const kind = typeof body.kind === 'string' ? body.kind : ''
  if (!pilot.startsWith('plt-') || !(kind in LIMITS)) {
    res.status(400).json({ error: 'bad request' })
    return
  }

  try {
    // first-seen registration (server clock — the hail age gate reads this)
    const seenKey = `lv:seen:${pilot}`
    const [shadowed] = (await redis([
      ['SISMEMBER', 'lv:shadow', pilot],
      ['SET', seenKey, Date.now(), 'NX'],
      ['EXPIRE', seenKey, 60 * 86400],
    ])) as [number]
    if (shadowed === 1) {
      // a poisoned pilot writes to nowhere and never learns it
      res.status(200).json({ stored: true })
      return
    }
    if (!(await allow(kind, pilot, ipHash(req)))) {
      res.status(429).json({ error: 'later' })
      return
    }

    if (kind === 'bump' || kind === 'seed') {
      const cap = kind === 'seed' ? SEED_CAP : BUMP_CAP
      if (kind === 'seed') {
        const [fresh] = (await redis([['SET', `lv:seeded:${pilot}`, '1', 'NX']])) as [
          string | null,
        ]
        if (fresh === null) {
          res.status(200).json({ stored: true }) // history already folded in
          return
        }
      }
      const candles = clampDelta(body.candles, cap.candles)
      const torps = clampDelta(body.torps, cap.torps)
      const rocks = clampDelta(body.rocks, cap.rocks)
      if (candles + torps + rocks === 0) {
        res.status(200).json({ stored: true })
        return
      }
      const cmds: (string | number)[][] = []
      if (candles) cmds.push(['INCRBY', 'lv:candles', candles])
      if (torps) cmds.push(['INCRBY', 'lv:torps', torps])
      if (rocks) cmds.push(['INCRBY', 'lv:rocks', rocks])
      await redis(cmds)
      res.status(200).json({ stored: true })
      return
    }

    if (kind === 'flag') {
      const code = typeof body.code === 'string' ? body.code.toUpperCase() : ''
      if (!/^[A-Z]{2}$/.test(code)) {
        res.status(400).json({ error: 'bad code' })
        return
      }
      await redis([['SADD', 'lv:countries', code]])
      res.status(200).json({ stored: true })
      return
    }

    // kind === 'hail'
    if (!validHail(body.o, body.l, body.s)) {
      res.status(400).json({ error: 'not in the phrasebook' })
      return
    }
    const flag = typeof body.f === 'string' && /^[A-Z]{2}$/.test(body.f.toUpperCase())
      ? body.f.toUpperCase()
      : ''
    const [seenAt] = (await redis([['GET', seenKey]])) as [string | null]
    if (!seenAt || Date.now() - Number(seenAt) < HAIL_MIN_AGE_MS) {
      // a pilot the relay just met does not get the transmitter yet
      res.status(429).json({ error: 'new on the line' })
      return
    }
    const record: HailRecord = {
      o: body.o as number,
      l: body.l as number,
      s: body.s as number,
      f: flag,
      at: Date.now(),
    }
    await redis([
      ['LPUSH', 'lv:hails', JSON.stringify(record)],
      ['LTRIM', 'lv:hails', 0, HAILS_KEPT - 1],
    ])
    res.status(200).json({ stored: true })
    return
  } catch (err) {
    console.error('liveness error:', err)
    res.status(200).json({ stored: false })
  }
}
