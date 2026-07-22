/**
 * Procedural ship audio — no samples, pure WebAudio synthesis, no idle hum:
 * - main drive: deep filtered rumble following thrust/boost
 * - RCS: airy hiss while the attitude thrusters fire (manual or autopilot)
 * - jump drive: rising whoosh + detuned shimmer, silent otherwise
 * - PDCs: GAU-8-style rotary BRRRT while firing + servo whine while slewing
 * Everything hangs off one master gain for the mute toggle.
 */
import { turretControl } from '../state/turretControl'

interface AudioEngine {
  ctx: AudioContext
  master: GainNode
  thrusterGain: GainNode
  thrusterFilter: BiquadFilterNode
  rcsGain: GainNode
  warpGain: GainNode
  warpNoiseFilter: BiquadFilterNode
  warpOsc: OscillatorNode
  warpOsc2: OscillatorNode
  // PDC fire: GAU-8-style rotary-cannon BRRRT — the ~66Hz pulse-repetition
  // rate gates a noise burst train and doubles as the bass fundamental
  pdcGain: GainNode
  pdcRateOsc: OscillatorNode
  pdcBodyOsc: OscillatorNode
  // PDC traverse: servo whine while the balls slew
  servoGain: GainNode
  servoOsc: OscillatorNode
}

let engine: AudioEngine | null = null
let muted = localStorage.getItem('stellarlogs-muted') === '1'

function makeBrownNoise(ctx: AudioContext): AudioBuffer {
  const length = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  return buffer
}

