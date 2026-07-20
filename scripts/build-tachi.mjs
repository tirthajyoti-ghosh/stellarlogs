/**
 * Offline Tachi build: turns the ORIGINAL Sketchfab GLB (float precision,
 * 355 flat nodes) into the rigged, compressed model the site ships.
 *
 * Output hierarchy:
 *   scene
 *   ├── hull_<material>        joined static geometry, world space (~4 meshes)
 *   └── pdc_1 .. pdc_6         turret pivot at the ball-mount sphere center
 *       └── pdc_N_ball         joined movable gun assembly (pivot-local)
 *           └── pdc_N_barrels  joined Gatling barrels (spin child, pivot-local)
 *
 * Each pivot node carries extras: { restDir: [x,y,z] } — the turret's rest aim
 * direction in pivot-local (= model) space, for arc clamping + barrel spin axis.
 *
 * Turret membership is decided by NEAREST SPHERE CENTER, not name suffixes —
 * the source naming has quirks (bare `pdc_gun_details3`, .001–.006 elsewhere).
 *
 * All joins/bakes happen here on float32 data; quantization (meshopt) runs
 * LAST. Never transform quantized attributes at runtime.
 *
 * Usage: node scripts/build-tachi.mjs <input.glb> [output.glb]
 * Source model: "MCRN Tachi [Expanse TV Show]" by Jakub.Vildomec (Sketchfab,
 * uid 76fc983ab08c449b9042491a00e621cf, CC BY 4.0).
 */
import { NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, KHRMeshQuantization, EXTTextureWebP } from '@gltf-transform/extensions'
import {
  dedup,
  joinPrimitives,
  prune,
  reorder,
  quantize,
  textureCompress,
  transformPrimitive,
  weld,
} from '@gltf-transform/functions'
import { MeshoptEncoder } from 'meshoptimizer'
import sharp from 'sharp'
import { Matrix4, Vector3 } from 'three'

const [, , INPUT, OUTPUT = 'public/models/tachi.glb'] = process.argv
if (!INPUT) {
  console.error('usage: node scripts/build-tachi.mjs <input.glb> [output.glb]')
  process.exit(1)
}

/** Movable gun-assembly part families (everything else pdc_* stays in hull). */
const BALL_FAMILIES = [
  'pdc_gun_sphere',
  'pdc_gun_body',
  'pdc_gun_detail',
  'pdc_gun_details',
  'pdc_gun_details3',
  'pdc_gun_base_details2',
  'pdc_gun_holders',
  'pdc_gun_hodlers_details',
  'pdc_gun_ammobox',
  'pdc_gun_ammobox_details',
  'pdc_gun_swivel1',
  'pdc_gun_swivel2',
  'pdc_gun_barrels_holder',
]
const BARREL_FAMILIES = ['pdc_gun_barrels']
// NOT movable: pdc_gun_sphere_holder (the socket) and all pdc_bay_* parts.

const family = (name) =>
  name
    .replace(/_(?:PDC|Primary|Secondary|Texts)_0$/, '')
    .replace(/\.\d+$/, '')

await MeshoptEncoder.ready
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization, EXTTextureWebP])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
const doc = await io.read(INPUT)
const root = doc.getRoot()
const scene = root.getDefaultScene() ?? root.listScenes()[0]

// ---------- gather world transforms of every mesh node ----------
const meshNodes = []
for (const node of root.listNodes()) {
  if (node.getMesh()) meshNodes.push(node)
}
console.log(`mesh nodes: ${meshNodes.length}`)

const worldOf = (node) => new Matrix4().fromArray(node.getWorldMatrix())

const centerOf = (node) => {
  // world-space center of the node's mesh bbox
  const mesh = node.getMesh()
  const min = new Vector3(Infinity, Infinity, Infinity)
  const max = new Vector3(-Infinity, -Infinity, -Infinity)
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION')
    const [mn, mx] = [pos.getMinNormalized([]), pos.getMaxNormalized([])]
    min.min(new Vector3(...mn))
    max.max(new Vector3(...mx))
  }
  return min.add(max).multiplyScalar(0.5).applyMatrix4(worldOf(node))
}

