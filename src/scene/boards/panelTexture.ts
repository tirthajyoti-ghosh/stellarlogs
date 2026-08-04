import { CanvasTexture, RepeatWrapping, SRGBColorSpace, Texture } from 'three'

/**
 * The boards' surfaces, generated once at startup and shared by every board
 * in the world. Nothing here is downloaded.
 *
 * The plate is built the way real texture sets are: a HEIGHT FIELD first —
 * plate cells, weld seams, rivet heads, dents, brushing — and then both maps
 * are derived from it. The albedo paints what the surface is made of; the
 * normal map (finite differences over the same height field) tells the panel
 * shader how the surface leans, which is what lets lamp light graze it: rivets
 * catch, seams shadow, dents pool. A flat colour cannot do any of that, which
 * is why the boards read as "shiny rectangles" before.
 *
 * Everything is deterministic (seeded), so every visitor sees the same metal.
 */

const S = 512

let plateMaps: { map: Texture; normalMap: Texture } | null = null
let metalMap: Texture | null = null

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, ctx: c.getContext('2d')! }
}

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

/** The shared plate: albedo + normal map derived from one height field. */
export function getPlateMaps(): { map: Texture; normalMap: Texture } {
  if (plateMaps) return plateMaps
  const r = rng(1129)

  // ---- 1. the height field ------------------------------------------------
  const height = new Float32Array(S * S)
  const at = (x: number, y: number) => ((y + S) % S) * S + ((x + S) % S)

  // plate cells: two rows, three columns, seams jittered so they read as
  // hand-fitted plates rather than a printed grid
  const vSeams = [0, 168 + (r() - 0.5) * 22, 348 + (r() - 0.5) * 22].map(Math.round)
  const hSeams = [0, 250 + (r() - 0.5) * 30].map(Math.round)

  const groove = (x: number, y: number, d: number) => {
    height[at(x, y)] -= d
  }
  for (const sx of vSeams) {
    for (let y = 0; y < S; y++) {
      const wobble = Math.round(Math.sin(y * 0.02 + sx) * 1.5)
      groove(sx + wobble, y, 1.0)
      groove(sx + wobble + 1, y, 1.0)
      groove(sx + wobble - 1, y, 0.35)
      groove(sx + wobble + 2, y, 0.35)
    }
  }
  for (const sy of hSeams) {
    for (let x = 0; x < S; x++) {
      const wobble = Math.round(Math.sin(x * 0.02 + sy) * 1.5)
      groove(x, sy + wobble, 1.0)
      groove(x, sy + wobble + 1, 1.0)
      groove(x, sy + wobble - 1, 0.35)
      groove(x, sy + wobble + 2, 0.35)
    }
  }

  // rivet heads along every seam — the detail that catches grazing light
  const rivets: [number, number][] = []
  const rivet = (cx: number, cy: number) => {
    rivets.push([cx, cy])
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.hypot(dx, dy)
        if (d < 3.6) height[at(cx + dx, cy + dy)] += 0.95 * (1 - (d / 3.6) ** 2)
      }
  }
  for (const sx of vSeams) for (let y = 14; y < S; y += 30 + Math.floor(r() * 8)) rivet(sx + 7, y)
  for (const sy of hSeams) for (let x = 20; x < S; x += 34 + Math.floor(r() * 8)) rivet(x, sy + 7)

  // mill brushing: faint horizontal striations
  for (let y = 0; y < S; y++) {
    const amp = 0.02 + r() * 0.05
    let v = 0
    for (let x = 0; x < S; x++) {
      v = v * 0.9 + (r() - 0.5) * 0.2
      height[at(x, y)] += v * amp
    }
  }

  // dents and dings from a working port
  for (let i = 0; i < 16; i++) {
    const cx = Math.floor(r() * S)
    const cy = Math.floor(r() * S)
    const rad = 8 + r() * 18
    const depth = 0.2 + r() * 0.35
    for (let dy = -rad; dy <= rad; dy++)
      for (let dx = -rad; dx <= rad; dx++) {
        const d = Math.hypot(dx, dy) / rad
        if (d < 1) height[at(Math.round(cx + dx), Math.round(cy + dy))] -= depth * (1 - d * d) ** 2
      }
  }

  // ---- 2. albedo, painted over the same features --------------------------
  const { c: ac, ctx } = canvas(S, S)
  ctx.fillStyle = '#37434f' // mid-tone painted steel: light needs range to show
  ctx.fillRect(0, 0, S, S)

  // per-plate tint variation + the odd repainted patch
  const cells: [number, number, number, number][] = []
  const vs = [...vSeams, S]
  const hs = [...hSeams, S]
  for (let i = 0; i < vs.length - 1; i++)
    for (let j = 0; j < hs.length - 1; j++) cells.push([vs[i], hs[j], vs[i + 1] - vs[i], hs[j + 1] - hs[j]])
  for (const [x, y, w, h] of cells) {
    const t = (r() - 0.5) * 26
    ctx.fillStyle = `rgba(${55 + t},${67 + t},${79 + t},0.5)`
    ctx.fillRect(x, y, w, h)
  }
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = `rgba(${40 + r() * 30},${52 + r() * 30},${64 + r() * 30},0.3)`
    ctx.fillRect(r() * S, r() * S, 40 + r() * 90, 30 + r() * 70)
  }

  // brushing marks, seam paint, rivet paint
  for (let i = 0; i < 700; i++) {
    const y = r() * S
    const x0 = r() * S
    ctx.strokeStyle = `rgba(${r() > 0.5 ? '190,205,220' : '10,16,24'},${0.02 + r() * 0.04})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x0, y)
    ctx.lineTo(x0 + 30 + r() * 160, y + (r() - 0.5) * 2)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(8,12,18,0.5)'
  ctx.lineWidth = 2
  for (const sx of vSeams) {
    ctx.beginPath()
    ctx.moveTo(sx, 0)
    ctx.lineTo(sx, S)
    ctx.stroke()
  }
  for (const sy of hSeams) {
    ctx.beginPath()
    ctx.moveTo(0, sy)
    ctx.lineTo(S, sy)
    ctx.stroke()
  }
  for (const [cx, cy] of rivets) {
    ctx.fillStyle = 'rgba(16,22,30,0.55)'
    ctx.beginPath()
    ctx.arc(cx, cy, 2.4, 0, Math.PI * 2)
    ctx.fill()
  }

  // rust: streaks bleeding DOWN from rivets (gravity is a habit the plates
  // kept from the yard), plus patches creeping in from the plate edges
  for (const [cx, cy] of rivets) {
    if (r() > 0.34) continue
    const len = 16 + r() * 70
    const wdt = 1.5 + r() * 2.5
    const g = ctx.createLinearGradient(0, cy, 0, cy + len)
    g.addColorStop(0, `rgba(122,66,34,${0.25 + r() * 0.2})`)
    g.addColorStop(1, 'rgba(122,66,34,0)')
    ctx.fillStyle = g
    ctx.fillRect(cx - wdt / 2 + (r() - 0.5) * 2, cy, wdt, len)
  }
  for (let i = 0; i < 26; i++) {
    const x = r() * S
    const y = r() * S
    const edge = Math.min(x, y, S - x, S - y) / (S / 2)
    const rad = 12 + r() * 40
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
    g.addColorStop(0, `rgba(${r() > 0.5 ? '110,62,36' : '20,26,34'},${(0.1 + r() * 0.14) * (1.25 - edge)})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, rad, 0, Math.PI * 2)
    ctx.fill()
  }

  // ---- 3. normal map from the height field --------------------------------
  const { c: nc, ctx: nctx } = canvas(S, S)
  const img = nctx.createImageData(S, S)
  const STRENGTH = 1.7
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (height[at(x - 1, y)] - height[at(x + 1, y)]) * STRENGTH
      // canvas y runs down but the texture is flipped at upload, so the two
      // inversions cancel: bumps read as bumps, not dents
      const dy = (height[at(x, y - 1)] - height[at(x, y + 1)]) * STRENGTH
      const inv = 1 / Math.hypot(dx, dy, 1)
      const o = (y * S + x) * 4
      img.data[o] = (dx * inv * 0.5 + 0.5) * 255
      img.data[o + 1] = (dy * inv * 0.5 + 0.5) * 255
      img.data[o + 2] = (inv * 0.5 + 0.5) * 255
      img.data[o + 3] = 255
    }
  }
  nctx.putImageData(img, 0, 0)

  const map = new CanvasTexture(ac)
  map.colorSpace = SRGBColorSpace
  map.wrapS = map.wrapT = RepeatWrapping
  map.anisotropy = 8 // boards are read at grazing angles; keep the plate crisp
  const normalMap = new CanvasTexture(nc)
  normalMap.wrapS = normalMap.wrapT = RepeatWrapping
  normalMap.anisotropy = 8
  plateMaps = { map, normalMap }
  return plateMaps
}

