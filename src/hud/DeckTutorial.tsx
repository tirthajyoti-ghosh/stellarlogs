import { useEffect, useState } from 'react'
import { IS_TOUCH } from '../config/quality'
import { bbEvent } from '../systems/blackbox'

const KEY = 'stellarlogs-deck-tutorial'

/**
 * FIRST FLIGHT (docs/the-mobile-controls.md P5: every researched title
 * ships a 60-second tutorial). Touch only, once ever: four tap-through
 * cards, each pointing at one control. The last line is the one no
 * other game gets to say.
 */
const STEPS = [
  { at: 'stick', line: 'STEER — DRAG ANYWHERE ON THE LEFT' },
  { at: 'throttle', line: 'SET THE DRIVE — IT STAYS SET' },
  { at: 'chart', line: 'THE CHART — TAP TO JUMP SYSTEMS' },
  { at: 'center', line: 'YOUR GUNS AIM THEMSELVES. FLY.' },
] as const

export function DeckTutorial() {
  const [step, setStep] = useState(() =>
    IS_TOUCH && !localStorage.getItem(KEY) ? 0 : -1,
  )
  // wait for the preflight to clear before speaking
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (step < 0) return
    const id = setInterval(() => {
      // the preflight hides itself with display:none rather than
      // unmounting — test visibility, not existence
      const pf = document.getElementById('preflight-root')
      if (!pf || pf.style.display === 'none') {
        setArmed(true)
        clearInterval(id)
      }
    }, 500)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (step < 0 || step >= STEPS.length || !armed) return null

  const done = (skipped: boolean) => {
    localStorage.setItem(KEY, '1')
    bbEvent(skipped ? 'tutorial-skip' : 'tutorial-done', { step })
    setStep(-1)
  }
  const advance = () => {
    bbEvent('tutorial-step', { step })
    if (step + 1 >= STEPS.length) done(false)
    else setStep(step + 1)
  }

  return (
    <div className="hud-tut" data-ui onClick={advance}>
      <div className={`hud-tut-ring hud-tut-at-${STEPS[step].at}`} />
      <div className={`hud-tut-line hud-tut-line-${STEPS[step].at}`}>{STEPS[step].line}</div>
      <div className="hud-tut-tap">TAP TO CONTINUE</div>
      <button
        className="hud-tut-skip"
        onClick={(e) => {
          e.stopPropagation()
          done(true)
        }}
      >
        SKIP
      </button>
    </div>
  )
}