// ---------- turret pivots from the six sphere parts ----------
const spheres = meshNodes.filter((n) => family(n.getName()) === 'pdc_gun_sphere')
if (spheres.length !== 6) throw new Error(`expected 6 pdc_gun_sphere nodes, got ${spheres.length}`)
const pivots = spheres.map((n) => centerOf(n))
const barrels = meshNodes.filter((n) => family(n.getName()) === 'pdc_gun_barrels')
if (barrels.length !== 6) throw new Error(`expected 6 pdc_gun_barrels nodes, got ${barrels.length}`)

const nearestPivot = (p) => {
  let best = 0
  let bestD = Infinity
  pivots.forEach((c, i) => {
    const d = c.distanceTo(p)
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  return best
}

// Rest aim direction per turret: the Gatling cluster is elongated along the
// barrel axis, and the muzzle end sits farther from the ball pivot than the
// breech end — so take the barrels' world bbox long axis, pick the far end.
const bboxOf = (node) => {
  const mesh = node.getMesh()
  const m = worldOf(node)
  const min = new Vector3(Infinity, Infinity, Infinity)
  const max = new Vector3(-Infinity, -Infinity, -Infinity)
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION')
    const lo = pos.getMinNormalized([])
    const hi = pos.getMaxNormalized([])
    for (let xi = 0; xi < 2; xi++)
      for (let yi = 0; yi < 2; yi++)
        for (let zi = 0; zi < 2; zi++) {
          const corner = new Vector3(xi ? hi[0] : lo[0], yi ? hi[1] : lo[1], zi ? hi[2] : lo[2]).applyMatrix4(m)
          min.min(corner)
          max.max(corner)
        }
  }
  return { min, max }
}
const restDirs = pivots.map((c, i) => {
  const b = barrels.find((n) => nearestPivot(centerOf(n)) === i)
  if (!b) throw new Error(`turret ${i}: no barrels found`)
  const { min, max } = bboxOf(b)
  const size = max.clone().sub(min)
  const axis = new Vector3(0, 0, 0)
  if (size.x >= size.y && size.x >= size.z) axis.set(1, 0, 0)
  else if (size.y >= size.z) axis.set(0, 1, 0)
  else axis.set(0, 0, 1)
  const center = min.clone().add(max).multiplyScalar(0.5)
  const half = axis.clone().multiplyScalar(axis.dot(size) / 2)
  const endA = center.clone().add(half)
  const endB = center.clone().sub(half)
  const muzzle = endA.distanceTo(c) >= endB.distanceTo(c) ? endA : endB
  return muzzle.sub(c).normalize()
})

// ---------- bucket every mesh node ----------
/** buckets: hull(by material), per-turret ball, per-turret barrels */
const hullByMaterial = new Map()
const turretBall = Array.from({ length: 6 }, () => [])
const turretBarrels = Array.from({ length: 6 }, () => [])

for (const node of meshNodes) {
  const fam = family(node.getName())
  const isBall = BALL_FAMILIES.includes(fam)
  const isBarrel = BARREL_FAMILIES.includes(fam)
  if (isBall || isBarrel) {
    const t = nearestPivot(centerOf(node))
    ;(isBarrel ? turretBarrels : turretBall)[t].push(node)
  } else {
    for (const prim of node.getMesh().listPrimitives()) {
      const mat = prim.getMaterial()
      if (!hullByMaterial.has(mat)) hullByMaterial.set(mat, [])
      hullByMaterial.get(mat).push({ node, prim })
    }
  }
}
console.log(
  `hull materials: ${hullByMaterial.size}; per-turret ball parts: ${turretBall.map((a) => a.length).join(',')}; barrels: ${turretBarrels.map((a) => a.length).join(',')}`,
)

// ---------- helpers to bake + join primitives ----------
/** Clone prims, bake `matrix` into them, join into one prim per material. */
function bakeAndJoin(entries, getMatrix) {
  const byMat = new Map()
  for (const { node, prim } of entries) {
    const clone = prim.clone()
    // strip unsupported morph/skin leftovers and extra uv sets for safety
    transformPrimitive(clone, getMatrix(node).toArray())
    const mat = clone.getMaterial()
    if (!byMat.has(mat)) byMat.set(mat, [])
    byMat.get(mat).push(clone)
  }
  const prims = []
  for (const [, list] of byMat) {
    prims.push(list.length === 1 ? list[0] : joinPrimitives(list))
  }
  return prims
}

const asEntries = (nodes) =>
  nodes.flatMap((node) => node.getMesh().listPrimitives().map((prim) => ({ node, prim })))

// ---------- build the new scene ----------
// New hull nodes (world-space bake, identity node)
const newNodes = []
let hullIdx = 0
for (const [mat, entries] of hullByMaterial) {
  const prims = bakeAndJoin(entries, (node) => worldOf(node))
  const mesh = doc.createMesh(`hull_${mat?.getName() ?? hullIdx}`)
  for (const p of prims) mesh.addPrimitive(p)
  const node = doc.createNode(`hull_${hullIdx++}`).setMesh(mesh)
  newNodes.push(node)
}

// Turret rigs
for (let t = 0; t < 6; t++) {
  const pivot = pivots[t]
  const toLocal = new Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z)
  const localBake = (node) => toLocal.clone().multiply(worldOf(node))

  const ballPrims = bakeAndJoin(asEntries(turretBall[t]), localBake)
  const ballMesh = doc.createMesh(`pdc_${t + 1}_ball_mesh`)
  for (const p of ballPrims) ballMesh.addPrimitive(p)
  const ballNode = doc.createNode(`pdc_${t + 1}_ball`).setMesh(ballMesh)

  const barrelPrims = bakeAndJoin(asEntries(turretBarrels[t]), localBake)
  const barrelMesh = doc.createMesh(`pdc_${t + 1}_barrels_mesh`)
  for (const p of barrelPrims) barrelMesh.addPrimitive(p)
  const barrelNode = doc.createNode(`pdc_${t + 1}_barrels`).setMesh(barrelMesh)

  ballNode.addChild(barrelNode)

  const pivotNode = doc
    .createNode(`pdc_${t + 1}`)
    .setTranslation([pivot.x, pivot.y, pivot.z])
    .setExtras({ restDir: restDirs[t].toArray() })
  pivotNode.addChild(ballNode)
  newNodes.push(pivotNode)
}