let glowDot: Texture | null = null

/** Soft radial glare for the lamp faces — the "there is a burning bulb there"
 *  cue when the head itself is tilted away from the viewer. */
export function getGlowDot(): Texture {
  if (glowDot) return glowDot
  const { c, ctx } = canvas(64, 64)
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 31)
  g.addColorStop(0, 'rgba(255,250,238,1)')
  g.addColorStop(0.35, 'rgba(255,238,205,0.5)')
  g.addColorStop(1, 'rgba(255,230,190,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  glowDot = new CanvasTexture(c)
  glowDot.colorSpace = SRGBColorSpace
  return glowDot
}

/** Darker structural metal for the frame beams and the satellite bus. */
export function getMetalMap(): Texture {
  if (metalMap) return metalMap
  const { c, ctx } = canvas(256, 256)
  const r = rng(31)
  ctx.fillStyle = '#20262e'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 1400; i++) {
    const x = r() * 256
    const y = r() * 256
    ctx.fillStyle = `rgba(${r() > 0.5 ? '190,205,225' : '0,0,0'},${0.02 + r() * 0.07})`
    ctx.fillRect(x, y, 1 + r() * 3, 1)
  }
  metalMap = new CanvasTexture(c)
  metalMap.colorSpace = SRGBColorSpace
  metalMap.wrapS = metalMap.wrapT = RepeatWrapping
  metalMap.repeat.set(3, 3)
  return metalMap
}
