import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import type { Object3D } from 'three'

/**
 * Compile a subtree's shader programs before anything tries to draw it.
 *
 * WHY THIS EXISTS — measured, 2026-08-04. Flying up to a planet froze the
 * whole game for the better part of a second. A CPU profile of the hitch,
 * sampled at 50 µs across the approach:
 *
 *     500 ms  (program)              ← driver linking new GL programs
 *      68 ms  getProgramInfoLog      ← three asking, which forces the wait
 *     190 ms  updateMatrixWorld      ← the whole board subtree, in one frame
 *      48 ms  projectObject
 *
 * Worst single frame: 728 ms. Texture upload was ~0 ms and troika builds its
 * SDF atlases in a worker, so neither of the obvious suspects was the cause —
 * it was the GPU driver compiling ~11 programs the first time a board was
 * drawn, and the scene graph absorbing a large subtree all at once.
 *
 * `compileAsync` hands that work to the driver through
 * `KHR_parallel_shader_compile` and resolves when the programs are ready, so
 * the linking happens off the critical path instead of inside the frame that
 * first shows a board. Callers hold the reveal until this returns true.
 *
 * The other half of the fix belongs to the caller: mount the subtree a few
 * children at a time so `updateMatrixWorld` is not handed everything at once.
 */
export function useShaderWarmup(target: RefObject<Object3D | null>, active: boolean): boolean {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const [warm, setWarm] = useState(false)

  useEffect(() => {
    if (!active || warm) return
    let cancelled = false
    // One frame of slack so the subtree is mounted and its matrices exist —
    // compiling an object that has not been placed yet compiles nothing.
    const raf = requestAnimationFrame(() => {
      const object = target.current
      if (!object || cancelled) return
      object.updateMatrixWorld(true)
      // (object, camera, targetScene): three traverses the FIRST argument to
      // find materials — with plain `traverse`, so an invisible subtree still
      // compiles — and reads the light setup from the third. That order is
      // what lets the boards be warmed while they are still hidden.
      gl.compileAsync(object, camera, scene)
        .then(() => {
          if (!cancelled) setWarm(true)
        })
        .catch(() => {
          // A failed warmup must never strand the boards — show them anyway
          // and take the hitch, which is what happened before this existed.
          if (!cancelled) setWarm(true)
        })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [active, warm, gl, scene, camera, target])

  return warm
}
