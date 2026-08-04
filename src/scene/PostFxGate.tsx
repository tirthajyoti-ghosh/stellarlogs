import { useEffect, useState, type ReactNode } from 'react'
import { perfFlags } from '../config/perfFlags'

/**
 * Mount gate for the postprocessing chain, polled so `__perf.postfx` can be
 * flipped on a live scene. Exists for measurement (Phase A of the perf plan):
 * unmounting the composer is the only honest way to price it, because
 * renderer.info resets per pass and hides it otherwise.
 */
export function PostFxGate({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(perfFlags.postfx)
  useEffect(() => {
    const id = setInterval(() => setOn(perfFlags.postfx), 300)
    return () => clearInterval(id)
  }, [])
  return on ? <>{children}</> : null
}
