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

  // the real shuttle recordings arrive whenever they arrive
  loadDriveSamples(ctx, master)

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

/**
 * THE REAL DRIVE (Tirtha's bench verdict, 2026-08-14): the synthesized
 * rumble stays as the sub layer, but the mid/high CRACKLE — the part
 * synthesis can't fake — is the actual STS shuttle launch close-mic
 * recording (NASA, public domain), cut to a seamless 16 s loop from the
 * stretch his ear picked (~47 s in). Max burn gets the shuttle's double
 * sonic boom as the transition BLAST, then the loop runs hotter.
 * Samples load lazily after boot; until (or if ever) they arrive, the
 * synth carries alone — no boot-time cost, no hard dependency.
 */
let driveSampleGain: GainNode | null = null
let driveSampleSrc: AudioBufferSourceNode | null = null
let driveBoostWas = false

/** THE PDC UNIT SHOT (his call, 2026-08-14): one clean M242 Bushmaster
 *  round (CC0, freesound 854186) is the unit; we repeat it at whatever
 *  rate the guns need. Per-shot distinction by construction — his exact
 *  complaint about miniguns ("one continuous sound") is unrepeatable.
 *  Bass held back in the cut itself; sharp stays sharp. */
let pdcShotBuf: AudioBuffer | null = null
let nextPdcShot = 0

function playPdcShot(ctx: AudioContext, master: GainNode, at: number, locks: number): void {
  if (!pdcShotBuf) return
  const src = ctx.createBufferSource()
  src.buffer = pdcShotBuf
  src.playbackRate.value = 0.95 + Math.random() * 0.1
  const g = ctx.createGain()
  g.gain.value = Math.min(0.11, 0.055 + locks * 0.012)
  src.connect(g).connect(master)
  src.start(at)
  src.onended = () => {
    src.disconnect()
    g.disconnect()
  }
}

function loadDriveSamples(ctx: AudioContext, master: GainNode): void {
  const fetchBuf = (url: string) =>
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((b) => ctx.decodeAudioData(b))
  fetchBuf('/audio/pdc-shot.mp3')
    .then((b) => {
      pdcShotBuf = b
    })
    .catch(() => {})
  fetchBuf('/audio/drive-blast.mp3')
    .then((b) => {
      driveBlastBuf = b
    })
    .catch(() => {})
  fetchBuf('/audio/drive-loop.mp3')
    .then((loop) => {
      driveSampleGain = ctx.createGain()
      driveSampleGain.gain.value = 0
      driveSampleGain.connect(master)
      const src = ctx.createBufferSource()
      src.buffer = loop
      src.loop = true
      src.connect(driveSampleGain)
      src.start()
      driveSampleSrc = src
    })
    .catch(() => {
      // no samples, no drama — the synth rumble carries alone
    })
}

/** One-shot: the max-burn detonation. Back to the RECORDED boom — the
 *  synthesized dry thump was rejected ("muted… I like the previous one
 *  better even with the echo"). A drier recorded explosion is being
 *  hunted on the bench; until his pick, the single sonic boom stands. */
let driveBlastBuf: AudioBuffer | null = null
function triggerDriveBlast(): void {
  if (!engine || !driveBlastBuf) return
  const { ctx, master } = engine
  const src = ctx.createBufferSource()
  src.buffer = driveBlastBuf
  const g = ctx.createGain()
  g.gain.value = 0.6
  src.connect(g).connect(master)
  src.start()
  src.onended = () => {
    src.disconnect()
    g.disconnect()
  }
}

/** The live audio bus, for satellite systems (radio chatter, jukebox).
 *  Null until the pilot's first gesture starts the context. */
