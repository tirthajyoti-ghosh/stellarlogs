import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { FrontSide, DoubleSide, Mesh, Material } from 'three'
import { perfFlags } from '../config/perfFlags'

/**
 * Turn backface culling back on for hulls that never needed it off.
 *
 * MEASURED, 2026-08-04 (probe build, production bundle). Sitting inside the
 * Projects system, flipping the player ship's 36 materials from DoubleSide to
 * FrontSide took the median frame from 38.1 ms to 20.5 ms — **17.6 ms, and
 * nearly half the frame**, from one flag on one model.
 *
 * Nothing in this repo asked for that. Sketchfab exports routinely carry
 * `doubleSided: true` in their glTF materials, and three honours it, so every
 * triangle of every downloaded hull is rasterised twice and cannot be rejected
 * early by depth. On a solid hull the back faces are inside the ship and were
 * never visible — the cost bought nothing at all.
 *
 * The pass runs over the whole scene rather than at sixteen `useGLTF` call
 * sites, every 15th frame. It used to watch `gl.info.memory.geometries` as a
 * dirty signal, and that signal had two flaws found on review:
 *
 *   · it only ticks AFTER a new mesh's first draw, so every new hull compiled
 *     its shader double-sided, then was flipped, then compiled AGAIN — two
 *     compiles per material, the second landing mid-flight when traffic
 *     spawns, which is exactly where a hitch is least welcome;
 *   · a cloned mesh shares geometry, so a spawned ship that clones its hull
 *     ticks nothing at all and cloned-then-replaced materials slip through.
 *
 * The unconditional sweep costs ~0.1 ms every 15 frames (~7 µs/frame
 * amortised) and cannot be fooled. And when it catches a material BEFORE its
 * first draw, it skips `needsUpdate` entirely: an uncompiled material picks
 * the new side up in its first compile, free — the recompile only happens for
 * materials that genuinely were drawn double-sided already.
 *
 * TWO MATERIALS ARE DELIBERATELY DOUBLE-SIDED and opt out with
 * `userData.keepDoubleSide`: the planet atmosphere shell, and the open cone
 * that makes a billboard's station-keeping jet. Both are hollow surfaces seen
 * from inside, and both look wrong single-sided.
 */
const SWEEP_EVERY = 15

export function HardenMaterials() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const state = useRef({ frame: 0, hardened: 0 })

  useFrame(() => {
    if (!perfFlags.hardenMaterials) return
    if (state.current.frame++ % SWEEP_EVERY !== 0) return

    // renderer.properties knows whether a material has ever been compiled.
    // Not public API, so probe defensively: if the shape ever changes, the
    // fallback is needsUpdate=true, which is merely the old behaviour.
    const properties = (
      gl as unknown as { properties?: { get(m: Material): { currentProgram?: unknown } } }
    ).properties

    scene.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      const materials: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) {
        if (!material || material.side !== DoubleSide) continue
        if (material.userData?.keepDoubleSide) continue
        // A transparent surface is often a shell meant to be seen from inside;
        // leave those alone and take the win on the solid geometry.
        if (material.transparent) continue
        material.side = FrontSide
        const compiled = properties ? !!properties.get(material)?.currentProgram : true
        if (compiled) material.needsUpdate = true
        state.current.hardened++
      }
    })
  })

  return null
}
