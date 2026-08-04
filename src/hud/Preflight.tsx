import { useEffect, useRef } from 'react'
import { useProgress } from '@react-three/drei'
import { startAudio } from '../audio/engine'
import { IS_TOUCH } from '../config/quality'
import { PROBES } from '../config/probes'

/**
 * PREFLIGHT — the loading screen.
 *
 * The ship boots while it loads. Every line of the checklist is tied to real
 * asset progress, so the sequence finishes when the world is genuinely ready
 * and never a moment before, and IGNITION is what takes you into the world —
 * it doubles as the browser's required gesture for starting audio.
 *
 * Pure DOM and CSS: nothing here downloads, so it is on screen instantly while
 * the ship comes down the wire behind it.
 *
 * WHY THIS FILE WRITES THE DOM BY HAND
 * React renders it once, cold, and then never again: the sequence is driven
 * straight onto the nodes from one animation frame. That is the house rule for
 * anything running per-frame here, and this screen is the case that proved it.
 * Driven through `useState`, the production build queued every update without
 * committing one — the eased value reached 100 while the bar sat at 0.2% and
 * nothing lit. A click flushed the whole backlog at once, which is the tell:
 * React had the updates and was waiting on a discrete event to flush them.
 */

interface Check {
  label: string
  /** fraction of total load progress at which this line commits */
  at: number
  accent?: 'amber' | 'teal'
}

const CHECKS: Check[] = [
  { label: 'REACTOR', at: 0.12, accent: 'amber' },
  { label: 'LIFE SUPPORT', at: 0.3 },
  { label: 'NAV COMPUTER', at: 0.5, accent: 'teal' },
  { label: 'ATTITUDE RCS', at: 0.7 },
  { label: 'EPSTEIN DRIVE', at: 0.92, accent: 'amber' },
]

/** how long to wait for the loader to report anything before assuming a warm
 *  cache and letting the sequence run to completion on its own */
const GRACE_MS = 900

/** How far the bar may run ahead of the loader between milestones, and the
 *  hard ceiling it may never creep past. */
const CREEP_SPAN = 18
const CREEP_CAP = 93

/** Release conditions. The loading manager also tracks the remote billboard
 *  images, which are content for systems light-minutes away and routinely
 *  outlive the ship's own assets — measured parked at 99% for 48 s waiting on
 *  i.ibb.co. Nobody should be held out of their own cockpit for that, so the
 *  sequence also finishes if the reported figure stops moving near the end,
 *  or if the whole thing simply takes too long. */
const STALL_MS = 6000
const MAX_WAIT_MS = 25000

/**
 * Dev-only: `?boot=0.42` pins the sequence at a fixed progress so any stage of
 * it can be looked at and screenshotted without racing the loader.
 */
const BOOT_PARAM = PROBES ? new URLSearchParams(window.location.search).get('boot') : null
// `get` returns null when the parameter is absent and Number(null) is 0, which
// is finite — reading it straight pins every ordinary dev run at 0%.
const BOOT_PIN = BOOT_PARAM ? Number(BOOT_PARAM) : NaN

