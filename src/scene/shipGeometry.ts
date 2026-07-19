import { BufferAttribute, BufferGeometry, CanvasTexture, RepeatWrapping, SRGBColorSpace, Vector2 } from 'three'

/**
 * Rocinante-style hull: a flattened, chamfered slab lofted from stern to bow
 * stations. Non-indexed triangles → hard facets; per-face planar UVs so the
 * panel-plate textures land cleanly.
 * Local frame: +Y = nose, +Z = up, X = starboard. Widths > heights (slab).
 */

interface Station {
  y: number
  w: number
  h: number
  /** vertical offset of the section center */
  z: number
}

const STATIONS: Station[] = [
  { y: 3.3, w: 0.44, h: 0.26, z: 0.02 },
  { y: 2.55, w: 0.95, h: 0.52, z: 0.03 },
  { y: 1.4, w: 1.42, h: 0.78, z: 0 },
  { y: -0.2, w: 1.62, h: 0.92, z: 0 },
  { y: -1.5, w: 1.68, h: 1.0, z: 0 },
  { y: -2.15, w: 1.52, h: 0.92, z: 0 },
]

/** Chamfered-rectangle cross-section, 8 points, CCW seen from +Y (bow). */
function section(st: Station): Vector2[] {
  const cw = st.w * 0.26
  const ch = st.h * 0.34
  const hw = st.w / 2
  const hh = st.h / 2
  return [
    new Vector2(hw - cw, hh),
    new Vector2(hw, hh - ch),
    new Vector2(hw, -hh + ch),
    new Vector2(hw - cw, -hh),
    new Vector2(-hw + cw, -hh),
    new Vector2(-hw, -hh + ch),
    new Vector2(-hw, hh - ch),
    new Vector2(-hw + cw, hh),
  ]
}

export function makeHullGeometry(): BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const rings = STATIONS.map((st) => ({ st, pts: section(st) }))

  const push = (
    ax: number, ay: number, az: number, au: number, av: number,
    bx: number, by: number, bz: number, bu: number, bv: number,
    cx: number, cy: number, cz: number, cu: number, cv: number,
  ) => {
    positions.push(ax, ay, az, bx, by, bz, cx, cy, cz)
    uvs.push(au, av, bu, bv, cu, cv)
  }

  // Side walls between consecutive stations
  for (let s = 0; s < rings.length - 1; s++) {
    const a = rings[s]
    const b = rings[s + 1]
    const va = s / (rings.length - 1)
    const vb = (s + 1) / (rings.length - 1)
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8
      const u0 = i / 8
      const u1 = (i + 1) / 8
      // quad corners: a.i, a.j (near stern-ward ring), b.i, b.j (bow-ward)
      const p00 = [a.pts[i].x, a.st.y, a.pts[i].y + a.st.z] as const
      const p01 = [a.pts[j].x, a.st.y, a.pts[j].y + a.st.z] as const
      const p10 = [b.pts[i].x, b.st.y, b.pts[i].y + b.st.z] as const
      const p11 = [b.pts[j].x, b.st.y, b.pts[j].y + b.st.z] as const
      push(...p00, u0, va, ...p10, u0, vb, ...p11, u1, vb)
      push(...p00, u0, va, ...p11, u1, vb, ...p01, u1, va)
    }
  }

  // Stern cap (fan, faces -Y)
  const stern = rings[0]
  for (let i = 1; i < 7; i++) {
    const p0 = stern.pts[0]
    const p1 = stern.pts[i]
    const p2 = stern.pts[i + 1]
    push(
      p0.x, stern.st.y, p0.y + stern.st.z, 0.5 + p0.x * 0.3, 0.5 + p0.y * 0.3,
      p1.x, stern.st.y, p1.y + stern.st.z, 0.5 + p1.x * 0.3, 0.5 + p1.y * 0.3,
      p2.x, stern.st.y, p2.y + stern.st.z, 0.5 + p2.x * 0.3, 0.5 + p2.y * 0.3,
    )
  }
  // Bow cap (fan, faces +Y) — reverse winding
  const bow = rings[rings.length - 1]
  for (let i = 1; i < 7; i++) {
    const p0 = bow.pts[0]
    const p1 = bow.pts[i]
    const p2 = bow.pts[i + 1]
    push(
      p0.x, bow.st.y, p0.y + bow.st.z, 0.5 + p0.x, 0.5 + p0.y,
      p2.x, bow.st.y, p2.y + bow.st.z, 0.5 + p2.x, 0.5 + p2.y,
      p1.x, bow.st.y, p1.y + bow.st.z, 0.5 + p1.x, 0.5 + p1.y,
    )
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  geometry.computeVertexNormals()
  return geometry
}

