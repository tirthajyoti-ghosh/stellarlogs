import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, CanvasTexture, Mesh, Quaternion, SRGBColorSpace, Vector3 } from 'three'
import { shipRig } from '../state/shipRig'

/** Same plane as the starfield band — keep in sync with Starfield.tsx. */
export const BAND_TILT = new Vector3(0.42, 1, 0.18).normalize()

/**
 * Real nebula photos composited into the backdrop, sitting IN the galactic
 * band (v≈0.5) like the real nebulae already in the star map — distant
 * background features, not objects in the flight lanes. Positions in equirect
 * uv; kept near the equator where distortion is small and away from the u=0
 * seam. All ESA/Hubble, CC BY 4.0.
 */
const SKY_NEBULAE = [
  { image: '/textures/nebula/heic0601a.jpg', u: 0.17, v: 0.45, scale: 0.15, opacity: 0.62 },
  { image: '/textures/nebula/heic1808a.jpg', u: 0.5, v: 0.55, scale: 0.16, opacity: 0.6 },
  { image: '/textures/nebula/heic1608a.jpg', u: 0.79, v: 0.42, scale: 0.12, opacity: 0.55 },
  { image: '/textures/nebula/heic0601a.jpg', u: 0.9, v: 0.53, scale: 0.1, opacity: 0.42 },
]

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** An image faded to transparent at its edges via an elliptical mask. */
function maskedNebula(img: HTMLImageElement, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  ctx.globalCompositeOperation = 'destination-in'
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.scale(1, h / w)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(0.4, 'rgba(0,0,0,0.9)')
  g.addColorStop(0.7, 'rgba(0,0,0,0.4)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(-w / 2, -w / 2, w, w)
  ctx.restore()
  return c
}

/**
 * Composite the NASA star map + Hubble nebulae into one equirect backdrop
 * texture. Additive ('lighter') blending drops the photos' black sky, so only
 * the glowing gas joins the star field.
 */
async function buildSkyTexture(): Promise<CanvasTexture> {
  const W = 4096
  const H = 2048
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const starmap = await loadImage('/textures/starmap_4k.jpg')
  ctx.drawImage(starmap, 0, 0, W, H)

  const imgs = await Promise.all(SKY_NEBULAE.map((n) => loadImage(n.image)))
  ctx.globalCompositeOperation = 'lighter'
  SKY_NEBULAE.forEach((n, i) => {
    const img = imgs[i]
    const w = W * n.scale
    const h = w * (img.height / img.width)
    const masked = maskedNebula(img, Math.round(w), Math.round(h))
    ctx.globalAlpha = n.opacity
    ctx.drawImage(masked, n.u * W - w / 2, n.v * H - h / 2, w, h)
  })
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/**
 * Backdrop sky sphere that follows the ship (unreachable). Real NASA/SVS
 * "Deep Star Maps 2020" (public domain) with Hubble nebulae baked into the
 * galactic band — one draw call.
 */
export function SkyDome() {
  const meshRef = useRef<Mesh>(null)
  const [texture, setTexture] = useState<CanvasTexture | null>(null)
  const quaternion = useMemo(
    () => new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), BAND_TILT),
    [],
  )

  useEffect(() => {
    let disposed = false
    let built: CanvasTexture | null = null
    buildSkyTexture().then((tex) => {
      if (disposed) tex.dispose()
      else {
        built = tex
        setTexture(tex)
      }
    })
    return () => {
      disposed = true
      built?.dispose()
    }
  }, [])

  useFrame(() => {
    meshRef.current?.position.copy(shipRig.position)
  })

  if (!texture) return null

  return (
    <mesh ref={meshRef} quaternion={quaternion} renderOrder={-2}>
      <sphereGeometry args={[24000, 48, 32]} />
      {/* Dimmed so the real sky stays a backdrop, not a spotlight */}
      <meshBasicMaterial map={texture} color="#a6acb8" side={BackSide} depthWrite={false} fog={false} />
    </mesh>
  )
}
