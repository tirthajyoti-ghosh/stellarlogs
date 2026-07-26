/**
 * Build THE DRAUGR — the raider that works the ice route — from "Stealth
 * Ship - Vehicle Design" (Sketchfab, CC BY 4.0).
 *
 *   node scripts/build-draugr.mjs <src .glb> <out draugr.glb>
 *
 * Source long axis is Z with the NARROW end (the bow) at -Z, verified by
 * cross-section profiling. We rotate Y by -90° so the bow lands on +X, the
 * convention every ship in this project renders with. Hull darkened hard:
 * a ship that works this lane runs dark and is seen by her drive, not her
 * paint. Normalized origin-centered, length 14u (~2× the player's gunship).
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions'
import {
  prune,
  dedup,
  transformPrimitive,
  weld,
  textureCompress,
  reorder,
  quantize,
} from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer'
import { Matrix4 } from 'three'
import sharp from 'sharp'
import { statSync } from 'node:fs'

const [, , SRC, OUT] = process.argv
const LENGTH = 14

await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })
const doc = await io.read(SRC)
const root = doc.getRoot()
const scene = root.getDefaultScene() ?? root.listScenes()[0]

// ---- bake to world space ----
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
console.log(`dims ${size.map((v) => v.toFixed(1)).join(' × ')}`)

const hullMesh = doc.createMesh('hull')
for (const prim of baked) hullMesh.addPrimitive(prim)
scene.addChild(doc.createNode('hull').setMesh(hullMesh))

// ---- a ship that does not want to be seen ----
for (const material of root.listMaterials()) {
  const base = material.getBaseColorFactor()
  material.setBaseColorFactor([base[0] * 0.3, base[1] * 0.32, base[2] * 0.36, base[3]])
  material.setRoughnessFactor(0.92)
  material.setMetallicFactor(0.18)
  material.setEmissiveFactor([0, 0, 0])
  material.setNormalTexture(null)
  material.setOcclusionTexture(null)
  material.setMetallicRoughnessTexture(null)
}

await doc.transform(weld())

// ---- normalize: center, bow (source -Z) → +X, length LENGTH ----
const scale = LENGTH / Math.max(...size)
const center = [0, 1, 2].map((a) => (min[a] + max[a]) / 2)
const bake = new Matrix4()
  .makeRotationY(-Math.PI / 2)
  .multiply(new Matrix4().makeScale(scale, scale, scale))
  .multiply(new Matrix4().makeTranslation(-center[0], -center[1], -center[2]))
for (const prim of hullMesh.listPrimitives()) transformPrimitive(prim, bake.toArray())

await doc.transform(
  prune(),
  dedup(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [256, 256] }),
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
