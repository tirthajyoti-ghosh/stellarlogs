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

function Hull() {
  const groupRef = useRef<Group>(null)
  const gltf = useGLTF(MODEL_URL)
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true)
    const swaps: { mesh: Mesh; line: LineSegments }[] = []
    clone.traverse((obj) => {
      const mesh = obj as Mesh
      if (mesh.isMesh) {
        const line = new LineSegments(new EdgesGeometry(mesh.geometry, EDGE_ANGLE), WIRE)
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
    const s = 3.1 / Math.max(size.x, size.y, size.z)
    clone.scale.setScalar(s)
    clone.position.copy(center).multiplyScalar(-s)
    const holder = new Group()
    holder.add(clone)
    return holder
  }, [gltf])

  useFrame(({ clock }) => {
    const g = groupRef.current
    if (!g) return
    g.rotation.y = clock.elapsedTime * 0.35
    g.rotation.x = Math.sin(clock.elapsedTime * 0.21) * 0.14
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