export function getAudioBus(): { ctx: AudioContext; master: GainNode } | null {
  return engine ? { ctx: engine.ctx, master: engine.master } : null
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

  // Main drive rumble (muted while the jump drive has the ship). With
  // the real recording loaded, the synth drops to a sub-bass bed and
  // the shuttle crackle carries the character.
  const haveSample = !!driveSampleGain
  const thrustTarget =
    (jumping ? 0 : thrusting ? (boosting ? 0.34 : 0.18) : 0) * (haveSample ? 0.6 : 1)
  engine.thrusterGain.gain.setTargetAtTime(thrustTarget, t, 0.12)
  engine.thrusterFilter.frequency.setTargetAtTime(boosting ? 520 : 260, t, 0.2)
  if (driveSampleGain && driveSampleSrc) {
    const boostNow = boosting && thrusting && !jumping
    // normal thrust sits LOW (his staging: quiet cruise makes the fuel
    // dump unmistakable); max burn is the loud state
    const sampleTarget = jumping ? 0 : thrusting ? (boostNow ? 0.5 : 0.11) : 0
    if (boostNow && !driveBoostWas) {
      // the grammar of a fuel dump: intake DIP → dry detonation →
      // fast SWELL into the hotter, denser crackle
      triggerDriveBlast()
      const g = driveSampleGain.gain
      g.cancelScheduledValues(t)
      g.setValueAtTime(Math.min(g.value, 0.05), t)
      g.setTargetAtTime(0.5, t + 0.1, 0.12)
    } else {
      driveSampleGain.gain.setTargetAtTime(sampleTarget, t, thrusting ? 0.1 : 0.25)
    }
    // burn runs the recording a shade faster — denser crackle, more heat
    driveSampleSrc.playbackRate.setTargetAtTime(boostNow ? 1.07 : 1.0, t, 0.3)
    driveBoostWas = boostNow
  }

  // RCS hiss: manual attitude puffs, louder sustained hiss during auto-align
  const rcsTarget = aligning ? 0.09 : rcsFiring ? 0.05 : 0
  engine.rcsGain.gain.setTargetAtTime(rcsTarget, t, 0.06)

  // Jump: whoosh sweeps up and the shimmer brightens while jumping
  engine.warpGain.gain.setTargetAtTime(jumping ? 0.12 : 0, t, jumping ? 0.25 : 0.4)
  engine.warpNoiseFilter.frequency.setTargetAtTime(jumping ? 1200 : 240, t, 1.2)
  engine.warpOsc.frequency.setTargetAtTime(jumping ? 340 : 160, t, 0.8)
  engine.warpOsc2.frequency.setTargetAtTime(jumping ? 343 : 161.5, t, 0.8)

  // PDC fire. With the Bushmaster unit shot loaded: real rounds at a
  // rate where every shot stays DISTINCT (his verdict on miniguns —
  // never a continuous roar), scheduled with a small lookahead and
  // per-shot rate jitter. Synth BRRRT is the no-sample fallback only.
  const shooting = turretControl.firing && turretControl.spin > 0.85 && turretControl.locks > 0
  if (pdcShotBuf) {
    engine.pdcGain.gain.setTargetAtTime(0, t, 0.05)
    if (shooting) {
      const perSec = 35 + turretControl.spin * 5
      if (nextPdcShot < t) nextPdcShot = t + 0.01
      while (nextPdcShot < t + 0.12) {
        playPdcShot(engine.ctx, engine.master, nextPdcShot, turretControl.locks)
        nextPdcShot += (1 / perSec) * (0.95 + Math.random() * 0.1)
      }
    } else {
      nextPdcShot = 0
    }
  } else {
    const fireGain = shooting ? Math.min(0.38, 0.16 + turretControl.locks * 0.045) : 0
    engine.pdcGain.gain.setTargetAtTime(fireGain, t, shooting ? 0.03 : 0.08)
    const rate = 40 + 26 * turretControl.spin
    engine.pdcRateOsc.frequency.setTargetAtTime(rate, t, 0.06)
    engine.pdcBodyOsc.frequency.setTargetAtTime(rate, t, 0.06)
  }

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

/**
 * THE SPINE. A railgun is not a gun going off — it is a building's worth
 * of current released at once. Charge: a deep capacitor swell, felt more
 * than heard. Fire: sub-drop + brown-noise pressure wave + the rails
 * singing as they cool. No slap, no toy whine (the bench's first sounds
 * were rejected in one listen: "like spanking someone" — Tirtha).
 */
let spineCharge: { osc: OscillatorNode; oscGain: GainNode; noise: AudioBufferSourceNode; bp: BiquadFilterNode; nGain: GainNode } | null = null

export function railChargeStart(): void {
  if (!engine || spineCharge) return
  const { ctx, master } = engine
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = 42
  const oscGain = ctx.createGain()
  oscGain.gain.value = 0.0001
  osc.connect(oscGain).connect(master)
  osc.start()
  const noise = ctx.createBufferSource()
  noise.buffer = makeBrownNoise(ctx)
  noise.loop = true
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 110
  bp.Q.value = 2.2
  const nGain = ctx.createGain()
  nGain.gain.value = 0.0001
  noise.connect(bp).connect(nGain).connect(master)
  noise.start()
  spineCharge = { osc, oscGain, noise, bp, nGain }
}

/** k 0..1 charge fraction; the swell rises WITHOUT ever becoming a whine */
export function railChargeUpdate(k: number): void {
  if (!spineCharge || !engine) return
  const t = engine.ctx.currentTime
  spineCharge.osc.frequency.setTargetAtTime(42 + k * 38, t, 0.05)
  spineCharge.oscGain.gain.setTargetAtTime(0.02 + k * 0.1, t, 0.08)
  spineCharge.bp.frequency.setTargetAtTime(110 + k * 240, t, 0.08)
  spineCharge.nGain.gain.setTargetAtTime(0.015 + k * 0.05, t, 0.08)
}

export function railChargeStop(): void {
  if (!spineCharge || !engine) return
  const t = engine.ctx.currentTime
  spineCharge.oscGain.gain.setTargetAtTime(0.0001, t, 0.05)
  spineCharge.nGain.gain.setTargetAtTime(0.0001, t, 0.05)
  spineCharge.osc.stop(t + 0.4)
  spineCharge.noise.stop(t + 0.4)
  spineCharge = null
}

/** the capacitors dump to heat instead of the rails: a falling sigh */
export function triggerRailVent(): void {
  if (!engine) return
  const { ctx, master } = engine
  const t = ctx.currentTime
  const noise = ctx.createBufferSource()
  noise.buffer = makeBrownNoise(ctx)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(900, t)
  lp.frequency.exponentialRampToValueAtTime(120, t + 0.7)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.14, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.75)
  noise.connect(lp).connect(g).connect(master)
  noise.start(t)
  noise.stop(t + 0.8)
}

