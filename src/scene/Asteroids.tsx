import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Euler,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three'
import { QUALITY } from '../config/quality'

interface BeltProps {
  /** System-space center of the belt */
  position: [number, number, number]
  radius: number
  width: number
  thickness: number
  seed: number
}

/** One instanced rock belt orbiting a star, rotating slowly as a whole. */
function Belt({ position, radius, width, thickness, seed }: BeltProps) {
  const groupRef = useRef<Group>(null)
  const count = QUALITY.asteroidCount

  const { geometry, material, matrices } = useMemo(() => {
    // Lumpy rock: jittered icosahedron
    const geometry = new IcosahedronGeometry(1, 1)
    const positions = geometry.getAttribute('position')
    let s = seed * 7919 + 17
    const rng = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      return s / 0x7fffffff
    }
    const jittered = new Map<string, number>()
    for (let i = 0; i < positions.count; i++) {
      const key = `${positions.getX(i).toFixed(3)}|${positions.getY(i).toFixed(3)}|${positions.getZ(i).toFixed(3)}`
      if (!jittered.has(key)) jittered.set(key, 0.72 + rng() * 0.55)
      const f = jittered.get(key)!
      positions.setXYZ(i, positions.getX(i) * f, positions.getY(i) * f, positions.getZ(i) * f)
    }
    geometry.computeVertexNormals()

    const material = new MeshStandardMaterial({
      color: '#6b6560',
      metalness: 0.15,
      roughness: 0.9,
      flatShading: true,
    })

    const matrices: Matrix4[] = []
    const pos = new Vector3()
    const quat = new Quaternion()
    const scale = new Vector3()
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2
      const r = radius + (rng() - 0.5) * width
      pos.set(
        Math.cos(angle) * r,
        (rng() - 0.5) * thickness,
        Math.sin(angle) * r,
      )
      quat.setFromEuler(new Euler(rng() * 6.28, rng() * 6.28, rng() * 6.28))
      const size = 3 + rng() * rng() * 16
      scale.setScalar(size)
      matrices.push(new Matrix4().compose(pos.clone(), quat.clone(), scale.clone()))
    }
    return { geometry, material, matrices }
  }, [count, radius, width, thickness, seed])

  const meshRef = useRef<InstancedMesh>(null)

  useMemo(() => {
    // set matrices on first render commit via ref callback below
  }, [])

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.004
  })

  return (
    <group position={position} ref={groupRef}>
      <instancedMesh
        ref={(mesh) => {
          meshRef.current = mesh
          if (mesh && !mesh.userData.filled) {
            matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
            mesh.instanceMatrix.needsUpdate = true
            mesh.userData.filled = true
          }
        }}
        args={[geometry, material, count]}
        frustumCulled={false}
      />
    </group>
  )
}

/** Asteroid belts around two systems plus a free-floating deep-space field. */
export function Asteroids() {
  return (
    <>
      {/* Projects system outer belt */}
      <Belt position={[0, 0, -10500]} radius={5300} width={700} thickness={180} seed={3} />
      {/* Work system inner belt */}
      <Belt position={[-15800, 440, -16300]} radius={2100} width={420} thickness={120} seed={7} />
      {/* Drifting field between spawn and Projects */}
      <Belt position={[2600, -140, -4800]} radius={900} width={900} thickness={420} seed={11} />
    </>
  )
}
