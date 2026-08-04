/**
 * Meshopt/quantize pass for models that missed the pipeline, and error-bounded
 * decimation for the two heavy landmarks. Offline only, per the house law:
 * quantization is never baked at runtime, and EXT_meshopt_compression goes on
 * LAST.
 *
 *   node scripts/compress-models.mjs <in.glb> <out.glb> [simplifyRatio]
 *
 * With no ratio: reorder + quantize + meshopt only — geometry is bit-identical
 * in shape, just smaller on the wire. With a ratio: weld + error-bounded
 * simplify first (error 0.0008 keeps silhouettes; verify by eye in shipyard —
 * the Delight Line outranks the byte count).
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions'
import { prune, dedup, weld, simplify, reorder, quantize } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer'
import { statSync } from 'node:fs'

const [, , SRC, OUT, RATIO_ARG] = process.argv
const RATIO = RATIO_ARG ? Number(RATIO_ARG) : 0

await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })

const doc = await io.read(SRC)
const before = statSync(SRC).size

const transforms = [dedup(), prune()]
if (RATIO > 0) {
  transforms.push(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: 0.0008 }))
}
transforms.push(reorder({ encoder: MeshoptEncoder }), quantize())
await doc.transform(...transforms)
doc.createExtension(EXTMeshoptCompression).setRequired(true)

await io.write(OUT, doc)
const after = statSync(OUT).size
console.log(`${SRC} ${(before / 1e6).toFixed(2)}MB -> ${(after / 1e6).toFixed(2)}MB${RATIO ? ` (simplify ${RATIO})` : ''}`)
