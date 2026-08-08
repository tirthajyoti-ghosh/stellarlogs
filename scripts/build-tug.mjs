/**
 * Build THE MILITIA TUG from "Titan Docked" by Blackhart (Sketchfab,
 * CC BY 4.0) — Tirtha's pick from the tugs.html bench (2026-08-08).
 *
 *   node scripts/build-tug.mjs <src titan.glb> <out tug.glb>
 *
 * The source ships INSIDE ITS OWN DOCK (floor, walls, ceiling, ads, fuel
 * hose) — only the two nodes named "Titan" are the boat; everything else
 * is discarded and prune() sweeps their textures. Cross-section profiling:
 * the hull TAPERS toward +Z (a thin nose lip at z≈6.3) with the tall dense
 * drive block at -Z, so the bow is +Z → rotated onto +X, the project
 * convention. Length 10u: half the Draugr's 20 — a real tug's proportion,
 * small against what it tows and unmistakably strong (Tirtha: "small, but
 * not tiny… proportional"). Materials kept as authored — a working boat
 * wears its paint; only texture size is tamed.
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
const LENGTH = 10

await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })
const doc = await io.read(SRC)
const root = doc.getRoot()
const scene = root.getDefaultScene() ?? root.listScenes()[0]

// ---- bake ONLY the boat to world space; the dock stays behind ----
const baked = []
for (const node of root.listNodes()) {
  if ((node.getName() || '') !== 'Titan') continue
  const mesh = node.getMesh()
  if (!mesh) continue
  const wm = node.getWorldMatrix()
  for (const prim of mesh.listPrimitives()) {
    const clone = prim.clone()
    transformPrimitive(clone, wm)
    baked.push(clone)
  }
}
if (baked.length === 0) throw new Error('no Titan primitives found')
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
console.log(`boat dims ${size.map((v) => v.toFixed(1)).join(' × ')}`)

const hullMesh = doc.createMesh('hull')
for (const prim of baked) hullMesh.addPrimitive(prim)
scene.addChild(doc.createNode('hull').setMesh(hullMesh))

await doc.transform(weld())

// ---- normalize: center, bow (source +Z) → +X, length LENGTH ----
const scale = LENGTH / Math.max(...size)
const center = [0, 1, 2].map((a) => (min[a] + max[a]) / 2)
const bake = new Matrix4()
  .makeRotationY(Math.PI / 2)
  .multiply(new Matrix4().makeScale(scale, scale, scale))
  .multiply(new Matrix4().makeTranslation(-center[0], -center[1], -center[2]))
for (const prim of hullMesh.listPrimitives()) transformPrimitive(prim, bake.toArray())

await doc.transform(
  prune(),
  dedup(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512] }),
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
