/**
 * Generic freighter builder — turns any downloaded ship into a hull that
 * matches this project's conventions, so the Amnia's traffic can be a
 * FLEET instead of one repeated ship.
 *
 *   node scripts/build-freighter.mjs <src> <out> <length> [simplifyRatio]
 *
 * Conventions enforced: origin-centred, long axis on X with the BOW at +X
 * (detected by taper — the narrow end of a ship is her nose), matte working
 * -ship materials, decimated, webp textures, quantize + meshopt. Output
 * node is always named 'hull'.
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions'
import {
  prune,
  dedup,
  transformPrimitive,
  weld,
  simplify,
  textureCompress,
  reorder,
  quantize,
  normals,
} from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer'
import { Matrix4 } from 'three'
import sharp from 'sharp'
import { statSync } from 'node:fs'

const [, , SRC, OUT, LENGTH_ARG, RATIO_ARG] = process.argv
const LENGTH = Number(LENGTH_ARG ?? 60)
const RATIO = Number(RATIO_ARG ?? 0.2)
/** Disconnected-greeble hulls need sloppy decimation to shed anything */
const SLOPPY = process.argv.includes('--sloppy')
/** Raiders run dark: knock the albedo down so she reads as a predator */
const DARK = process.argv.includes('--dark')

await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })
const doc = await io.read(SRC)
const root = doc.getRoot()
const scene = root.getDefaultScene() ?? root.listScenes()[0]

const baked = []
for (const node of root.listNodes()) {
  const mesh = node.getMesh()
  if (!mesh) continue
  const wm = node.getWorldMatrix()
  for (const prim of mesh.listPrimitives()) {
    const clone = prim.clone()
    transformPrimitive(clone, wm)
    baked.push(clone)
  }
}
for (const c of scene.listChildren()) scene.removeChild(c)

const min = [Infinity, Infinity, Infinity]
const max = [-Infinity, -Infinity, -Infinity]
for (const prim of baked) {
  const arr = prim.getAttribute('POSITION').getArray()
  for (let i = 0; i < arr.length; i += 3)
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], arr[i + a])
      max[a] = Math.max(max[a], arr[i + a])
    }
}
const size = [0, 1, 2].map((a) => max[a] - min[a])
const axis = size.indexOf(Math.max(...size))
const other = [0, 1, 2].filter((a) => a !== axis)

/** Which end is the bow? The narrower one. Compare taper in the end 22%. */
let loSum = 0
let loN = 0
let hiSum = 0
let hiN = 0
const loCut = min[axis] + size[axis] * 0.22
const hiCut = max[axis] - size[axis] * 0.22
for (const prim of baked) {
  const arr = prim.getAttribute('POSITION').getArray()
  for (let i = 0; i < arr.length; i += 3) {
    const along = arr[i + axis]
    const r = Math.hypot(arr[i + other[0]], arr[i + other[1]])
    if (along < loCut) {
      loSum += r
      loN++
    } else if (along > hiCut) {
      hiSum += r
      hiN++
    }
  }
}
const loR = loN ? loSum / loN : 0
const hiR = hiN ? hiSum / hiN : 0
const bowAtMin = loR < hiR
console.log(
  `dims ${size.map((v) => v.toFixed(1)).join(' × ')} · long axis ${'XYZ'[axis]} · ` +
    `taper lo=${loR.toFixed(2)} hi=${hiR.toFixed(2)} → bow at ${bowAtMin ? '-' : '+'}${'XYZ'[axis]}`,
)

const hullMesh = doc.createMesh('hull')
for (const prim of baked) hullMesh.addPrimitive(prim)
scene.addChild(doc.createNode('hull').setMesh(hullMesh))

for (const material of root.listMaterials()) {
  if (DARK) {
    const b = material.getBaseColorFactor()
    material.setBaseColorFactor([b[0] * 0.42, b[1] * 0.45, b[2] * 0.52, b[3]])
    material.setEmissiveFactor([0, 0, 0])
  }
  material.setRoughnessFactor(Math.max(0.7, material.getRoughnessFactor()))
  material.setMetallicFactor(Math.min(0.4, material.getMetallicFactor()))
  material.setNormalTexture(null)
  material.setOcclusionTexture(null)
  material.setMetallicRoughnessTexture(null)
}

await doc.transform(weld())
if (SLOPPY) {
  // Container ships are thousands of DISCONNECTED boxes: topology-preserving
  // simplification cannot collapse across them (0.02 ratio still returned
  // 100% of verts). Sloppy mode merges and vanishes small components
  // wholesale; the vertex streams are then compacted by hand so the dropped
  // vertices actually leave the file. Same treatment the colony needed.
  await MeshoptSimplifier.ready
  for (const prim of hullMesh.listPrimitives()) {
    const positions = prim.getAttribute('POSITION').getArray()
    const indices = prim.getIndices()
    if (!indices) continue
    const srcIdx = indices.getArray()
    const targetCount = Math.min(
      Math.floor(srcIdx.length / 3) * 3,
      Math.max(600, Math.floor((srcIdx.length * RATIO) / 3) * 3),
    )
    const [sloppyIdx] = MeshoptSimplifier.simplifySloppy(
      new Uint32Array(srcIdx),
      new Float32Array(positions),
      3,
      null,
      targetCount,
      0.04,
    )
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
      prim.setAttribute(semantic, doc.createAccessor().setType(attr.getType()).setArray(dst))
    }
    prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(newIdx))
  }
  await doc.transform(normals({ overwrite: true }))
} else {
  await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: 0.01 }))
}

// ---- normalize: centre, long axis → X with the bow on +X, scale to LENGTH
const scale = LENGTH / size[axis]
const center = [0, 1, 2].map((a) => (min[a] + max[a]) / 2)
// rotation that maps the long axis onto X with the bow pointing +X
let rot
if (axis === 0) rot = bowAtMin ? new Matrix4().makeRotationY(Math.PI) : new Matrix4()
else if (axis === 1) rot = new Matrix4().makeRotationZ(bowAtMin ? Math.PI / 2 : -Math.PI / 2)
else rot = new Matrix4().makeRotationY(bowAtMin ? -Math.PI / 2 : Math.PI / 2)
const bake = rot
  .multiply(new Matrix4().makeScale(scale, scale, scale))
  .multiply(new Matrix4().makeTranslation(-center[0], -center[1], -center[2]))
for (const prim of hullMesh.listPrimitives()) transformPrimitive(prim, bake.toArray())

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
for (const prim of hullMesh.listPrimitives()) verts += prim.getAttribute('POSITION').getCount()
console.log(`wrote ${OUT}: ${statSync(OUT).size} bytes, ${verts} verts`)
