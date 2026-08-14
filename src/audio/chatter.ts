import { Vector3 } from 'three'
import { shipRig } from '../state/shipRig'
import { activityState } from '../state/activityState'
import { DRIFT_POI } from '../config/pois'
import { STATION_POSITION } from '../config/universe'
import { getAudioBus } from './engine'

/**
 * RADIO CHATTER (Tirtha's ask, bench-approved 2026-08-14): overheard,
 * never performed. Only near the Drift and the comms station; long
 * random gaps; a soft squelch click, a few seconds of traffic, gone.
 * MOSTLY the murmur — real Gemini/Shuttle comm loops (NASA, public
 * domain) band-passed past intelligibility and played faint. Rarely,
 * one clear bite ("go ahead", "no errors", "roll program"). Stands
 * down in battle and inside the vigil's quiet sphere — the Sound Law
 * applies: it must feel like a working port, not a soundtrack.
 */

const MURMUR_URL = '/audio/chatter-murmur.mp3'
const BITE_URLS = [
  '/audio/chatter-bite-1.mp3',
  '/audio/chatter-bite-2.mp3',
  '/audio/chatter-bite-3.mp3',
  '/audio/chatter-bite-4.mp3',
  '/audio/chatter-bite-5.mp3',
]
/** Traffic is audible this close to a comms source */
const RANGE = 1600
/** Seconds between transmissions (random in range) */
const GAP_MIN = 40
const GAP_MAX = 110
const MURMUR_SHARE = 0.8

const DRIFT = new Vector3(...DRIFT_POI.position)
const STATION = new Vector3(...STATION_POSITION)

let murmurBuf: AudioBuffer | null = null
let biteBufs: AudioBuffer[] = []
let loading = false
let nextAt = 0
let started = false

function eligible(): boolean {
  if (activityState.battle) return false
  if (document.body.dataset.vigil === '1') return false
  const p = shipRig.position
  return p.distanceTo(DRIFT) < RANGE || p.distanceTo(STATION) < RANGE
}

function loadAll(ctx: AudioContext): void {
  if (loading) return
  loading = true
  const fetchBuf = (url: string) =>
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((b) => ctx.decodeAudioData(b))
  Promise.all([fetchBuf(MURMUR_URL), ...BITE_URLS.map(fetchBuf)])
    .then(([murmur, ...bites]) => {
      murmurBuf = murmur
      biteBufs = bites
    })
    .catch(() => {
      // stay silent forever — chatter is garnish, never a dependency
    })
}

/** A tiny burst of filtered noise: the squelch opening or closing. */
function squelch(ctx: AudioContext, master: GainNode, at: number): void {
  const len = Math.floor(ctx.sampleRate * 0.03)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = ctx.createBufferSource()
  src.buffer = buf
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1800
  bp.Q.value = 1.2
  const g = ctx.createGain()
  g.gain.value = 0.045
  src.connect(bp).connect(g).connect(master)
  src.start(at)
}

function transmit(): void {
  const bus = getAudioBus()
  if (!bus) return
  const { ctx, master } = bus
  const murmur = Math.random() < MURMUR_SHARE
  const buf = murmur ? murmurBuf : (biteBufs[Math.floor(Math.random() * biteBufs.length)] ?? murmurBuf)
  if (!buf) return

  const src = ctx.createBufferSource()
  src.buffer = buf
  const g = ctx.createGain()
  g.gain.value = 0
  src.connect(g).connect(master)

  const t = ctx.currentTime
  squelch(ctx, master, t)
  if (murmur) {
    // a random 6–12 s window out of the traffic loop, very faint
    const span = 6 + Math.random() * 6
    const offset = Math.random() * Math.max(0.1, buf.duration - span - 0.5)
    const level = 0.035 + Math.random() * 0.02
    g.gain.setTargetAtTime(level, t, 0.4)
    g.gain.setTargetAtTime(0, t + span - 0.8, 0.35)
    src.start(t + 0.05, offset, span)
    squelch(ctx, master, t + span - 0.1)
  } else {
    g.gain.setTargetAtTime(0.09, t, 0.05)
    src.start(t + 0.06)
    squelch(ctx, master, t + buf.duration + 0.08)
  }
  src.onended = () => {
    src.disconnect()
    g.disconnect()
  }
}

/** Idempotent; call once from the app shell. Interval-driven — no
 *  per-frame cost. */
export function startChatter(): void {
  if (started) return
  started = true
  nextAt = performance.now() + (20 + Math.random() * 40) * 1000
  setInterval(() => {
    const bus = getAudioBus()
    if (!bus) return
    if (!murmurBuf && !loading) loadAll(bus.ctx)
    if (performance.now() < nextAt) return
    if (!eligible()) return
    nextAt = performance.now() + (GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN)) * 1000
    transmit()
  }, 3000)
}
