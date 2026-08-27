/**
 * THE BLACK BOX, read side — aggregate stats only (docs/the-mobile-hud.md
 * part F). Reads the last days of bb:<date> lists from Upstash and
 * returns ANONYMOUS AGGREGATES: session counts, fps/jank distributions,
 * dpr, perf arms. No UAs, no pilot ids, no raw events leave the server.
 */

interface BBEvent {
  t: number
  type: string
  data?: Record<string, unknown>
}
interface Envelope {
  pilot?: string
  session?: string
  events?: BBEvent[]
}

function median(xs: number[]): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

export default async function handler(
  req: { method?: string },
  res: {
    status: (code: number) => { json: (body: unknown) => void }
    setHeader: (k: string, v: string) => void
  },
): Promise<void> {
  res.setHeader('cache-control', 'no-store')
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  if (!url || !token) {
    res.status(200).json({ error: 'no storage attached' })
    return
  }
  const days: string[] = []
  for (let i = 0; i < 10; i++) {
    const d = new Date(Date.now() - i * 86_400_000)
    days.push(d.toISOString().slice(0, 10))
  }
  type Sess = {
    touch: boolean
    gpuClass: string
    arm: string
    fps: number[]
    jank: number[]
    dpr: number[]
    debriefs: number
    events: number
  }
  const sessions = new Map<string, Sess>()
  let batches = 0
  for (const day of days) {
    try {
      const r = await fetch(`${url}/lrange/bb:${day}/0/-1`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) continue
      const body = (await r.json()) as { result?: string[] }
      for (const raw of body.result ?? []) {
        let env: Envelope
        try {
          env = JSON.parse(raw) as Envelope
        } catch {
          continue
        }
        if (!env.session || !env.events) continue
        batches++
        let s = sessions.get(env.session)
        if (!s) {
          s = { touch: false, gpuClass: '?', arm: '', fps: [], jank: [], dpr: [], debriefs: 0, events: 0 }
          sessions.set(env.session, s)
        }
        for (const e of env.events) {
          s.events++
          if (e.type === 'session-start' && e.data) {
            s.touch = e.data.touch === true
            s.arm = String(e.data.perf ?? '')
            const gpu = String(e.data.gpu ?? '')
            s.gpuClass = /Apple/i.test(gpu)
              ? 'apple'
              : /Adreno/i.test(gpu)
                ? 'adreno'
                : /Mali/i.test(gpu)
                  ? 'mali'
                  : /NVIDIA|GeForce/i.test(gpu)
                    ? 'nvidia'
                    : gpu
                      ? 'other'
                      : '?'
          }
          if (e.type === 'fps' && e.data) {
            if (typeof e.data.avg === 'number') s.fps.push(e.data.avg)
            if (typeof e.data.jankPct === 'number') s.jank.push(e.data.jankPct)
            if (typeof e.data.dpr === 'number' && e.data.dpr > 0) s.dpr.push(e.data.dpr)
          }
          if (e.type === 'debrief') s.debriefs++
        }
      }
    } catch {
      /* a missing day is fine */
    }
  }
  const rows = [...sessions.values()]
  const group = (filter: (s: Sess) => boolean) => {
    const g = rows.filter(filter)
    const fps = g.flatMap((s) => s.fps)
    const jank = g.flatMap((s) => s.jank)
    return {
      sessions: g.length,
      fpsSamples: fps.length,
      fpsMedian: median(fps),
      fpsMin: fps.length ? Math.min(...fps) : 0,
      jankMedianPct: median(jank),
      jankMaxPct: jank.length ? Math.max(...jank) : 0,
      dprsSeen: [...new Set(g.flatMap((s) => s.dpr))].sort(),
      gpus: [...new Set(g.map((s) => s.gpuClass))],
      arms: [...new Set(g.map((s) => s.arm).filter(Boolean))],
      debriefs: g.reduce((a, s) => a + s.debriefs, 0),
    }
  }
  res.status(200).json({
    daysScanned: days.length,
    batches,
    totalSessions: rows.length,
    touch: group((s) => s.touch),
    desktop: group((s) => !s.touch),
    perDevice: {
      apple: group((s) => s.touch && s.gpuClass === 'apple'),
      adreno: group((s) => s.touch && s.gpuClass === 'adreno'),
      mali: group((s) => s.touch && s.gpuClass === 'mali'),
    },
  })
}
