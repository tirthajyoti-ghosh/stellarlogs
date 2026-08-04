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
 * sites, and re-runs whenever the geometry count changes, which is how a newly
 * arrived model announces itself. Changing `side` flips a shader define, so
 * each material recompiles once, the first time it is seen — that is why this
 * waits for the boards' own shader warmup rather than racing it.
 *
 * TWO MATERIALS ARE DELIBERATELY DOUBLE-SIDED and opt out with
 * `userData.keepDoubleSide`: the planet atmosphere shell, and the open cone
 * that makes a billboard's station-keeping jet. Both are hollow surfaces seen
 * from inside, and both look wrong single-sided.
 */
export function HardenMaterials() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const seen = useRef({ geometries: -1, hardened: 0 })

  useFrame(() => {
    if (!perfFlags.hardenMaterials) return
    // A change in the geometry count means a model arrived (or left); that is
    // the only moment this can have new work to do.
    const count = gl.info.memory.geometries
    if (count === seen.current.geometries) return
    seen.current.geometries = count

    let hardened = 0
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
        material.needsUpdate = true
        hardened++
      }
    })
    seen.current.hardened += hardened
  })

  return null
}
