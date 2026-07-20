import { useEffect, useMemo, useState } from 'react'
import { AdditiveBlending, CanvasTexture, Color, SRGBColorSpace, Texture } from 'three'
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

/**
 * Real nebula photo → sprite texture: draw into a canvas and fade the edges
 * out radially so the rectangular frame vanishes against space (the additive
 * sprite then only shows the glowing gas).
 */
function loadNebulaTexture(url: string, onDone: (tex: Texture, aspect: number) => void): void {
  const img = new Image()
  img.onload = () => {
    const w = 512
    const h = Math.round((w * img.height) / img.width)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, w, h)
    ctx.globalCompositeOperation = 'destination-in'
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2)
    g.addColorStop(0, 'rgba(0,0,0,1)')
    g.addColorStop(0.55, 'rgba(0,0,0,0.85)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    const tex = new CanvasTexture(canvas)
    tex.colorSpace = SRGBColorSpace
    onDone(tex, h / w)
  }
  img.src = url
}

interface Cluster {
  center: [number, number, number]
  color: string
  spread: number
  sprites: number
  scale: number
  /** Which Hubble image anchors this cluster */
  image: string
}

/**
 * Localized nebula clusters between the systems, each anchored by a REAL
 * nebula photograph (ESA/Hubble, CC BY 4.0): Orion, Carina, Lagoon.
 */
const CLUSTERS: Cluster[] = [
  { center: [6500, 400, -6200], color: '#5a6ad8', spread: 2200, sprites: 6, scale: 1500, image: '/textures/nebula/heic0601a.jpg' },
  { center: [-8000, -300, 5200], color: '#8a4ac8', spread: 2600, sprites: 7, scale: 1700, image: '/textures/nebula/heic1808a.jpg' },
  { center: [-4500, 500, -12800], color: '#c85a4a', spread: 2000, sprites: 5, scale: 1400, image: '/textures/nebula/heic0707a.jpg' },
  { center: [12500, -200, 3800], color: '#3a8ac8', spread: 2400, sprites: 6, scale: 1600, image: '/textures/nebula/heic0601a.jpg' },
]

interface Anchor {
  texture: Texture
  aspect: number
}

/**
 * Nebulae: one big real-photo sprite per cluster + a handful of soft haze
 * sprites in a matching tint. Additive blending keeps the photos' black sky
 * invisible; overdraw stays low (far fewer sprites than the old blob-only
 * version).
 */
export function Nebulae() {
  const hazeTexture = useMemo(() => makeHazeTexture(), [])
  const [anchors, setAnchors] = useState<Record<string, Anchor>>({})

  useEffect(() => {
    const urls = [...new Set(CLUSTERS.map((c) => c.image))]
    urls.forEach((url) =>
      loadNebulaTexture(url, (texture, aspect) =>
        setAnchors((prev) => ({ ...prev, [url]: { texture, aspect } })),
      ),
    )
  }, [])

  const haze = useMemo(() => {
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
          opacity: 0.04 + rng() * 0.05,
        })
      }
    }
    return list
  }, [])

  return (
    <>
      {CLUSTERS.map((cluster, i) => {
        const anchor = anchors[cluster.image]
        if (!anchor) return null
        return (
          <sprite
            key={`anchor-${i}`}
            position={cluster.center}
            scale={[cluster.scale * 2.4, cluster.scale * 2.4 * anchor.aspect, 1]}
          >
            <spriteMaterial
              map={anchor.texture}
              transparent
              opacity={0.42}
              depthWrite={false}
              blending={AdditiveBlending}
              rotation={i * 1.7}
            />
          </sprite>
        )
      })}
      {haze.map((sprite, i) => (
        <sprite key={i} position={sprite.pos} scale={[sprite.scale, sprite.scale * 0.7, 1]}>
          <spriteMaterial
            map={hazeTexture}
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
