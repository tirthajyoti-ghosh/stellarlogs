/**
 * Build the gunnery-range boundary buoy from "Sci-Fi Beacon/Way Point Marker
 * Free Model" by AMMediaGames (Sketchfab, CC BY 4.0).
 *
 *   node scripts/build-buoy.mjs <src scene.gltf> <out buoy.glb>
 *
 * Bakes the node hierarchy into one world-space primitive per material,
 * simplifies (background prop — instanced 16×), normalizes to origin-centered
 * +Y-up with height 12u, compresses textures to 512 webp. Float geometry, no
 * quantization (matches the torpedo pipeline; safe for direct instancing).
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import {
  prune,
  dedup,
  joinPrimitives,
  transformPrimitive,
  weld,
  simplify,
  textureCompress,
} from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import { Matrix4 } from 'three'
import sharp from 'sharp'
import { statSync } from 'node:fs'

const [, , SRC, OUT] = process.argv
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read(SRC)
const root = doc.getRoot()
const scene = root.getDefaultScene() ?? root.listScenes()[0]

// Bake every primitive into world space, grouped by material
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
const outMesh = doc.createMesh('buoy')
for (const prims of byMaterial.values()) {
  outMesh.addPrimitive(prims.length > 1 ? joinPrimitives(prims) : prims[0])
}
scene.addChild(doc.createNode('buoy').setMesh(outMesh))

await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.25, error: 0.001 }),
)

// Normalize: center at origin, height exactly 12 units
let min = [Infinity, Infinity, Infinity]
let max = [-Infinity, -Infinity, -Infinity]
for (const prim of outMesh.listPrimitives()) {
  const arr = prim.getAttribute('POSITION').getArray()
  for (let i = 0; i < arr.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], arr[i + a])
      max[a] = Math.max(max[a], arr[i + a])
    }
  }
}
const scale = 12 / (max[1] - min[1])
const center = [0, 1, 2].map((a) => (min[a] + max[a]) / 2)
const bake = new Matrix4()
  .makeScale(scale, scale, scale)
  .multiply(new Matrix4().makeTranslation(-center[0], -center[1], -center[2]))
for (const prim of outMesh.listPrimitives()) transformPrimitive(prim, bake.toArray())

await doc.transform(
  prune(),
  dedup(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512] }),
)
await io.write(OUT, doc)

let verts = 0
for (const prim of outMesh.listPrimitives()) verts += prim.getAttribute('POSITION').getCount()
console.log(
  `wrote ${OUT}: ${statSync(OUT).size} bytes, ${verts} verts, ` +
    `source dims ${(max[0] - min[0]).toFixed(3)}×${(max[1] - min[1]).toFixed(3)}×${(max[2] - min[2]).toFixed(3)} → height 12`,
)