export function Preflight() {
  const { progress, active } = useProgress()
  const root = useRef<HTMLDivElement>(null)
  const live = useRef({ progress, active })
  /** shared by the button and the key handler so they cannot disagree */
  const state = useRef({ ready: false, leaving: false })

  useEffect(() => {
    live.current = { progress, active }
  }, [progress, active])

  useEffect(() => {
    const el = root.current
    if (!el) return
    const q = <T extends Element>(sel: string) => el.querySelector(sel) as T | null
    const qa = <T extends Element>(sel: string) => Array.from(el.querySelectorAll(sel)) as T[]

    const bar = q<HTMLElement>('.pf-progress-track i')
    const pctLabel = q<HTMLElement>('.pf-progress-label b')
    const phase = q<HTMLElement>('.pf-progress-label span')
    const checks = qa<HTMLElement>('.pf-check')
    const note = q<HTMLElement>('.pf-ignition-note')
    const button = q<HTMLButtonElement>('.pf-ignition')

    /** only touch a node when the value it shows actually changed */
    const text = (node: HTMLElement | null, v: string) => {
      if (node && node.textContent !== v) node.textContent = v
    }

    let shownReady = -1
    const draw = (pct: number, ready: boolean) => {
      const r = pct / 100
      const w = `${pct.toFixed(2)}%`
      if (bar && bar.style.width !== w) bar.style.width = w
      text(pctLabel, `${Math.round(pct)}%`)
      text(phase, ready ? 'READY' : 'BRINGING SYSTEMS UP')

      checks.forEach((li, i) => {
        const c = CHECKS[i]
        const state = r >= c.at ? 'is-ok' : r >= c.at - 0.085 ? 'is-busy' : 'is-idle'
        if (!li.classList.contains(state)) {
          li.classList.remove('is-ok', 'is-busy', 'is-idle')
          li.classList.add(state)
          text(
            li.querySelector('.pf-check-state'),
            state === 'is-ok' ? 'OK' : state === 'is-busy' ? '· · ·' : '—',
          )
        }
      })

      if (shownReady !== (ready ? 1 : 0)) {
        shownReady = ready ? 1 : 0
        text(
          note,
          ready ? (IS_TOUCH ? 'TAP TO FLY' : 'PRESS · OR HIT SPACE') : 'LOCKED · SYSTEMS COLD',
        )
        // NOT the `disabled` property: React rendered this button once, so its
        // fiber still carries `disabled: true`, and the synthetic event system
        // refuses to dispatch onClick for a button it believes is disabled —
        // the native click fires and nothing happens. aria-disabled says the
        // same thing to assistive tech without gating the handler.
        button?.setAttribute('aria-disabled', String(!ready))
        el.classList.toggle('is-ready', ready)
      }
    }

    // A beat of black before the console comes up, so it reads as waking.
    const lights = setTimeout(() => el.classList.add('is-powered'), 200)

    let raf = 0
    let eased = 0
    let started = false
    let startedAt = 0
    let lastP = -1
    let lastChange = performance.now()
    const t0 = performance.now()

    // Loader progress arrives in lumps as each file lands and a bar that
    // teleports feels broken, so this eases toward the real value. Four things
    // it has to get right:
    //   · never run backwards — drei reports a fresh 0% when a new batch
    //     starts, and a bar that falls back reads as a fault;
    //   · never finish before loading has begun — at mount nothing is in
    //     flight yet, so `active` is false and reading it naively means "done";
    //   · still finish if nothing ever loads, which is what a warm cache looks
    //     like, so a returning visitor is not stranded at 8%;
    //   · never stall. drei counts ITEMS, not bytes, and this scene pulls them
    //     roughly one at a time, so the reported figure sits still for seconds
    //     together — measured at 1 of 12 items after 9 s. Between milestones
    //     the bar creeps on its own, bounded so it can neither overtake the
    //     real figure by much nor reach the last check, which still needs the
    //     loader to genuinely get there.
    const tick = () => {
      const { progress: p, active: a } = live.current
      const now = performance.now()
      if ((a || p > 0) && !started) {
        started = true
        startedAt = now
      }
      if (p !== lastP) {
        lastP = p
        lastChange = now
      }
      const stalled = started && now - lastChange > STALL_MS && eased >= 90
      const timedOut = started && now - startedAt > MAX_WAIT_MS
      const waited = now - t0
      const target = Number.isFinite(BOOT_PIN)
        ? BOOT_PIN * 100
        : !started && waited < GRACE_MS
          ? (waited / GRACE_MS) * 8
          : !a || p >= 100 || stalled || timedOut
            ? 100
            : Math.min(p, 99)

      const d = target - eased
      if (d > 0.05) eased += d * 0.08
      else if (d > 0) eased = target
      else if (target < 100 && !Number.isFinite(BOOT_PIN)) {
        const ceil = Math.min(target + CREEP_SPAN, CREEP_CAP)
        if (eased < ceil) eased += (ceil - eased) * 0.004
      }

      if (eased >= 99.6) {
        eased = 100
        state.current.ready = true
      }
      draw(eased, state.current.ready)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      clearTimeout(lights)
      cancelAnimationFrame(raf)
    }
  }, [])

  const ignite = () => {
    const el = root.current
    if (!el || !state.current.ready || state.current.leaving) return
    state.current.leaving = true
    startAudio()
    // The boot sequence has already introduced the ship, the pilot and the
    // controls, so the first-visit card must not stack on top of it.
    try {
      localStorage.setItem('stellarlogs-visited', '1')
    } catch {
      /* private mode — the card showing once is harmless */
    }
    // Flight controls ignore any key whose target sits inside `[data-ui]`, and
    // clicking the button leaves it focused — without this, pressing IGNITION
    // with the mouse and then reaching for W does nothing at all.
    ;(document.activeElement as HTMLElement | null)?.blur()
    el.classList.add('is-leaving')
    setTimeout(() => {
      el.style.display = 'none'
    }, 1250)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return
      if (!state.current.ready || state.current.leaving) return
      e.preventDefault()
      ignite()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Rendered once, cold: this is the ship before anyone has touched it. The
  // animation frame above takes it from here.
  return (
    <div id="preflight-root" className="pf" ref={root} data-ui>
      <div className="pf-stars" />
      <div className="pf-dust" />

      <div className="pf-panel">
        <header className="pf-head">ROCINANTE-CLASS · BLT-1129</header>

        <ul className="pf-checks">
          {CHECKS.map((c) => (
            <li key={c.label} className="pf-check is-idle" data-accent={c.accent ?? ''}>
              <span>{c.label}</span>
              <span className="pf-check-state">—</span>
            </li>
          ))}
        </ul>

        <div className="pf-progress">
          <div className="pf-progress-track">
            <i style={{ width: '0%' }} />
          </div>
          <div className="pf-progress-label">
            <span>BRINGING SYSTEMS UP</span>
            <b>0%</b>
          </div>
        </div>

        <button className="pf-ignition" onClick={ignite} aria-disabled="true">
          <span className="pf-ignition-key">
            <b>IGNITION</b>
          </span>
          <span className="pf-ignition-note">SYSTEMS COLD</span>
        </button>

        <div className="pf-controls">
          {IS_TOUCH ? (
            <span><b>STICK</b> steer · <b>BURN</b> thrust</span>
          ) : (
            <span><b>W</b> burn · <b>A/D</b> turn · <b>N</b> jump</span>
          )}
        </div>

        <footer className="pf-pilot">TIRTHAJYOTI GHOSH · SENIOR AI ENGINEER</footer>
      </div>

      <div className="pf-vignette" />
      <div className="pf-flash" />
    </div>
  )
}
