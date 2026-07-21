import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { prune, dedup, textureCompress, flatten } from '@gltf-transform/functions'
import sharp from 'sharp'
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read(process.argv[2])
const root = doc.getRoot()
const scene = root.getDefaultScene() ?? root.listScenes()[0]
const KEEP = process.argv[4] // node name
let keepNode = null
for (const n of root.listNodes()) if (n.getName() === KEEP && n.getMesh()) keepNode = n
if (!keepNode) throw new Error('node not found')
// world matrix
import { Matrix4 } from 'three'
const wm = new Matrix4().fromArray(keepNode.getWorldMatrix())
// detach everything, attach just this node at root with baked transform
for (const c of scene.listChildren()) scene.removeChild(c)
const holder = doc.createNode('torpedo').setMatrix(wm.toArray())
holder.setMesh(keepNode.getMesh())
scene.addChild(holder)
await doc.transform(prune(), dedup(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512] }))
await io.write(process.argv[3], doc)
const { statSync } = await import('node:fs')
console.log('wrote', process.argv[3], statSync(process.argv[3]).size, 'bytes')