// Detach every old node from the scene, attach the new ones
for (const child of scene.listChildren()) scene.removeChild(child)
for (const n of newNodes) scene.addChild(n)

// Drop everything unreferenced, then compress
await doc.transform(prune(), dedup(), weld())

await doc.transform(
  textureCompress({ encoder: sharp, targetFormat: 'webp' }),
  reorder({ encoder: MeshoptEncoder }),
  quantize(),
)
root.listExtensionsUsed().forEach((e) => e.extensionName) // noop, keeps list warm
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({
  method: EXTMeshoptCompression.EncoderMethod.FILTER,
})

await io.write(OUTPUT, doc)

// ---------- report ----------
const { statSync } = await import('node:fs')
const outMeshes = root.listMeshes().length
const outNodes = root.listNodes().length
const prims = root.listMeshes().reduce((s, m) => s + m.listPrimitives().length, 0)
console.log(
  `wrote ${OUTPUT}: ${(statSync(OUTPUT).size / 1e6).toFixed(2)}MB, ${outNodes} nodes, ${outMeshes} meshes, ${prims} draw calls`,
)
for (let t = 0; t < 6; t++) {
  console.log(
    `  pdc_${t + 1} pivot=(${pivots[t].toArray().map((v) => v.toFixed(0)).join(',')}) restDir=(${restDirs[t].toArray().map((v) => v.toFixed(2)).join(',')})`,
  )
}
