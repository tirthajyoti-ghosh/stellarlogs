import { useMemo } from 'react'
import { AdditiveBlending, CanvasTexture, Color } from 'three'
import { QUALITY } from '../config/quality'

function makeHazeTexture(): CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.4)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.14)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new CanvasTexture(canvas)
}

interface Cluster {
  center: [number, number, number]
  color: string
  spread: number
  sprites: number
  scale: number
}

/** Localized nebula clusters drifting between the systems. */
const CLUSTERS: Cluster[] = [
  { center: [6500, 400, -6200], color: '#5a6ad8', spread: 2200, sprites: 16, scale: 1500 },
  { center: [-8000, -300, 5200], color: '#8a4ac8', spread: 2600, sprites: 18, scale: 1700 },
  { center: [-4500, 500, -12800], color: '#c85a4a', spread: 2000, sprites: 14, scale: 1400 },
  { center: [12500, -200, 3800], color: '#3a8ac8', spread: 2400, sprites: 16, scale: 1600 },
]

/**
 * Cheap "volumetric" nebulae: clustered additive haze sprites, placed away
 * from flight lanes so overdraw stays small on screen.
 */
export function Nebulae() {
  const texture = useMemo(() => makeHazeTexture(), [])

  const sprites = useMemo(() => {
    let s = 424242
    const rng = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      return s / 0x7fffffff
    }
    const list: { pos: [number, number, number]; scale: number; color: Color; opacity: number }[] = []
    const density = QUALITY.tier === 'low' ? 0.5 : 1
    for (const cluster of CLUSTERS) {
      const count = Math.round(cluster.sprites * density)
      for (let i = 0; i < count; i++) {
        const base = new Color(cluster.color)
        base.offsetHSL((rng() - 0.5) * 0.08, 0, (rng() - 0.5) * 0.1)
        list.push({
          pos: [
            cluster.center[0] + (rng() - 0.5) * cluster.spread,
            cluster.center[1] + (rng() - 0.5) * cluster.spread * 0.45,
            cluster.center[2] + (rng() - 0.5) * cluster.spread,
          ],
          scale: cluster.scale * (0.6 + rng() * 0.9),
          color: base,
          opacity: 0.05 + rng() * 0.06,
        })
      }
    }
    return list
  }, [])

  return (
    <>
      {sprites.map((sprite, i) => (
        <sprite key={i} position={sprite.pos} scale={[sprite.scale, sprite.scale * 0.7, 1]}>
          <spriteMaterial
            map={texture}
            color={sprite.color}
            transparent
            opacity={sprite.opacity}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </sprite>
      ))}
    </>
  )
}
