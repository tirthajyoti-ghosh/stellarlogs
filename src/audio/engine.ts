/**
 * Procedural ship audio — no samples, pure WebAudio synthesis:
 * a deep ambient drone, filtered-noise thrusters that follow the drive
 * state, and a shimmering layer while the jump drive is lit.
 * Everything hangs off one master gain for the mute toggle.
 */

interface AudioEngine {
  ctx: AudioContext
  master: GainNode
  thrusterGain: GainNode
  thrusterFilter: BiquadFilterNode
  warpGain: GainNode
  warpOsc: OscillatorNode
}

let engine: AudioEngine | null = null
let muted = localStorage.getItem('stellarlogs-muted') === '1'

function makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < length; i++) {
    // brown-ish noise: integrate white noise for a deep rumble
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  return buffer
}

/** Build the graph. Must be called from a user gesture. */
export function startAudio(): void {
  if (engine) return
  const ctx = new AudioContext()
  const master = ctx.createGain()
  master.gain.value = muted ? 0 : 1
  master.connect(ctx.destination)

  // Ambient drone: two detuned lows + slow swell
  const droneGain = ctx.createGain()
  droneGain.gain.value = 0.05
  const droneFilter = ctx.createBiquadFilter()
  droneFilter.type = 'lowpass'
  droneFilter.frequency.value = 160
  droneGain.connect(droneFilter).connect(master)
  for (const [freq, type] of [
    [55, 'sine'],
    [55.7, 'triangle'],
    [110.3, 'sine'],
  ] as const) {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    const g = ctx.createGain()
    g.gain.value = freq > 100 ? 0.25 : 1
    osc.connect(g).connect(droneGain)
    osc.start()
  }
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.05
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.02
  lfo.connect(lfoGain).connect(droneGain.gain)
  lfo.start()

  // Thruster: looped rumble noise through a lowpass, gained by drive state
  const noise = ctx.createBufferSource()
  noise.buffer = makeNoiseBuffer(ctx)
  noise.loop = true
  const thrusterFilter = ctx.createBiquadFilter()
  thrusterFilter.type = 'lowpass'
  thrusterFilter.frequency.value = 260
  const thrusterGain = ctx.createGain()
  thrusterGain.gain.value = 0
  noise.connect(thrusterFilter).connect(thrusterGain).connect(master)
  noise.start()

  // Warp shimmer: high detuned pair, silent until a jump
  const warpGain = ctx.createGain()
  warpGain.gain.value = 0
  const warpFilter = ctx.createBiquadFilter()
  warpFilter.type = 'bandpass'
  warpFilter.frequency.value = 900
  warpFilter.Q.value = 2
  warpGain.connect(master)
  const warpOsc = ctx.createOscillator()
  warpOsc.type = 'sawtooth'
  warpOsc.frequency.value = 180
  const warpOsc2 = ctx.createOscillator()
  warpOsc2.type = 'sawtooth'
  warpOsc2.frequency.value = 181.5
  warpOsc.connect(warpFilter)
  warpOsc2.connect(warpFilter)
  warpFilter.connect(warpGain)
  warpOsc.start()
  warpOsc2.start()

  engine = { ctx, master, thrusterGain, thrusterFilter, warpGain, warpOsc }
}

/** Per-frame drive state → smooth audio params. Cheap: time-constant ramps. */
export function updateAudio(thrusting: boolean, boosting: boolean, warping: boolean): void {
  if (!engine) return
  const t = engine.ctx.currentTime
  const thrustTarget = warping ? 0.1 : thrusting ? (boosting ? 0.34 : 0.18) : 0
  engine.thrusterGain.gain.setTargetAtTime(thrustTarget, t, 0.12)
  engine.thrusterFilter.frequency.setTargetAtTime(boosting ? 520 : 260, t, 0.2)
  engine.warpGain.gain.setTargetAtTime(warping ? 0.05 : 0, t, 0.3)
  engine.warpOsc.frequency.setTargetAtTime(warping ? 320 : 180, t, 0.6)
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
