import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { QUALITY } from '../config/quality'
import { perfFlags } from '../config/perfFlags'
import { PROBES } from '../config/probes'

/**
 * Render fewer pixels when the machine cannot keep up — but only if that
 * actually helps, and never for longer than it helps.
 *
 * WHY IT CHECKS ITSELF. The July audit measured the site as fill-limited and
 * put adaptive resolution first in the plan. Measuring it directly on
 * 2026-08-04 did not agree: at a heavy viewpoint, cutting the backing store
 * from 3600x2025 to 1200x675 — 89% fewer pixels — moved GPU time by about 11%
 * and frame time barely at all. Whatever dominates that view, it is not
 * shading pixels.
 *
 * A controller that lowered resolution anyway would trade sharpness for
 * nothing on exactly the machines that are already struggling for some other
 * reason. So every reduction is treated as an experiment: take one step down,
 * measure again, and if the frames did not actually improve, put the pixels
 * back and stop trying. Machines that are genuinely fill-bound (phones,
 * integrated graphics) keep the benefit; machines bound by anything else keep
 * their sharpness.
 *
 * `dpr` is owned here rather than passed to the Canvas: R3F re-applies that
 * prop from `configure()` on every render, which snapped any runtime change
 * straight back to the tier ceiling.
 *
 * The controller is deliberately dull. It judges by the MEDIAN of a window so
 * a single asset hitch cannot talk it into anything; it calibrates against the
 * display rather than a hardcoded 16.7 ms, by taking the fastest frames in the
 * window as the refresh interval; and it drops fast, recovers slowly, and
 * waits after every change, because a resolution that oscillates is worse than
 * one that is simply too low.
 */

/** frames per judgement window */
const WINDOW = 60
/** frames to wait after a change before judging again */
const COOLDOWN_DOWN = 90
const COOLDOWN_UP = 240
/** median worse than this multiple of the display's own interval = struggling */
const SLOW = 1.35
/** median better than this = comfortable, try giving the pixels back */
const COMFORTABLE = 1.12
const STEP_DOWN = 0.15
const STEP_UP = 0.1
/** a step down must buy at least this much frame time to be worth the blur */
const MUST_IMPROVE = 0.92
/** how long "pixels don't help here" stays believed before re-testing — the
 *  verdict is about a viewpoint, not the machine, and viewpoints change */
const GIVE_UP_MS = 120_000
/** ignore the first moments, where loading noise is not the renderer's fault */
const SETTLE_FRAMES = 120

export function AdaptiveResolution() {
  const setDpr = useThree((s) => s.setDpr)
  const get = useThree((s) => s.get)
  const ceiling = QUALITY.dpr[1]
  const floor = QUALITY.dpr[0]

  const state = useRef({
    times: [] as number[],
    /** -1 until the first frame claims the tier ceiling */
    current: -1,
    cooldown: 0,
    settle: SETTLE_FRAMES,
    /** median before the step down being judged right now, 0 if none */
    trialFrom: 0,
    trialDpr: 0,
    /** timestamp until which "pixels don't help" is believed; 0 = not held */
    pixelsDontHelpUntil: 0,
    /** dev-only: a measurement is holding the ratio, do not judge */
    held: false,
  })

  if (PROBES) {
    // Pins the ratio and parks the controller, so a measurement can compare
    // one pixel count against another without the controller correcting it.
    ;(window as unknown as Record<string, unknown>).__setDpr = (v: number) => {
      state.current.current = v
      state.current.held = true
      setDpr(v)
      const st = get()
      return { storeDpr: st.viewport.dpr, glRatio: st.gl.getPixelRatio() }
    }
    ;(window as unknown as Record<string, unknown>).__releaseDpr = () => {
      state.current.held = false
    }
    // The whole renderer state, so a measurement can reach the scene graph and
    // attribute GPU cost to individual subtrees by hiding them one at a time.
    ;(window as unknown as Record<string, unknown>).__r3f = get
  }

  useFrame((_, dt) => {
    const s = state.current
    const ms = dt * 1000

    if (PROBES && s.held) return

    // The Canvas carries no dpr prop, so claim the tier's ceiling once.
    if (s.current < 0) {
      s.current = ceiling
      setDpr(ceiling)
      return
    }

    if (!perfFlags.adaptiveResolution) {
      if (s.current !== ceiling) {
        s.current = ceiling
        setDpr(ceiling)
      }
      return
    }

    if (s.settle > 0) {
      s.settle--
      return
    }
    if (s.cooldown > 0) {
      s.cooldown--
      return
    }

    // A frame this long is a stall (asset decode, tab wake), not a frame rate.
    if (ms < 400) s.times.push(ms)
    if (s.times.length < WINDOW) return

    const sorted = s.times.slice().sort((a, b) => a - b)
    s.times.length = 0
    const median = sorted[Math.floor(sorted.length / 2)]
    // The fastest frames in the window approximate the display's interval —
    // nothing beats vsync, so the floor of the distribution is the refresh.
    const refresh = Math.min(20, Math.max(6.5, sorted[Math.floor(sorted.length * 0.1)]))

    if (PROBES) {
      ;(window as unknown as Record<string, unknown>).__dpr = {
        dpr: s.current,
        medianMs: +median.toFixed(1),
        refreshMs: +refresh.toFixed(1),
        pixelsDontHelp: performance.now() < s.pixelsDontHelpUntil,
      }
    }

    // Judging a step down taken last window: did it actually buy anything?
    if (s.trialFrom > 0) {
      const helped = median < s.trialFrom * MUST_IMPROVE
      if (!helped) {
        s.current = s.trialDpr
        setDpr(s.trialDpr)
        s.pixelsDontHelpUntil = performance.now() + GIVE_UP_MS
      }
      s.trialFrom = 0
      s.cooldown = COOLDOWN_DOWN
      return
    }

    if (median > refresh * SLOW && s.current > floor && performance.now() > s.pixelsDontHelpUntil) {
      s.trialFrom = median
      s.trialDpr = s.current
      s.current = Math.max(floor, +(s.current - STEP_DOWN).toFixed(2))
      setDpr(s.current)
      s.cooldown = COOLDOWN_DOWN
    } else if (median < refresh * COMFORTABLE && s.current < ceiling) {
      s.current = Math.min(ceiling, +(s.current + STEP_UP).toFixed(2))
      setDpr(s.current)
      s.cooldown = COOLDOWN_UP
    }
  })

  return null
}