function makeWhiteNoise(ctx: AudioContext): AudioBuffer {
  const length = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

/** Build the graph. Must be called from a user gesture. */
export function startAudio(): void {
  if (engine) return
  const ctx = new AudioContext()
  const master = ctx.createGain()
  master.gain.value = muted ? 0 : 1
  master.connect(ctx.destination)

  // Main drive: looped brown-noise rumble through a lowpass
  const rumble = ctx.createBufferSource()
  rumble.buffer = makeBrownNoise(ctx)
  rumble.loop = true
  const thrusterFilter = ctx.createBiquadFilter()
  thrusterFilter.type = 'lowpass'
  thrusterFilter.frequency.value = 260
  const thrusterGain = ctx.createGain()
  thrusterGain.gain.value = 0
  rumble.connect(thrusterFilter).connect(thrusterGain).connect(master)
  rumble.start()

  // RCS: airy white-noise hiss, band-passed high — clearly distinct from the
  // drive rumble; fires while attitude thrusters puff
  const hiss = ctx.createBufferSource()
  hiss.buffer = makeWhiteNoise(ctx)
  hiss.loop = true
  const hissFilter = ctx.createBiquadFilter()
  hissFilter.type = 'bandpass'
  hissFilter.frequency.value = 2600
  hissFilter.Q.value = 0.8
  const rcsGain = ctx.createGain()
  rcsGain.gain.value = 0
  hiss.connect(hissFilter).connect(rcsGain).connect(master)
  hiss.start()

  // Jump drive: noise whoosh (sweeping bandpass) + detuned saw shimmer
  const warpGain = ctx.createGain()
  warpGain.gain.value = 0
  warpGain.connect(master)

  const whoosh = ctx.createBufferSource()
  whoosh.buffer = makeWhiteNoise(ctx)
  whoosh.loop = true
  const warpNoiseFilter = ctx.createBiquadFilter()
  warpNoiseFilter.type = 'bandpass'
  warpNoiseFilter.frequency.value = 240
  warpNoiseFilter.Q.value = 1.4
  const whooshGain = ctx.createGain()
  whooshGain.gain.value = 1.6
  whoosh.connect(warpNoiseFilter).connect(whooshGain).connect(warpGain)
  whoosh.start()

  const shimmerFilter = ctx.createBiquadFilter()
  shimmerFilter.type = 'bandpass'
  shimmerFilter.frequency.value = 900
  shimmerFilter.Q.value = 2
  const shimmerGain = ctx.createGain()
  shimmerGain.gain.value = 0.5
  shimmerFilter.connect(shimmerGain).connect(warpGain)
  const warpOsc = ctx.createOscillator()
  warpOsc.type = 'sawtooth'
  warpOsc.frequency.value = 160
  const warpOsc2 = ctx.createOscillator()
  warpOsc2.type = 'sawtooth'
  warpOsc2.frequency.value = 161.5
  warpOsc.connect(shimmerFilter)
  warpOsc2.connect(shimmerFilter)
  warpOsc.start()
  warpOsc2.start()

  // PDC fire — rotary-cannon burst train: white noise amplitude-gated at the
  // pulse-repetition rate (square LFO at audio rate), plus a saw fundamental
  // at the same frequency for the deep "raspberry" body. Silent until firing.
  const pdcGain = ctx.createGain()
  pdcGain.gain.value = 0
  pdcGain.connect(master)

  const burstNoise = ctx.createBufferSource()
  burstNoise.buffer = makeWhiteNoise(ctx)
  burstNoise.loop = true
  const burstBand = ctx.createBiquadFilter()
  burstBand.type = 'bandpass'
  burstBand.frequency.value = 700
  burstBand.Q.value = 0.5
  const burstGate = ctx.createGain()
  burstGate.gain.value = 0.5
  const pdcRateOsc = ctx.createOscillator()
  pdcRateOsc.type = 'square'
  pdcRateOsc.frequency.value = 66
  const rateDepth = ctx.createGain()
  rateDepth.gain.value = 0.5
  pdcRateOsc.connect(rateDepth).connect(burstGate.gain) // gate: 0..1 at 66Hz
  burstNoise.connect(burstBand).connect(burstGate).connect(pdcGain)
  burstNoise.start()
  pdcRateOsc.start()

  const pdcBodyOsc = ctx.createOscillator()
  pdcBodyOsc.type = 'sawtooth'
  pdcBodyOsc.frequency.value = 66
  const bodyLow = ctx.createBiquadFilter()
  bodyLow.type = 'lowpass'
  bodyLow.frequency.value = 240
  const bodyGain = ctx.createGain()
  bodyGain.gain.value = 0.55
  pdcBodyOsc.connect(bodyLow).connect(bodyGain).connect(pdcGain)
  pdcBodyOsc.start()

  // PDC traverse servo — narrow whine whose pitch rides the slew rate
  const servoGain = ctx.createGain()
  servoGain.gain.value = 0
  const servoOsc = ctx.createOscillator()
  servoOsc.type = 'sawtooth'
  servoOsc.frequency.value = 220
  const servoBand = ctx.createBiquadFilter()
  servoBand.type = 'bandpass'
  servoBand.frequency.value = 900
  servoBand.Q.value = 3
  servoOsc.connect(servoBand).connect(servoGain).connect(master)
  servoOsc.start()

  engine = {
    ctx,
    master,
    thrusterGain,
    thrusterFilter,
    rcsGain,
    warpGain,
    warpNoiseFilter,
    warpOsc,
    warpOsc2,
    pdcGain,
    pdcRateOsc,
    pdcBodyOsc,
    servoGain,
    servoOsc,
  }
}

export type WarpAudioPhase = 'idle' | 'align' | 'jump'

/** Per-frame drive state → smooth audio params. Cheap: time-constant ramps. */
export function updateAudio(
  thrusting: boolean,
  boosting: boolean,
  warpPhase: WarpAudioPhase,
  rcsFiring: boolean,
): void {
  if (!engine) return
  const t = engine.ctx.currentTime
  const jumping = warpPhase === 'jump'
  const aligning = warpPhase === 'align'

  // Main drive rumble (muted while the jump drive has the ship)
  const thrustTarget = jumping ? 0 : thrusting ? (boosting ? 0.34 : 0.18) : 0
  engine.thrusterGain.gain.setTargetAtTime(thrustTarget, t, 0.12)
  engine.thrusterFilter.frequency.setTargetAtTime(boosting ? 520 : 260, t, 0.2)

  // RCS hiss: manual attitude puffs, louder sustained hiss during auto-align
  const rcsTarget = aligning ? 0.09 : rcsFiring ? 0.05 : 0
  engine.rcsGain.gain.setTargetAtTime(rcsTarget, t, 0.06)

  // Jump: whoosh sweeps up and the shimmer brightens while jumping
  engine.warpGain.gain.setTargetAtTime(jumping ? 0.12 : 0, t, jumping ? 0.25 : 0.4)
  engine.warpNoiseFilter.frequency.setTargetAtTime(jumping ? 1200 : 240, t, 1.2)
  engine.warpOsc.frequency.setTargetAtTime(jumping ? 340 : 160, t, 0.8)
  engine.warpOsc2.frequency.setTargetAtTime(jumping ? 343 : 161.5, t, 0.8)

  // PDC fire: BRRRT while spun-up and firing with locks; the pulse rate rides
  // the spin-up (40 → 66Hz) so bursts audibly wind up like a rotary cannon
  const shooting = turretControl.firing && turretControl.spin > 0.85 && turretControl.locks > 0
  const fireGain = shooting ? Math.min(0.38, 0.16 + turretControl.locks * 0.045) : 0
  engine.pdcGain.gain.setTargetAtTime(fireGain, t, shooting ? 0.03 : 0.08)
  const rate = 40 + 26 * turretControl.spin
  engine.pdcRateOsc.frequency.setTargetAtTime(rate, t, 0.06)
  engine.pdcBodyOsc.frequency.setTargetAtTime(rate, t, 0.06)

  // Traverse servo: whine follows total slew rate, silent when parked
  const slew = Math.min(1, turretControl.traverseSpeed / 6)
  engine.servoGain.gain.setTargetAtTime(slew * 0.05, t, 0.07)
  engine.servoOsc.frequency.setTargetAtTime(180 + slew * 320, t, 0.07)
}

/** One-shot: incoming-wave klaxon — two descending two-tone blasts. */
export function triggerKlaxon(): void {
  if (!engine) return
  const { ctx, master } = engine
  const t = ctx.currentTime
  for (let i = 0; i < 2; i++) {
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    const at = t + i * 0.34
    o.frequency.setValueAtTime(540, at)
    o.frequency.exponentialRampToValueAtTime(320, at + 0.24)
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 640
    band.Q.value = 1.2
    const gn = ctx.createGain()
    gn.gain.setValueAtTime(0, at)
    gn.gain.linearRampToValueAtTime(0.09, at + 0.02)
    gn.gain.linearRampToValueAtTime(0, at + 0.28)
    o.connect(band).connect(gn).connect(master)
    o.start(at)
    o.stop(at + 0.3)
  }
}

/** One-shot: torpedo impact — deep thud + metallic ring + alarm chirp. */
export function triggerImpact(): void {
  if (!engine) return
  const { ctx, master } = engine
  const t = ctx.currentTime

  // Thud: filtered noise burst + dropping sine
  const noise = ctx.createBufferSource()
  noise.buffer = makeWhiteNoise(ctx)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 260
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(0.55, t)
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
  noise.connect(lp).connect(ng).connect(master)
  noise.start(t)
  noise.stop(t + 0.4)

  const boom = ctx.createOscillator()
  boom.type = 'sine'
  boom.frequency.setValueAtTime(110, t)
  boom.frequency.exponentialRampToValueAtTime(38, t + 0.3)
  const bg = ctx.createGain()
  bg.gain.setValueAtTime(0.5, t)
  bg.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
  boom.connect(bg).connect(master)
  boom.start(t)
  boom.stop(t + 0.45)

  // Metallic ring
  const ring = ctx.createOscillator()
  ring.type = 'triangle'
  ring.frequency.value = 1180
  const rg = ctx.createGain()
  rg.gain.setValueAtTime(0.08, t + 0.02)
  rg.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
  ring.connect(rg).connect(master)
  ring.start(t + 0.02)
  ring.stop(t + 0.55)

  // Alarm chirp ×2
  for (let i = 0; i < 2; i++) {
    const a = ctx.createOscillator()
    a.type = 'square'
    a.frequency.value = 760
    const ag = ctx.createGain()
    const at = t + 0.28 + i * 0.22
    ag.gain.setValueAtTime(0.0, at)
    ag.gain.linearRampToValueAtTime(0.05, at + 0.02)
    ag.gain.linearRampToValueAtTime(0.0, at + 0.13)
    a.connect(ag).connect(master)
    a.start(at)
    a.stop(at + 0.15)
  }
}

/** One-shot: race gate chirp — a clean rising ping; pitch climbs with step. */
export function triggerGatePing(step: number): void {
  if (!engine) return
  const { ctx, master } = engine
  const t = ctx.currentTime
  const f = 620 + step * 26
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(f, t)
  o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.07)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.14, t + 0.015)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + 0.3)
}

