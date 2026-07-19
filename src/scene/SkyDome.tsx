import { useMemo } from 'react'
import { BackSide, CanvasTexture, Quaternion, SRGBColorSpace, Vector3 } from 'three'

/** Same plane as the starfield band — keep in sync with Starfield.tsx. */
export const BAND_TILT = new Vector3(0.42, 1, 0.18).normalize()

const BLOB_COLORS = [
  'rgba(90, 110, 200,',
  'rgba(130, 90, 190,',
  'rgba(180, 100, 80,',
  'rgba(70, 130, 190,',
  'rgba(110, 85, 200,',
  'rgba(170, 130, 70,',
]

function paintSky(): CanvasTexture {
  const w = 2048
  const h = 1024
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // Deep space vertical gradient
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#040a18')
  bg.addColorStop(0.5, '#060e22')
  bg.addColorStop(1, '#030814')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // Milky-way band along the equator (v = 0.5) with wandering offset
  const bandY = (x: number) => h * 0.5 + Math.sin((x / w) * Math.PI * 2) * h * 0.04

  // Broad glow of the band
  for (let x = 0; x < w; x += 8) {
    const y = bandY(x)
    const g = ctx.createLinearGradient(0, y - 190, 0, y + 190)
    g.addColorStop(0, 'rgba(120, 140, 190, 0)')
    g.addColorStop(0.5, 'rgba(140, 160, 210, 0.085)')
    g.addColorStop(1, 'rgba(120, 140, 190, 0)')
    ctx.fillStyle = g
    ctx.fillRect(x, y - 190, 8, 380)
  }

  // Colored nebula blobs hugging the band
  let rngState = 12345
  const rng = () => {
    rngState = (rngState * 1103515245 + 12345) & 0x7fffffff
    return rngState / 0x7fffffff
  }
  for (let i = 0; i < 90; i++) {
    const x = rng() * w
    const y = bandY(x) + (rng() - 0.5) * 260
    const r = 50 + rng() * 190
    const color = BLOB_COLORS[Math.floor(rng() * BLOB_COLORS.length)]
    const alpha = 0.03 + rng() * 0.06
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `${color} ${alpha})`)
    g.addColorStop(1, `${color} 0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    // wrap horizontally so the seam is invisible
    if (x < r) {
      const g2 = ctx.createRadialGradient(x + w, y, 0, x + w, y, r)
      g2.addColorStop(0, `${color} ${alpha})`)
      g2.addColorStop(1, `${color} 0)`)
      ctx.fillStyle = g2
      ctx.beginPath()
      ctx.arc(x + w, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Dark dust lanes cutting the band
  for (let i = 0; i < 26; i++) {
    const x = rng() * w
    const y = bandY(x) + (rng() - 0.5) * 90
    const r = 40 + rng() * 130
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const alpha = 0.05 + rng() * 0.08
    g.addColorStop(0, `rgba(2, 5, 12, ${alpha})`)
    g.addColorStop(1, 'rgba(2, 5, 12, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r * 1.6, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

/**
 * Baked equirect sky: deep-space gradient, milky-way band, nebula tints and
 * dust lanes. One draw call — replaces per-sprite haze overdraw.
 */
export function SkyDome() {
  const texture = useMemo(() => paintSky(), [])
  const quaternion = useMemo(
    () => new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), BAND_TILT),
    [],
  )

  return (
    <mesh quaternion={quaternion} renderOrder={-2}>
      <sphereGeometry args={[24000, 48, 32]} />
      <meshBasicMaterial map={texture} side={BackSide} depthWrite={false} fog={false} />
    </mesh>
  )
}
