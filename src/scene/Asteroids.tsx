import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import {
  BufferGeometry,
  Euler,
  Group,
  Material,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
} from 'three'
import { QUALITY } from '../config/quality'

const MODEL_URL = '/models/asteroids.glb'

export interface RockVariant {
  geometry: BufferGeometry
  material: Material
  /** Rotation/scale of the source node (carries meshopt dequantization) plus
   *  recentering — WITHOUT the pack's display-arrangement translation. */
  base: Matrix4
  /** Divides out the variant's world size so scales below are world units. */
  norm: number
}

/**
 * "Asteroids Pack (metallic version)" by SebastianSosnowski (Sketchfab,
 * CC Attribution) — 10 photoreal PBR rocks used as instancing variants.
 * Quantized geometry: transforms must stay in matrices, never be baked into
 * attributes. Credit in the welcome card, SEO mirror and README.
 */
export function useRockVariants(): RockVariant[] {
  const gltf = useGLTF(MODEL_URL)
  return useMemo(() => {
    gltf.scene.updateMatrixWorld(true)
    const variants: RockVariant[] = []
    const pos = new Vector3()
    const quat = new Quaternion()
    const scl = new Vector3()
    gltf.scene.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      mesh.matrixWorld.decompose(pos, quat, scl)
      const rs = new Matrix4().compose(new Vector3(), quat, scl)
      const g = mesh.geometry
      if (!g.boundingBox) g.computeBoundingBox()
      const center = g.boundingBox!.getCenter(new Vector3())
      const size = g.boundingBox!.getSize(new Vector3()).multiply(scl)
      const base = rs.multiply(new Matrix4().makeTranslation(-center.x, -center.y, -center.z))
      variants.push({
        geometry: g,
        material: Array.isArray(mesh.material) ? mesh.material[0] : mesh.material,
        base,
        norm: 1 / Math.max(size.x, size.y, size.z, 1e-6),
      })
    })
    return variants
  }, [gltf])
}

interface BeltProps {
  /** System-space center of the belt */
  position: [number, number, number]
  radius: number
  width: number
  thickness: number
  seed: number
}

/** One belt: instanced real rocks spread across the variants, slow rotation. */
function Belt({ position, radius, width, thickness, seed }: BeltProps) {
  const groupRef = useRef<Group>(null)
  const variants = useRockVariants()
  const count = QUALITY.asteroidCount

  const perVariant = useMemo(() => {
    let s = seed * 7919 + 17
    const rng = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      return s / 0x7fffffff
    }
    const buckets: Matrix4[][] = variants.map(() => [])
    const pos = new Vector3()
    const quat = new Quaternion()
    const scale = new Vector3()
    const place = new Matrix4()
    for (let i = 0; i < count; i++) {
      const v = Math.floor(rng() * variants.length)
      const angle = rng() * Math.PI * 2
      const r = radius + (rng() - 0.5) * width
      pos.set(Math.cos(angle) * r, (rng() - 0.5) * thickness, Math.sin(angle) * r)
      quat.setFromEuler(new Euler(rng() * 6.28, rng() * 6.28, rng() * 6.28))
      const size = (3 + rng() * rng() * 16) * variants[v].norm
      scale.setScalar(size)
      place.compose(pos, quat, scale)
      buckets[v].push(place.clone().multiply(variants[v].base))
    }
    return buckets
  }, [count, radius, width, thickness, seed, variants])

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.004
  })

  return (
    <group position={position} ref={groupRef}>
      {perVariant.map(
        (matrices, v) =>
          matrices.length > 0 && (
            <instancedMesh
              key={v}
              ref={(mesh) => {
                if (mesh && !mesh.userData.filled) {
                  matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
                  mesh.instanceMatrix.needsUpdate = true
                  mesh.userData.filled = true
                }
              }}
              args={[variants[v].geometry, variants[v].material, matrices.length]}
              frustumCulled={false}
            />
          ),
      )}
    </group>
  )
}

function Belts() {
  return (
    <>
      {/* Projects system outer belt */}
      <Belt position={[0, 0, -4200]} radius={1800} width={300} thickness={110} seed={3} />
      {/* Work system outer belt */}
      <Belt position={[-5200, 430, -3900]} radius={1750} width={280} thickness={100} seed={7} />
      {/* Drifting rocks around the defense-drill site */}
      <Belt position={[-3400, -100, 200]} radius={550} width={450} thickness={240} seed={11} />
    </>
  )
}

/** Asteroid belts around two systems plus a free-floating deep-space field. */
export function Asteroids() {
  return (
    <Suspense fallback={null}>
      <Belts />
    </Suspense>
  )
}

useGLTF.preload(MODEL_URL)