interface PanelTextures {
  map: CanvasTexture
  bumpMap: CanvasTexture
  roughnessMap: CanvasTexture
}

let seedState = 1337
const rng = () => {
  seedState = (seedState * 1103515245 + 12345) & 0x7fffffff
  return seedState / 0x7fffffff
}

/**
 * Armored-plating texture set: tonal panel patches, dark seam lines, rivet
 * rows, streaks and scuffs — albedo + bump (seams recessed) + roughness.
 */
export function makePanelTextures(): PanelTextures {
  const S = 512
  const albedo = document.createElement('canvas')
  const bump = document.createElement('canvas')
  const rough = document.createElement('canvas')
  albedo.width = albedo.height = bump.width = bump.height = rough.width = rough.height = S
  const a = albedo.getContext('2d')!
  const b = bump.getContext('2d')!
  const r = rough.getContext('2d')!

  // Bases
  a.fillStyle = '#565b63'
  a.fillRect(0, 0, S, S)
  b.fillStyle = '#808080'
  b.fillRect(0, 0, S, S)
  r.fillStyle = '#9a9a9a' // mid roughness
  r.fillRect(0, 0, S, S)

  // Panel patches: slight tonal + warmth variance, matching roughness patches
  for (let i = 0; i < 110; i++) {
    const x = rng() * S
    const y = rng() * S
    const w = 30 + rng() * 110
    const h = 24 + rng() * 90
    const warm = rng() > 0.72
    const tone = -14 + rng() * 24
    const base = warm ? [92 + tone, 88 + tone, 80 + tone] : [86 + tone, 91 + tone, 99 + tone]
    a.fillStyle = `rgba(${base[0] | 0}, ${base[1] | 0}, ${base[2] | 0}, 0.55)`
    a.fillRect(x, y, w, h)
    const rr = 120 + rng() * 90
    r.fillStyle = `rgba(${rr | 0}, ${rr | 0}, ${rr | 0}, 0.5)`
    r.fillRect(x, y, w, h)
    const bb = 118 + rng() * 24
    b.fillStyle = `rgba(${bb | 0}, ${bb | 0}, ${bb | 0}, 0.4)`
    b.fillRect(x, y, w, h)
  }

  // Seam lines: dark in albedo, recessed in bump
  const seam = (x1: number, y1: number, x2: number, y2: number) => {
    a.strokeStyle = 'rgba(20, 24, 30, 0.5)'
    a.lineWidth = 1.6
    a.beginPath()
    a.moveTo(x1, y1)
    a.lineTo(x2, y2)
    a.stroke()
    b.strokeStyle = 'rgba(30, 30, 30, 0.85)'
    b.lineWidth = 2.2
    b.beginPath()
    b.moveTo(x1, y1)
    b.lineTo(x2, y2)
    b.stroke()
  }
  for (let i = 0; i < 15; i++) {
    const y = rng() * S
    seam(0, y, S, y + (rng() - 0.5) * 12)
  }
  for (let i = 0; i < 12; i++) {
    const x = rng() * S
    seam(x, 0, x + (rng() - 0.5) * 12, S)
  }

  // Rivet rows along some seams
  for (let i = 0; i < 26; i++) {
    const y = rng() * S
    const x0 = rng() * S * 0.6
    const n = 6 + (rng() * 12) | 0
    for (let k = 0; k < n; k++) {
      const x = x0 + k * 9
      a.fillStyle = 'rgba(28, 32, 38, 0.55)'
      a.fillRect(x, y, 1.6, 1.6)
      b.fillStyle = 'rgba(210, 210, 210, 0.8)'
      b.fillRect(x, y, 1.6, 1.6)
    }
  }

  // Streaks / scuffs
  for (let i = 0; i < 34; i++) {
    const x = rng() * S
    const y = rng() * S
    const len = 22 + rng() * 90
    const light = rng() > 0.5
    a.fillStyle = light ? 'rgba(180, 188, 198, 0.06)' : 'rgba(12, 14, 18, 0.09)'
    a.fillRect(x, y, 2 + rng() * 3, len)
    r.fillStyle = light ? 'rgba(70, 70, 70, 0.35)' : 'rgba(200, 200, 200, 0.3)'
    r.fillRect(x, y, 2 + rng() * 3, len)
  }

  const wrap = (canvas: HTMLCanvasElement, srgb: boolean) => {
    const tex = new CanvasTexture(canvas)
    tex.wrapS = RepeatWrapping
    tex.wrapT = RepeatWrapping
    if (srgb) tex.colorSpace = SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }
  return { map: wrap(albedo, true), bumpMap: wrap(bump, false), roughnessMap: wrap(rough, false) }
}
