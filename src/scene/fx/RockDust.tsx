import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  TetrahedronGeometry,
  Vector3,
} from 'three'

/**
 * FRACTURE, NEVER FIREWORKS (docs/the-storm.md pass 4). Rock and ice
 * breaking in vacuum do not burn: a burst is dark shards flying apart
 * plus a brief cold glitter of ice crystal catching the light. No
 * fireball, no bloom — the glitter's colour stays below 1.0 by design.
 */

const BURSTS = 12
const SHARDS = 9
const LIFE = 1.1

interface Burst {
  start: number
  scale: number
  icy: boolean
  position: Vector3
  dirs: Vector3[]
  spins: number[]
}

const queue: { position: Vector3; scale: number; icy: boolean }[] = []

/** scale ~1 = a fractured boulder; icy = ice glitter in the spray */
export function spawnRockBurst(position: Vector3, scale = 1, icy = false): void {
  queue.push({ position: position.clone(), scale, icy })
}

const _m4 = new Matrix4()
const _q = new Quaternion()
const _s = new Vector3()
const _p = new Vector3()
const _dummy = new Object3D()

export function RockDust() {
  const shardRef = useRef<InstancedMesh>(null)
  const glintRef = useRef<InstancedMesh>(null)

  const bursts = useMemo<Burst[]>(
    () =>
      Array.from({ length: BURSTS }, () => ({
        start: -10,
        scale: 1,
        icy: false,
        position: new Vector3(),
        dirs: Array.from({ length: SHARDS }, () => new Vector3()),
        spins: Array.from({ length: SHARDS }, () => 0),
      })),
    [],
  )

  const shardGeom = useMemo(() => new TetrahedronGeometry(1, 0), [])
  const shardMat = useMemo(
    () => new MeshBasicMaterial({ color: '#3a4149', transparent: true, opacity: 0.9 }),
    [],
  )
  const glintMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#9fc4dd',
        transparent: true,
        opacity: 0.5,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [],
  )

  useFrame(() => {
    const now = performance.now() / 1000
    while (queue.length) {
      const req = queue.shift()!
      let slot = bursts[0]
      for (const b of bursts) if (now - b.start > now - slot.start) slot = b
      for (const b of bursts) {
        if (now - b.start > LIFE) {
          slot = b
          break
        }
      }
      slot.start = now
      slot.scale = req.scale
      slot.icy = req.icy
      slot.position.copy(req.position)
      for (let i = 0; i < SHARDS; i++) {
        slot.dirs[i]
          .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
          .normalize()
          .multiplyScalar(9 + Math.random() * 16)
        slot.spins[i] = Math.random() * 7
      }
    }

    const shards = shardRef.current
    const glints = glintRef.current
    if (!shards || !glints) return
    let ns = 0
    let ng = 0
    for (const b of bursts) {
      const age = now - b.start
      if (age < 0 || age > LIFE) continue
      const k = age / LIFE
      const fade = 1 - k
      for (let i = 0; i < SHARDS; i++) {
        // dark shards: fly straight, tumble, shrink away
        _dummy.rotation.set(b.spins[i] + age * 3, b.spins[i] * 2, age * 2)
        _q.setFromEuler(_dummy.rotation)
        _p.copy(b.position).addScaledVector(b.dirs[i], age * b.scale)
        _s.setScalar(Math.max(0.01, b.scale * (0.5 + (i % 3) * 0.22) * fade))
        _m4.compose(_p, _q, _s)
        shards.setMatrixAt(ns++, _m4)
        // ice glitter rides some shards, brief and cold
        if (b.icy && i % 2 === 0 && k < 0.6) {
          _p.copy(b.position).addScaledVector(b.dirs[i], age * b.scale * 1.1)
          _s.setScalar(b.scale * 0.7 * (1 - k / 0.6))
          _m4.compose(_p, _q, _s)
          glints.setMatrixAt(ng++, _m4)
        }
      }
    }
    shards.count = ns
    glints.count = ng
    shards.instanceMatrix.needsUpdate = true
    glints.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <instancedMesh
        ref={shardRef}
        args={[shardGeom, shardMat, BURSTS * SHARDS]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={glintRef}
        args={[shardGeom, glintMat, BURSTS * SHARDS]}
        frustumCulled={false}
      />
    </>
  )
}
