/**
 * Build THE CRIB SKIFF from SPACESHIP EAV 2 "CRAB" (Sketchfab, CC BY 4.0)
 * — "designed for maintenance, construction, and handling of hazardous
 * materials in outer space… armored manipulator arms."
 *
 *   node scripts/build-skiff.mjs <src crab.glb> <out skiff.glb>
 *
 * Tirtha's reference: the repair/construction skiffs of The Expanse S6 —
 * the boat Tadeo works the Pella's hull from, and the one Filip leaves in.
 * The Drift flies two or three of these out to patch the crib after a
 * Khione pass. Length 8u: smaller than the militia tug (10u), because a
 * patch boat is a workman's boat.
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
  simplify,
} from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer'
import { Matrix4 } from 'three'
import sharp from 'sharp'
import { statSync } from 'node:fs'

const [, , SRC, OUT] = process.argv
const LENGTH = 8

await MeshoptEncoder.ready
await MeshoptDecoder.ready
await MeshoptSimplifier.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })
const doc = await io.read(SRC)
const root = doc.getRoot()
const scene = root.getDefaultScene() ?? root.listScenes()[0]

// bake every mesh to world space and merge into one hull
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
if (!baked.length) throw new Error('no primitives found')
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
console.log(`skiff dims ${size.map((v) => v.toFixed(1)).join(' × ')}`)

const hullMesh = doc.createMesh('hull')
for (const prim of baked) hullMesh.addPrimitive(prim)
scene.addChild(doc.createNode('hull').setMesh(hullMesh))

await doc.transform(weld())

// normalize: centre, longest axis → +X (project convention), length 8u
const longest = size.indexOf(Math.max(...size))
const rot =
  longest === 0 ? new Matrix4() : longest === 2 ? new Matrix4().makeRotationY(Math.PI / 2) : new Matrix4().makeRotationZ(Math.PI / 2)
const scale = LENGTH / Math.max(...size)
const center = [0, 1, 2].map((a) => (min[a] + max[a]) / 2)
const bake = rot
  .multiply(new Matrix4().makeScale(scale, scale, scale))
  .multiply(new Matrix4().makeTranslation(-center[0], -center[1], -center[2]))
for (const prim of hullMesh.listPrimitives()) transformPrimitive(prim, bake.toArray())

// three of these fly at once and they are small on screen — decimate hard
await doc.transform(
  prune(),
  dedup(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.6, error: 0.002 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
  reorder({ encoder: MeshoptEncoder }),
  quantize(),
)
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({
  method: EXTMeshoptCompression.EncoderMethod.FILTER,
})
await io.write(OUT, doc)

let verts = 0
for (const prim of doc.getRoot().listMeshes()[0].listPrimitives()) verts += prim.getAttribute('POSITION').getCount()
console.log(`wrote ${OUT}: ${statSync(OUT).size} bytes, ${verts} verts`)
