/**
 * Build the IMIQ — the Nilak's intact sister ship — from "Cargo Hauler" by
 * NekoKuroHB (Sketchfab, CC BY 4.0).
 *
 *   node scripts/build-imiq.mjs <src scene.gltf> <out imiq.glb>
 *
 * Unlike the wreck build: nothing dropped, nothing severed, materials stay
 * alive (running lights burning). Normal/occlusion detail stripped for size;
 * finer simplify than the wreck — she is the mission object and gets close
 * camera time. Normalized origin-centered, long axis = X, length 72u.
 * Output node: 'hull'.
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

// ---- bake all primitives to world space ----
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

// ---- global bounds + long axis ----
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
console.log(`dims ${size.map((v) => v.toFixed(1)).join(' × ')}, long axis ${'XYZ'[axis]}`)

const hullMesh = doc.createMesh('hull')
for (const prim of baked) hullMesh.addPrimitive(prim)
scene.addChild(doc.createNode('hull').setMesh(hullMesh))

// ---- living-ship materials: keep base color + emissive (lights burning),
// drop normal/occlusion/MR detail textures for size, clamp shine sane ----
for (const material of root.listMaterials()) {
  material.setRoughnessFactor(Math.max(0.75, material.getRoughnessFactor()))
  material.setMetallicFactor(Math.min(0.35, material.getMetallicFactor()))
  material.setNormalTexture(null)
  material.setOcclusionTexture(null)
  material.setMetallicRoughnessTexture(null)
  if (material.getName() === 'Glass') {
    // crewed ship: cabin glass glows faintly warm
    material.setEmissiveFactor([0.55, 0.42, 0.22])
    material.setEmissiveTexture(null)
  }
}

await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.22, error: 0.006 }),
)

// ---- normalize: center origin, long axis → X, length 72 ----
const scale = 72 / size[axis]
const center = [0, 1, 2].map((a) => (min[a] + max[a]) / 2)
const rot =
  axis === 0
    ? new Matrix4()
    : axis === 1
      ? new Matrix4().makeRotationZ(-Math.PI / 2)
      : new Matrix4().makeRotationY(Math.PI / 2)
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
let prims = 0
for (const prim of hullMesh.listPrimitives()) {
  verts += prim.getAttribute('POSITION').getCount()
  prims++
}
console.log(`wrote ${OUT}: ${statSync(OUT).size} bytes, ${verts} verts, ${prims} prims`)
