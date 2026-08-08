/**
 * Build THE SPILL's cargo variants — four CC-BY crates merged into one
 * crates.glb, each a named node baked to a realistic relative size
 * (Tirtha's locked mixture, crates.html bench 2026-08-09):
 *
 *   container  "Futuristic cargo container Low-Poly" by begle        → 7.0u
 *   crate      "Sci-fi cargo crate" by andreas9343                   → 2.6u
 *   box        "Cargo Crate" by boysichterman                        → 2.2u
 *   ammo       "Sci-Fi crate / ammunition box (2)" by ul1tka         → 1.5u
 *
 *   node scripts/build-crates.mjs <dir-with-uid-folders> <out.glb>
 *
 * Credit lands in README + welcome card with the other CC assets.
 */
import { NodeIO, Document } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions'
import {
  prune,
  dedup,
  mergeDocuments,
  unpartition,
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

const [, , SRC_DIR, OUT] = process.argv

const VARIANTS = [
  { name: 'container', uid: '015f32ec950744c4898e17af07d43f65', size: 7.0 },
  { name: 'crate', uid: 'ac36898521304e51a8e305aa602f1f5b', size: 2.6 },
  { name: 'box', uid: '19a32159a3d6443e95105f4f7cb51c39', size: 2.2 },
  { name: 'ammo', uid: '342efe4d70f94d37a4edd66a15c39502', size: 1.5 },
]

await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })

const out = new Document()
const outRoot = out.getRoot()
const outScene = out.createScene('crates')
outRoot.setDefaultScene(outScene)

for (const v of VARIANTS) {
  const doc = await io.read(`${SRC_DIR}/${v.uid}/scene.gltf`)
  const root = doc.getRoot()
  root.listScenes()[0]?.traverse?.(() => {})

  // bake every mesh primitive to world space
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
  if (baked.length === 0) throw new Error(`${v.name}: no primitives`)

  // bounds → center + scale to v.size
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
  const center = [0, 1, 2].map((a) => (min[a] + max[a]) / 2)
  const scale = v.size / Math.max(...size)
  const bake = new Matrix4()
    .makeScale(scale, scale, scale)
    .multiply(new Matrix4().makeTranslation(-center[0], -center[1], -center[2]))
  const mesh = doc.createMesh(v.name)
  for (const prim of baked) {
    transformPrimitive(prim, bake.toArray())
    mesh.addPrimitive(prim)
  }
  const scene = root.getDefaultScene() ?? root.listScenes()[0]
  for (const c of scene.listChildren()) scene.removeChild(c)
  scene.addChild(doc.createNode(v.name).setMesh(mesh))
  await doc.transform(prune(), weld())

  // merge into the output doc
  mergeDocuments(out, doc)
  console.log(`${v.name}: ${size.map((s) => s.toFixed(1)).join('×')} → ${v.size}u`)
}

// merge() leaves each source in its own scene — fold all nodes into one
for (const scene of outRoot.listScenes()) {
  if (scene === outRoot.getDefaultScene()) continue
}
const scenes = outRoot.listScenes()
const main = scenes.find((s) => s.getName() === 'crates') ?? scenes[0]
for (const scene of scenes) {
  if (scene === main) continue
  for (const child of scene.listChildren()) main.addChild(child)
  scene.dispose()
}
outRoot.setDefaultScene(main)

await out.transform(
  unpartition(),
  prune(),
  dedup(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512] }),
  reorder({ encoder: MeshoptEncoder }),
  quantize(),
)
out.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({
  method: EXTMeshoptCompression.EncoderMethod.FILTER,
})
await io.write(OUT, out)
console.log(`wrote ${OUT}: ${(statSync(OUT).size / 1024).toFixed(0)} KB`)