export function triggerRailFire(): void {
  if (!engine) return
  const { ctx, master } = engine
  const t = ctx.currentTime

  // the pressure wave: brown noise, deep-passed, real attack not a slap
  const body = ctx.createBufferSource()
  body.buffer = makeBrownNoise(ctx)
  const blp = ctx.createBiquadFilter()
  blp.type = 'lowpass'
  blp.frequency.value = 210
  const bg = ctx.createGain()
  bg.gain.setValueAtTime(0.0001, t)
  bg.gain.exponentialRampToValueAtTime(0.85, t + 0.012)
  bg.gain.exponentialRampToValueAtTime(0.001, t + 0.7)
  body.connect(blp).connect(bg).connect(master)
  body.start(t)
  body.stop(t + 0.75)

  // the sub drop: the room-shaking part
  const sub = ctx.createOscillator()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(74, t)
  sub.frequency.exponentialRampToValueAtTime(23, t + 0.5)
  const sg = ctx.createGain()
  sg.gain.setValueAtTime(0.6, t)
  sg.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
  sub.connect(sg).connect(master)
  sub.start(t)
  sub.stop(t + 0.65)

  // the rails singing as they cool: two close tones beating, long tail
  for (const [freq, gain] of [
    [164, 0.05],
    [168.5, 0.04],
  ] as const) {
    const ring = ctx.createOscillator()
    ring.type = 'triangle'
    ring.frequency.value = freq
    const rg = ctx.createGain()
    rg.gain.setValueAtTime(0.0001, t)
    rg.gain.exponentialRampToValueAtTime(gain, t + 0.06)
    rg.gain.exponentialRampToValueAtTime(0.001, t + 1.6)
    ring.connect(rg).connect(master)
    ring.start(t + 0.03)
    ring.stop(t + 1.7)
  }
}

/** THE NILAK's BELL — one somber toll. Inharmonic partials like real
 *  bronze, long decay, struck once. Kept quiet: the vigil is sacred. */
export function triggerBell(): void {
  if (!engine) return
  const { ctx, master } = engine
  const t = ctx.currentTime
  // strike transient
  const strike = ctx.createBufferSource()
  strike.buffer = makeWhiteNoise(ctx)
  const shp = ctx.createBiquadFilter()
  shp.type = 'bandpass'
  shp.frequency.value = 1400
  shp.Q.value = 1.2
  const sg = ctx.createGain()
  sg.gain.setValueAtTime(0.12, t)
  sg.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
  strike.connect(shp).connect(sg).connect(master)
  strike.start(t)
  strike.stop(t + 0.08)
  // bronze partials: fundamental + minor-third hum + bright edge
  for (const [freq, gain, decay] of [
    [196, 0.22, 7.0],
    [392.5, 0.1, 5.0],
    [540, 0.055, 3.6],
    [1080, 0.03, 1.8],
  ] as const) {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = freq
    const og = ctx.createGain()
    og.gain.setValueAtTime(0.0001, t)
    og.gain.exponentialRampToValueAtTime(gain, t + 0.015)
    og.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    o.connect(og).connect(master)
    o.start(t)
    o.stop(t + decay + 0.1)
  }
}

export function isMuted(): boolean {
  return muted
}

/** THE VIGIL'S QUIET: inside the memorial's sphere the world's audio
 *  bows out — drive, RCS, chatter all duck so the toll and the silence
 *  carry. 0 = normal, 1 = fully inside the sphere. */
let vigilDuck = 0
export function setVigilDuck(d: number): void {
  const clamped = Math.max(0, Math.min(1, d))
  if (Math.abs(clamped - vigilDuck) < 0.01) return
  vigilDuck = clamped
  if (engine && !muted) {
    engine.master.gain.setTargetAtTime(1 - 0.72 * vigilDuck, engine.ctx.currentTime, 0.25)
  }
}

export function toggleMute(): boolean {
  muted = !muted
  localStorage.setItem('stellarlogs-muted', muted ? '1' : '')
  if (engine) {
    engine.master.gain.setTargetAtTime(muted ? 0 : 1 - 0.72 * vigilDuck, engine.ctx.currentTime, 0.05)
  }
  return muted
}
