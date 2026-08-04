import { CanvasTexture, RepeatWrapping, SRGBColorSpace, Texture } from 'three'

/**
 * The boards' surfaces, drawn once into canvases and shared by every board.
 *
 * Two jobs, one of them a performance fix in disguise.
 *
 * LOOK. A flat colour reads as a shiny rectangle rather than a sign bolted
 * together out of steel. These give it painted plate: rolling marks, weld
 * seams, dirt collecting where a floodlight never reaches, rust creeping in
 * from the edges.
 *
 * LIGHT. Each board used to carry its own `pointLight` to wash its face.
 * A hundred and two of them existed across the world, and because
 * `MeshStandardMaterial` costs O(lights) per fragment, every lit surface in
 * the scene paid for all of them — measured at 18.4 ms of a 35 ms frame.
 * The wash is now painted instead: three overlapping pools thrown down the
 * face from the lamp bar along the top edge, bright where the lamps are and
 * falling into shadow at the bottom corners. It costs one texture lookup, it
 * never moves because the lamps never move, and it says the same thing the
 * real lights said — *this sign is lit by the lamps bolted to it*.
 *
 * Both are generated rather than downloaded, so they add nothing to the
 * payload, and both are module-level singletons: 500 boards, one texture.
 */

let panelMap: Texture | null = null
let shadeMap: Texture | null = null
let metalMap: Texture | null = null

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, ctx: c.getContext('2d')! }
}

/** deterministic noise so every reload builds the same plate */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

/** Painted steel plate: rolling marks, seams, grime in the corners. */
export function getPanelMap(): Texture {
  if (panelMap) return panelMap
  const { c, ctx } = canvas(512, 512)
  const r = rng(7)

  ctx.fillStyle = '#182a42'
  ctx.fillRect(0, 0, 512, 512)

  // rolling marks left by the mill, horizontal and very faint
  for (let i = 0; i < 900; i++) {
    const y = r() * 512
    const len = 40 + r() * 300
    ctx.strokeStyle = `rgba(${r() > 0.5 ? '150,180,215' : '4,8,16'},${0.015 + r() * 0.045})`
    ctx.lineWidth = r() < 0.85 ? 1 : 2
    ctx.beginPath()
    ctx.moveTo(r() * 512, y)
    ctx.lineTo(r() * 512 + len, y + (r() - 0.5) * 2)
    ctx.stroke()
  }

  // weld seams where the plates meet
  for (const x of [128, 256, 384]) {
    ctx.strokeStyle = 'rgba(0,0,0,.35)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + (r() - 0.5) * 6, 512)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(140,170,200,.09)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 2, 0)
    ctx.lineTo(x + 2 + (r() - 0.5) * 6, 512)
    ctx.stroke()
  }

  // grime and old rust, heaviest at the edges where nothing gets cleaned
  for (let i = 0; i < 130; i++) {
    const x = r() * 512
    const y = r() * 512
    const edge = Math.min(x, y, 512 - x, 512 - y) / 256
    const rad = 20 + r() * 90
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
    const rust = r() < 0.25
    const a = (0.05 + r() * 0.09) * (1.3 - edge)
    g.addColorStop(0, rust ? `rgba(120,70,40,${a})` : `rgba(0,0,0,${a})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, rad, 0, Math.PI * 2)
    ctx.fill()
  }

  panelMap = new CanvasTexture(c)
  panelMap.colorSpace = SRGBColorSpace
  panelMap.wrapS = panelMap.wrapT = RepeatWrapping
  return panelMap
}

/**
 * Where the board's own lamps DON'T reach.
 *
 * Painted as shadow rather than as light. An additive wash over a dark plate
 * blows out to white the moment it is strong enough to read as lit, and it
 * takes the text with it — the first attempt looked like three snowdrifts
 * poured down the sign. Inverting it fixes both problems at once: the plate
 * is simply itself under the lamps, and falls away into black at the bottom
 * corners where nothing reaches. Unlit parts are the point; the text sits in
 * front of this layer and keeps its own material, so it stays legible wherever
 * it lands.
 *
 * White in this map = full shade. Black = the lamps get there.
 */
export function getShadeMap(): Texture {
  if (shadeMap) return shadeMap
  const { c, ctx } = canvas(256, 256)

  // start fully shaded, then cut the lamp cones out of it
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 256, 256)

  ctx.globalCompositeOperation = 'destination-out'
  for (const lx of [52, 128, 204]) {
    const g = ctx.createRadialGradient(lx, -30, 6, lx, -30, 250)
    g.addColorStop(0, 'rgba(0,0,0,1)')
    g.addColorStop(0.4, 'rgba(0,0,0,.97)')
    g.addColorStop(0.72, 'rgba(0,0,0,.62)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(lx, -30)
    ctx.lineTo(lx - 150, 256)
    ctx.lineTo(lx + 150, 256)
    ctx.closePath()
    ctx.fill()
  }
  // the lamps spill along the top edge too
  const top = ctx.createLinearGradient(0, 0, 0, 90)
  top.addColorStop(0, 'rgba(0,0,0,.85)')
  top.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = top
  ctx.fillRect(0, 0, 256, 90)
  ctx.globalCompositeOperation = 'source-over'

  shadeMap = new CanvasTexture(c)
  return shadeMap
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
