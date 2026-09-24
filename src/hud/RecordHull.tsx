import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, EdgesGeometry, Group, LineBasicMaterial, LineSegments, Mesh, Vector3 } from 'three'

/**
 * The hero of THE SERVICE RECORD (terminal v3, locked 2026-09-10):
 * the pilot's ACTUAL hull as a true wireframe — the same body the
 * Nilak hologram projects, but this is the living ship, drawn in the
 * record's orange, slowly turning. Its own tiny canvas exists only
 * while the drawer is open.
 */

const MODEL_URL = '/models/tachi.glb'
/** drafting lines, not triangle soup: EdgesGeometry keeps only creases
 *  past the threshold angle, which is what makes a dense mesh read as
 *  the show's schematic wireframe instead of a solid blob */
const EDGE_ANGLE = 31
const WIRE = new LineBasicMaterial({ color: '#ff9a3c', toneMapped: false, transparent: true, opacity: 0.58 })

/** EdgesGeometry over the tachi's ~140k triangles costs SECONDS of
 *  synchronous main thread. It used to run inside the component's
 *  useMemo — i.e. on EVERY drawer open, a keypress-triggered freeze
 *  (root-caused 2026-09-24). Now: one module-level cache per geometry,
 *  filled one mesh per idle slice by prewarmRecordHull() soon after
 *  boot, so by the time anyone presses L the lines already exist. */
const edgeCache = new Map<string, EdgesGeometry>()

function edgesFor(mesh: Mesh): EdgesGeometry {
  let e = edgeCache.get(mesh.geometry.uuid)
  if (!e) {
    e = new EdgesGeometry(mesh.geometry, EDGE_ANGLE)
    edgeCache.set(mesh.geometry.uuid, e)
  }
  return e
}

const idle: (cb: () => void) => void =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (cb) => (window as Window & { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback(cb, { timeout: 4000 })
    : (cb) => setTimeout(cb, 350)

/** Mounted (behind Suspense) by the drawer shortly after boot: walks the
 *  hull one mesh per idle slice so every EdgesGeometry already exists in
 *  the cache before the first L-press. Renders nothing. */
export function HullPrewarm() {
  const gltf = useGLTF(MODEL_URL)
  const started = useRef(false)
  useMemo(() => {
    if (started.current) return
    started.current = true
    const meshes: Mesh[] = []
    gltf.scene.traverse((o) => {
      if ((o as Mesh).isMesh) meshes.push(o as Mesh)
    })
    const step = (i: number) => {
      if (i >= meshes.length) return
      edgesFor(meshes[i])
      idle(() => step(i + 1))
    }
    idle(() => step(0))
  }, [gltf])
  return null
}

/** built once, reused across every drawer open */
let cachedModel: Group | null = null

function Hull() {
  const groupRef = useRef<Group>(null)
  const gltf = useGLTF(MODEL_URL)
  const model = useMemo(() => {
    if (cachedModel) return cachedModel
    const clone = gltf.scene.clone(true)
    const swaps: { mesh: Mesh; line: LineSegments }[] = []
    clone.traverse((obj) => {
      const mesh = obj as Mesh
      if (mesh.isMesh) {
        // clone() shares geometry objects, so the cache hits by uuid
        const line = new LineSegments(edgesFor(mesh), WIRE)
        line.position.copy(mesh.position)
        line.quaternion.copy(mesh.quaternion)
        line.scale.copy(mesh.scale)
        swaps.push({ mesh, line })
      }
    })
    for (const { mesh, line } of swaps) {
      mesh.visible = false
      mesh.parent?.add(line)
    }
    // auto-fit: center the hull and normalize its longest side to ~3.4
    const box = new Box3().setFromObject(clone)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const s = 3.4 / Math.max(size.x, size.y, size.z)
    clone.scale.setScalar(s)
    clone.position.copy(center).multiplyScalar(-s)
    // stand her on her drive: rotate the long axis onto Y so the hull
    // reads nose-up on the portrait glass (his call 2026-09-10)
    const orient = new Group()
    orient.add(clone)
    if (size.x >= size.y && size.x >= size.z) orient.rotation.z = -Math.PI / 2
    else if (size.z >= size.x && size.z >= size.y) orient.rotation.x = -Math.PI / 2
    const holder = new Group()
    holder.add(orient)
    cachedModel = holder
    return holder
  }, [gltf])

  useFrame(({ clock }) => {
    const g = groupRef.current
    if (!g) return
    // roll on her own long axis; a fixed lean gives the 3/4 read
    g.rotation.y = clock.elapsedTime * 0.35
    g.rotation.x = 0.16
  })

  return (
    <group ref={groupRef}>
      <primitive object={model} />
    </group>
  )
}

export function RecordHull() {
  return (
    <Canvas
      dpr={1}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      camera={{ fov: 40, position: [0, 0.6, 5.2] }}
      style={{ background: 'transparent' }}
    >
      <Hull />
    </Canvas>
  )
}

useGLTF.preload(MODEL_URL)
