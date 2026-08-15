/**
 * THE BLACK BOX endpoint (Vercel serverless, deploys with main) —
 * docs/roadmap.md 3.9. The first brick of the liveness backend.
 *
 * Accepts event batches from src/systems/blackbox.ts and stores them
 * in Upstash Redis when the env vars exist (attach via Vercel
 * Marketplace → Upstash Redis; no code change needed). Without
 * storage it still logs a structured summary per batch — and answers
 * stored:false, which tells clients to KEEP their buffer (the
 * store-and-forward contract: no data is ever dropped, it waits).
 *
 * Keys: bb:<YYYY-MM-DD> — a Redis list of JSON batch envelopes.
 */

interface BBBatch {
  pilot?: string
  session?: string
  events?: { t: number; type: string; data?: Record<string, unknown> }[]
}

export default async function handler(
  req: { method?: string; body?: unknown },
  res: {
    status: (code: number) => { json: (body: unknown) => void; end: () => void }
    setHeader: (k: string, v: string) => void
  },
): Promise<void> {
  res.setHeader('cache-control', 'no-store')
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  let batch: BBBatch
  try {
    batch = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as BBBatch
  } catch {
    res.status(400).json({ error: 'bad json' })
    return
  }
  const events = Array.isArray(batch.events) ? batch.events.slice(0, 200) : []
  if (!batch.pilot || events.length === 0) {
    res.status(400).json({ error: 'empty' })
    return
  }

  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN

  // always visible in function logs, storage or not
  console.log(
    `blackbox ${batch.pilot} ${batch.session} n=${events.length} ` +
      events
        .map((e) => e.type)
        .slice(0, 12)
        .join(','),
  )

  if (!url || !token) {
    res.status(200).json({ stored: false, reason: 'no storage attached' })
    return
  }
  try {
    const day = new Date().toISOString().slice(0, 10)
    const envelope = JSON.stringify({
      pilot: batch.pilot,
      session: batch.session,
      at: Date.now(),
      events,
    })
    const r = await fetch(`${url}/rpush/bb:${day}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify([envelope]),
    })
    if (!r.ok) throw new Error(`redis ${r.status}`)
    res.status(200).json({ stored: true })
  } catch (err) {
    console.error('blackbox store failed:', err)
    res.status(200).json({ stored: false, reason: 'store error' })
  }
}