/** One-shot: drill-complete fanfare — three rising blips + sparkle. */
export function triggerFanfare(): void {
  if (!engine) return
  const { ctx, master } = engine
  const t = ctx.currentTime
  const notes = [523.25, 659.25, 783.99] // C5 E5 G5
  notes.forEach((f, i) => {
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.value = f
    const g = ctx.createGain()
    const at = t + i * 0.13
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(0.12, at + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.5)
    o.connect(g).connect(master)
    o.start(at)
    o.stop(at + 0.55)
  })
  const sparkle = ctx.createBufferSource()
  sparkle.buffer = makeWhiteNoise(ctx)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 5200
  const sg = ctx.createGain()
  sg.gain.setValueAtTime(0.06, t + 0.35)
  sg.gain.exponentialRampToValueAtTime(0.001, t + 1.1)
  sparkle.connect(hp).connect(sg).connect(master)
  sparkle.start(t + 0.35)
  sparkle.stop(t + 1.2)
}

export function isMuted(): boolean {
  return muted
}

export function toggleMute(): boolean {
  muted = !muted
  localStorage.setItem('stellarlogs-muted', muted ? '1' : '')
  if (engine) {
    engine.master.gain.setTargetAtTime(muted ? 0 : 1, engine.ctx.currentTime, 0.05)
  }
  return muted
}
