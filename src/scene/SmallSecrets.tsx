import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Box3, Color, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three'
import { registerHudLabel } from '../hud/hudState'
import { ALL_SYSTEMS } from '../config/systems'

/**
 * SMALL SECRETS (docs/the-neighborhood.md — one quiet find per place).
 * Nothing to play; everything to notice.
 *
 * - THE BLT-0925: a burned-out Rocinante-class half-lost on the Track's
 *   far bend — a racer who dared the wells too deep. Your own hull's
 *   silhouette, dead. (Borrowed body: tachi.glb, darkened.)
 * - SURVEY PROBE 7: a dead probe drifting at the edge of Projects,
 *   antenna still pointed at unsurveyed space. The first charts came
 *   from somewhere. (Borrowed body: buoy.glb, dark trim.)
 */

const TACHI_URL = '/models/tachi.glb'
const BUOY_URL = '/models/buoy.glb'

const RACER_LIVERY = new Color('#7a8a80')

function darken(root: Object3D, tint: number, livery?: Color): void {
  root.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    const mats = Array.isArray(m.material) ? m.material : [m.material]
    m.material = mats.map((src) => {
      const std = src as MeshStandardMaterial
      const clone = std.clone()
      if (clone.color) {
        if (livery) clone.color.lerp(livery, 0.55) // another club's boat
        clone.color.multiplyScalar(tint)
      }
      if ('emissive' in clone && clone.emissive) clone.emissive.setScalar(0)
      if ('emissiveIntensity' in clone) clone.emissiveIntensity = 0
      clone.roughness = Math.min(1, (clone.roughness ?? 0.8) + 0.25)
      return clone
    })[0] as MeshStandardMaterial
  })
}

export function SmallSecrets() {
  const tachi = useGLTF(TACHI_URL)
  const buoy = useGLTF(BUOY_URL)

  const track = ALL_SYSTEMS.find((s) => s.id === 'track')
  const projects = ALL_SYSTEMS.find((s) => s.id === 'projects')

  const racerPos = useMemo(
    () =>
      track
        ? new Vector3(track.position[0] - 3600, track.position[1] - 420, track.position[2] + 2400)
        : new Vector3(),
    [track],
  )
  const probePos = useMemo(
    () =>
      projects
        ? new Vector3(projects.position[0] - 2100, projects.position[1] + 640, projects.position[2] - 1500)
        : new Vector3(),
    [projects],
  )

  const racer = useMemo(() => {
    const r = tachi.scene.clone(true)
    r.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(r)
    const size = bounds.getSize(new Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    if (maxDim > 0) r.scale.setScalar(6.5 / maxDim)
    darken(r, 0.45, RACER_LIVERY)
    return r
  }, [tachi])

  const probe = useMemo(() => {
    const p = buoy.scene.clone(true)
    p.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(p)
    const size = bounds.getSize(new Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    if (maxDim > 0) p.scale.setScalar(8 / maxDim)
    darken(p, 0.45)
    return p
  }, [buoy])

  useEffect(() => {
    if (!track || !projects) return
    const offs = [
      registerHudLabel({
        id: 'poi-blt0925',
        name: 'BLT-0925',
        color: '#7d8a99',
        kind: 'poi',
        position: racerPos,
        yOffset: 16,
        el: null,
        detail: 'SHE DARED THE WELLS TOO DEEP',
        jumpStandoff: 260,
      }),
      registerHudLabel({
        id: 'poi-probe7',
        name: 'SURVEY PROBE 7',
        color: '#7d8a99',
        kind: 'poi',
        position: probePos,
        yOffset: 16,
        el: null,
        detail: 'DEAD SINCE THE FIRST CHARTS',
        jumpStandoff: 260,
      }),
    ]
    return () => offs.forEach((off) => off())
  }, [track, projects, racerPos, probePos])

  if (!track || !projects) return null

  return (
    <group>
      {/* the racer: nose-down, rolled, going nowhere ever again */}
      <group
        position={[racerPos.x, racerPos.y, racerPos.z]}
        rotation={[0.6, 2.3, 2.55]}
      >
        <primitive object={racer} />
      </group>
      {/* the probe: tumbled slightly, antenna to the dark */}
      <group position={[probePos.x, probePos.y, probePos.z]} rotation={[0.4, 0.9, 0.25]}>
        <primitive object={probe} />
      </group>
    </group>
  )
}

useGLTF.preload(TACHI_URL)
useGLTF.preload(BUOY_URL)
