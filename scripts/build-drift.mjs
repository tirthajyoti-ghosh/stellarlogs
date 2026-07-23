/**
 * Build INTERAMNIA DRIFT from "Space Station Asteroid Mining Facility" by
 * Inditrion Dradnon (Sketchfab, CC BY 4.0) — a complete asteroid colony in
 * one model (rock + habitats + landing disc + lit windows).
 *
 *   node scripts/build-drift.mjs <src scene.gltf> <out drift.glb>
 *
 * Bake world space, join per material, simplify (573k faces → colony prop),
 * KEEP emissives (the windows are the life of the place), normalize to
 * origin-centered max-dimension 230u, webp 512, quantize + meshopt.
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions'
import {
  prune,
  dedup,
  transformPrimitive,
  joinPrimitives,
  weld,
  simplify,
  textureCompress,
  reorder,
  quantize,
} from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import { Matrix4 } from 'three'
import sharp from 'sharp'
import { statSync } from 'node:fs'

const [, , SRC, OUT] = process.argv
await MeshoptEncoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
const doc = await io.read(SRC)
const root = doc.getRoot()
const scene = root.getDefaultScene() ?? root.listScenes()[0]

// Bake to world space, group by material
const byMaterial = new Map()
for (const node of root.listNodes()) {
  const mesh = node.getMesh()
  if (!mesh) continue
  const wm = node.getWorldMatrix()
  for (const prim of mesh.listPrimitives()) {
    const clone = prim.clone()
    transformPrimitive(clone, wm)
    const key = prim.getMaterial()
    if (!byMaterial.has(key)) byMaterial.set(key, [])
    byMaterial.get(key).push(clone)
  }
}
for (const c of scene.listChildren()) scene.removeChild(c)
const outMesh = doc.createMesh('drift')
for (const prims of byMaterial.values()) {
  outMesh.addPrimitive(prims.length > 1 ? joinPrimitives(prims) : prims[0])
}
scene.addChild(doc.createNode('drift').setMesh(outMesh))

// The model is thousands of DISCONNECTED greeble components — topology-
// preserving simplification can't collapse across them (0.25-ratio requests
// returned 99% of verts). Sloppy mode can: it merges and vanishes tiny
// components wholesale. Run it per primitive, then compact the vertex
// streams manually so the dropped vertices actually leave the file.
await MeshoptSimplifier.ready
await doc.transform(weld())
for (const prim of outMesh.listPrimitives()) {
  const posAttr = prim.getAttribute('POSITION')
  const positions = posAttr.getArray()
  const srcIdx = prim.getIndices().getArray()
  const targetCount = Math.min(
    Math.floor(srcIdx.length / 3) * 3,
    Math.max(600, Math.floor((srcIdx.length * 0.08) / 3) * 3),
  )
  const [sloppyIdx] = MeshoptSimplifier.simplifySloppy(
    new Uint32Array(srcIdx),
    new Float32Array(positions),
    3,
    null, // no locked vertices
    targetCount,
    0.03,
  )
  // Compact: gather referenced vertices, remap every attribute
  const remap = new Int32Array(positions.length / 3).fill(-1)
  let next = 0
  const newIdx = new Uint32Array(sloppyIdx.length)
  for (let i = 0; i < sloppyIdx.length; i++) {
    const v = sloppyIdx[i]
    if (remap[v] === -1) remap[v] = next++
    newIdx[i] = remap[v]
  }
  for (const semantic of prim.listSemantics()) {
    const attr = prim.getAttribute(semantic)
    const el = attr.getElementSize()
    const src = attr.getArray()
    const dst = new Float32Array(next * el)
    for (let v = 0; v < remap.length; v++) {
      if (remap[v] === -1) continue
      for (let c = 0; c < el; c++) dst[remap[v] * el + c] = src[v * el + c]
    }
    prim.setAttribute(
      semantic,
      doc.createAccessor().setType(attr.getType()).setArray(dst),
    )
  }
  prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(newIdx))
}

// Normalize: center origin, max dimension 230u
const min = [Infinity, Infinity, Infinity]
const max = [-Infinity, -Infinity, -Infinity]
for (const prim of outMesh.listPrimitives()) {
  const arr = prim.getAttribute('POSITION').getArray()
  for (let i = 0; i < arr.length; i += 3)
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], arr[i + a])
      max[a] = Math.max(max[a], arr[i + a])
    }
}
const size = [0, 1, 2].map((a) => max[a] - min[a])
const scale = 230 / Math.max(...size)
const center = [0, 1, 2].map((a) => (min[a] + max[a]) / 2)
const bake = new Matrix4()
  .makeScale(scale, scale, scale)
  .multiply(new Matrix4().makeTranslation(-center[0], -center[1], -center[2]))
for (const prim of outMesh.listPrimitives()) transformPrimitive(prim, bake.toArray())

await doc.transform(
  prune(),
  dedup(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [384, 384] }),
  reorder({ encoder: MeshoptEncoder }),
  quantize(),
)
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({
  method: EXTMeshoptCompression.EncoderMethod.FILTER,
})
await io.write(OUT, doc)

let verts = 0
console.log(
  `dims ${size.map((v) => (v * scale).toFixed(0)).join('×')}u, prims ${outMesh.listPrimitives().length}`,
)
for (const prim of outMesh.listPrimitives()) verts += prim.getAttribute('POSITION').getCount()
console.log(`wrote ${OUT}: ${statSync(OUT).size} bytes, ${verts} verts`)
