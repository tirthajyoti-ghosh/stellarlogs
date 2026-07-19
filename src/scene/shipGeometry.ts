import { BufferAttribute, BufferGeometry, CanvasTexture, RepeatWrapping, SRGBColorSpace, Vector2 } from 'three'

/**
 * Rocinante-style hull pieces. The loft builds a flattened chamfered slab
 * through arbitrary stations (stern → bow); non-indexed triangles give hard
 * facets and per-face planar UVs let the plating textures land cleanly.
 * Local frame: +Y = nose, +Z = up, X = starboard.
 */

export interface LoftStation {
  y: number
  w: number
  h: number
  /** vertical offset of the section center */
  z: number
}

/** Chamfered-rectangle cross-section, 8 points. */
function section(st: LoftStation): Vector2[] {
  const cw = st.w * 0.24
  const ch = st.h * 0.32
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

export function makeLoftGeometry(stations: LoftStation[]): BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const rings = stations.map((st) => ({ st, pts: section(st) }))

  const push = (
    ax: number, ay: number, az: number, au: number, av: number,
    bx: number, by: number, bz: number, bu: number, bv: number,
    cx: number, cy: number, cz: number, cu: number, cv: number,
  ) => {
    positions.push(ax, ay, az, bx, by, bz, cx, cy, cz)
    uvs.push(au, av, bu, bv, cu, cv)
  }

  for (let s = 0; s < rings.length - 1; s++) {
    const a = rings[s]
    const b = rings[s + 1]
    const va = s / (rings.length - 1)
    const vb = (s + 1) / (rings.length - 1)
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8
      const u0 = i / 8
      const u1 = (i + 1) / 8
      const p00 = [a.pts[i].x, a.st.y, a.pts[i].y + a.st.z] as const
      const p01 = [a.pts[j].x, a.st.y, a.pts[j].y + a.st.z] as const
      const p10 = [b.pts[i].x, b.st.y, b.pts[i].y + b.st.z] as const
      const p11 = [b.pts[j].x, b.st.y, b.pts[j].y + b.st.z] as const
      push(...p00, u0, va, ...p10, u0, vb, ...p11, u1, vb)
      push(...p00, u0, va, ...p11, u1, vb, ...p01, u1, va)
    }
  }

  // End caps (first ring faces -Y…ish, last faces +Y)
  const first = rings[0]
  for (let i = 1; i < 7; i++) {
    push(
      first.pts[0].x, first.st.y, first.pts[0].y + first.st.z, 0.1, 0.1,
      first.pts[i].x, first.st.y, first.pts[i].y + first.st.z, 0.5, 0.5,
      first.pts[i + 1].x, first.st.y, first.pts[i + 1].y + first.st.z, 0.9, 0.9,
    )
  }
  const last = rings[rings.length - 1]
  for (let i = 1; i < 7; i++) {
    push(
      last.pts[0].x, last.st.y, last.pts[0].y + last.st.z, 0.1, 0.1,
      last.pts[i + 1].x, last.st.y, last.pts[i + 1].y + last.st.z, 0.9, 0.9,
      last.pts[i].x, last.st.y, last.pts[i].y + last.st.z, 0.5, 0.5,
    )
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  geometry.computeVertexNormals()
  return geometry
}

let seedState = 1337
const rng = () => {
  seedState = (seedState * 1103515245 + 12345) & 0x7fffffff
  return seedState / 0x7fffffff
}

