/**
 * Build the NILAK wreck from "Cargo Hauler" by NekoKuroHB (Sketchfab,
 * CC BY 4.0).
 *
 *   node scripts/build-wreck.mjs <src scene.gltf> <out nilak.glb>
 *
 * Surgery: bake to world space; DROP the glass (blown out) and chairs;
 * SPLIT the aft tank pod off the tank/valve/support meshes (triangle filter
 * along the long axis) into a separate 'pod' node — the severed section that
 * drifts beside the hull; DARKEN every material to a cold dead palette;
 * simplify; normalize to origin-centered, long axis = X, length 72u —
 * Canterbury-class: ~11× the player's gunship, the way an ice hauler
 * should dwarf a corvette. Output nodes: 'hull' + 'pod'.
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
const DROP = ['Glass', 'Chair01', 'Chair02'] // material names to remove
const SPLIT_MATERIALS = ['Tank', 'TankValve', 'TankSuport']
const POD_CUT = 0.72 // fraction along the long axis: beyond this → severed pod

await MeshoptEncoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
const doc = await io.read(SRC)
const root = doc.getRoot()
const scene = root.getDefaultScene() ?? root.listScenes()[0]

// ---- bake all primitives to world space, collect with material names ----
const baked = []
for (const node of root.listNodes()) {
  const mesh = node.getMesh()
  if (!mesh) continue
  const wm = node.getWorldMatrix()
  for (const prim of mesh.listPrimitives()) {
    const matName = prim.getMaterial()?.getName() ?? ''
    if (DROP.includes(matName)) continue
    const clone = prim.clone()
    transformPrimitive(clone, wm)
    baked.push({ prim: clone, matName })
  }
}
for (const c of scene.listChildren()) scene.removeChild(c)

// ---- global bounds + long axis ----
const min = [Infinity, Infinity, Infinity]
const max = [-Infinity, -Infinity, -Infinity]
for (const { prim } of baked) {
  const arr = prim.getAttribute('POSITION').getArray()
  for (let i = 0; i < arr.length; i += 3)
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], arr[i + a])
      max[a] = Math.max(max[a], arr[i + a])
    }
}
const size = [0, 1, 2].map((a) => max[a] - min[a])
const axis = size.indexOf(Math.max(...size))
const cut = min[axis] + size[axis] * POD_CUT
console.log(
  `dims ${size.map((v) => v.toFixed(1)).join(' × ')}, long axis ${'XYZ'[axis]}, pod cut at ${POD_CUT}`,
)

/** Split a primitive's triangles at the cut plane → [nearPrim, farPrim]. */
function splitPrim(prim) {
  const pos = prim.getAttribute('POSITION').getArray()
  const indices = prim.getIndices()
  const idx = indices ? indices.getArray() : null
  const triCount = (idx ? idx.length : pos.length / 3) / 3
  const near = []
  const far = []
  for (let t = 0; t < triCount; t++) {
    const i0 = idx ? idx[t * 3] : t * 3
    const i1 = idx ? idx[t * 3 + 1] : t * 3 + 1
    const i2 = idx ? idx[t * 3 + 2] : t * 3 + 2
    const centroid = (pos[i0 * 3 + axis] + pos[i1 * 3 + axis] + pos[i2 * 3 + axis]) / 3
    ;(centroid > cut ? far : near).push(i0, i1, i2)
  }
  const make = (list) => {
    if (list.length === 0) return null
    const p = prim.clone()
    const acc = doc
      .createAccessor()
      .setType('SCALAR')
      .setArray(new Uint32Array(list))
    p.setIndices(acc)
    return p
  }
  return [make(near), make(far)]
}

const hullMesh = doc.createMesh('hull')
const podMesh = doc.createMesh('pod')
for (const { prim, matName } of baked) {
  if (SPLIT_MATERIALS.includes(matName)) {
    const [nearPrim, farPrim] = splitPrim(prim)
    if (nearPrim) hullMesh.addPrimitive(nearPrim)
    if (farPrim) podMesh.addPrimitive(farPrim)
    prim.dispose()
  } else {
    hullMesh.addPrimitive(prim)
  }
}
scene.addChild(doc.createNode('hull').setMesh(hullMesh))
scene.addChild(doc.createNode('pod').setMesh(podMesh))

// ---- dead-ship materials: dark, matte, no lights left burning. A wreck
// needs no normal/roughness detail — baseColor only keeps the file small ----
for (const material of root.listMaterials()) {
  const base = material.getBaseColorFactor()
  material.setBaseColorFactor([base[0] * 0.52, base[1] * 0.5, base[2] * 0.48, base[3]])
  material.setRoughnessFactor(1)
  material.setMetallicFactor(Math.min(0.6, material.getMetallicFactor()))
  material.setEmissiveFactor([0, 0, 0])
  material.setNormalTexture(null)
  material.setMetallicRoughnessTexture(null)
  material.setOcclusionTexture(null)
  material.setEmissiveTexture(null)
}

await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.15, error: 0.008 }),
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
for (const mesh of [hullMesh, podMesh])
  for (const prim of mesh.listPrimitives()) transformPrimitive(prim, bake.toArray())

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
let prims = 0
for (const mesh of [hullMesh, podMesh])
  for (const prim of mesh.listPrimitives()) {
    verts += prim.getAttribute('POSITION').getCount()
    prims++
  }
console.log(`wrote ${OUT}: ${statSync(OUT).size} bytes, ${verts} verts, ${prims} prims`)