function wrap(canvas: HTMLCanvasElement, srgb: boolean): CanvasTexture {
  const tex = new CanvasTexture(canvas)
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  if (srgb) tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export interface PanelTextures {
  map: CanvasTexture
  bumpMap: CanvasTexture
  roughnessMap: CanvasTexture
}

/** Armored-plating set: tonal patches, seam lines, rivets, streaks. */
export function makePanelTextures(): PanelTextures {
  const S = 512
  const albedo = document.createElement('canvas')
  const bump = document.createElement('canvas')
  const rough = document.createElement('canvas')
  albedo.width = albedo.height = bump.width = bump.height = rough.width = rough.height = S
  const a = albedo.getContext('2d')!
  const b = bump.getContext('2d')!
  const r = rough.getContext('2d')!

  a.fillStyle = '#565b63'
  a.fillRect(0, 0, S, S)
  b.fillStyle = '#808080'
  b.fillRect(0, 0, S, S)
  r.fillStyle = '#9a9a9a'
  r.fillRect(0, 0, S, S)

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

  for (let i = 0; i < 26; i++) {
    const y = rng() * S
    const x0 = rng() * S * 0.6
    const n = 6 + ((rng() * 12) | 0)
    for (let k = 0; k < n; k++) {
      const x = x0 + k * 9
      a.fillStyle = 'rgba(28, 32, 38, 0.55)'
      a.fillRect(x, y, 1.6, 1.6)
      b.fillStyle = 'rgba(210, 210, 210, 0.8)'
      b.fillRect(x, y, 1.6, 1.6)
    }
  }

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

  return { map: wrap(albedo, true), bumpMap: wrap(bump, false), roughnessMap: wrap(rough, false) }
}

/**
 * Blue-grey hex-greeble field, like the Roci's big armor panels: hexagon
 * cells with embossed outlines and inner detail, some cells raised/lit.
 */
export function makeHexTextures(): PanelTextures {
  const S = 512
  const albedo = document.createElement('canvas')
  const bump = document.createElement('canvas')
  const rough = document.createElement('canvas')
  albedo.width = albedo.height = bump.width = bump.height = rough.width = rough.height = S
  const a = albedo.getContext('2d')!
  const b = bump.getContext('2d')!
  const r = rough.getContext('2d')!

  a.fillStyle = '#333e4c'
  a.fillRect(0, 0, S, S)
  b.fillStyle = '#787878'
  b.fillRect(0, 0, S, S)
  r.fillStyle = '#8a8a8a'
  r.fillRect(0, 0, S, S)

  const cell = 46
  const hexPath = (ctx: CanvasRenderingContext2D, cx: number, cy: number, rad: number) => {
    ctx.beginPath()
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2 + Math.PI / 6
      const px = cx + Math.cos(ang) * rad
      const py = cy + Math.sin(ang) * rad
      if (k === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
  }

  for (let row = -1; row < S / (cell * 0.87) + 1; row++) {
    for (let col = -1; col < S / cell + 1; col++) {
      const cx = col * cell + (row % 2 ? cell / 2 : 0)
      const cy = row * cell * 0.87
      const tone = rng()
      // cell fill variance
      if (tone > 0.6) {
        a.fillStyle = `rgba(${70 + tone * 30}, ${84 + tone * 28}, ${100 + tone * 26}, 0.35)`
        hexPath(a, cx, cy, cell * 0.46)
        a.fill()
        b.fillStyle = 'rgba(190, 190, 190, 0.5)'
        hexPath(b, cx, cy, cell * 0.46)
        b.fill()
      }
      // outline
      a.strokeStyle = 'rgba(14, 18, 26, 0.75)'
      a.lineWidth = 2.4
      hexPath(a, cx, cy, cell * 0.5)
      a.stroke()
      b.strokeStyle = 'rgba(20, 20, 20, 0.9)'
      b.lineWidth = 3
      hexPath(b, cx, cy, cell * 0.5)
      b.stroke()
      // inner detail hex
      a.strokeStyle = 'rgba(120, 138, 158, 0.3)'
      a.lineWidth = 1.2
      hexPath(a, cx, cy, cell * 0.3)
      a.stroke()
      // occasional inner blocks
      if (tone < 0.25) {
        a.fillStyle = 'rgba(16, 20, 28, 0.5)'
        a.fillRect(cx - 8, cy - 5, 16, 10)
        b.fillStyle = 'rgba(50, 50, 50, 0.8)'
        b.fillRect(cx - 8, cy - 5, 16, 10)
      }
    }
  }

  return { map: wrap(albedo, true), bumpMap: wrap(bump, false), roughnessMap: wrap(rough, false) }
}

/** Dark shingle/tile courses for the shoulder roof, like the model's slope. */
export function makeShingleTextures(): PanelTextures {
  const S = 256
  const albedo = document.createElement('canvas')
  const bump = document.createElement('canvas')
  const rough = document.createElement('canvas')
  albedo.width = albedo.height = bump.width = bump.height = rough.width = rough.height = S
  const a = albedo.getContext('2d')!
  const b = bump.getContext('2d')!
  const r = rough.getContext('2d')!

  a.fillStyle = '#272b31'
  a.fillRect(0, 0, S, S)
  b.fillStyle = '#828282'
  b.fillRect(0, 0, S, S)
  r.fillStyle = '#a8a8a8'
  r.fillRect(0, 0, S, S)

  const rowH = 22
  const tileW = 34
  for (let row = 0; row < S / rowH + 1; row++) {
    const off = row % 2 ? tileW / 2 : 0
    for (let col = -1; col < S / tileW + 1; col++) {
      const x = col * tileW + off
      const y = row * rowH
      const tone = 34 + rng() * 14
      a.fillStyle = `rgb(${tone | 0}, ${(tone + 3) | 0}, ${(tone + 7) | 0})`
      a.fillRect(x + 1, y + 1, tileW - 2, rowH - 2)
      // top-edge highlight for the overlap illusion
      a.fillStyle = 'rgba(120, 128, 138, 0.25)'
      a.fillRect(x + 1, y + 1, tileW - 2, 1.6)
      b.fillStyle = 'rgba(40, 40, 40, 0.9)'
      b.fillRect(x, y, tileW, 1.8)
      b.fillRect(x, y, 1.8, rowH)
    }
  }

  return { map: wrap(albedo, true), bumpMap: wrap(bump, false), roughnessMap: wrap(rough, false) }
}
