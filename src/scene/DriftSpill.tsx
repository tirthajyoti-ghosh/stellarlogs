import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Group, Object3D, Vector3 } from 'three'
import { shipRig } from '../state/shipRig'
import { registerHudLabel } from '../hud/hudState'
import { DRIFT_POI } from '../config/pois'

/**
 * THE SPILL FIELD (docs/the-neighborhood.md — the Drift's toy).
 * A freighter lost a container stack on approach; salvage rights are
 * disputed, so it just… floats there, and everyone flies through it.
 * Plow your hull through the field and the crates shoulder aside —
 * real pushes, no damage (toy law), with a whisper-weak drift home so
 * the field slowly re-forms after you've made a mess of it.
 * Borrowed body: the containers are the manhunt's real crates.glb.
 */

const CRATES_URL = '/models/crates.glb'
const CENTER = new Vector3(
  DRIFT_POI.position[0] + 750,
  DRIFT_POI.position[1] + 60,
  DRIFT_POI.position[2] + 980,
)
const COUNT = 26
const FIELD_R = 220
const PUSH_R = 26
const PUSH_V = 14

interface Crate {
  home: Vector3
  pos: Vector3
  vel: Vector3
  angle: Vector3
  spin: Vector3
  scale: number
}

const _v = new Vector3()

export function DriftSpill() {
  const gltf = useGLTF(CRATES_URL)
  const groupRef = useRef<Group>(null)

  const { crates, models } = useMemo(() => {
    let sd = 7741
    const rng = () => {
      sd = (sd * 1103515245 + 12345) & 0x7fffffff
      return sd / 0x7fffffff
    }
    const byName: Record<string, Object3D> = {}
    gltf.scene.traverse((o) => {
      byName[o.name] = o
    })
    const mix = ['container', 'crate', 'box', 'ammo']
    const crates: Crate[] = []
    const models: Object3D[] = []
    for (let i = 0; i < COUNT; i++) {
      const src = byName[mix[i % mix.length]]
      if (!src) continue
      const c = src.clone(true)
      models.push(c)
      // a loose stack: denser core, stragglers outward
      const a = rng() * Math.PI * 2
      const r = Math.pow(rng(), 0.6) * FIELD_R
      const home = new Vector3(
        CENTER.x + Math.cos(a) * r,
        CENTER.y + (rng() - 0.5) * 90,
        CENTER.z + Math.sin(a) * r,
      )
      crates.push({
        home,
        pos: home.clone(),
        vel: new Vector3(),
        angle: new Vector3(rng() * 6, rng() * 6, rng() * 6),
        spin: new Vector3((rng() - 0.5) * 0.3, (rng() - 0.5) * 0.24, (rng() - 0.5) * 0.2),
        scale: 0.9 + rng() * 0.5,
      })
    }
    return { crates, models }
  }, [gltf])

  useEffect(() => {
    const off = registerHudLabel({
      id: 'poi-spill',
      name: 'CARGO SPILL',
      color: '#8fb8d8',
      kind: 'poi',
      position: CENTER,
      yOffset: 80,
      el: null,
      detail: 'SALVAGE DISPUTED — MIND YOUR HULL',
      jumpStandoff: 500,
    })
    return off
  }, [])

  useFrame((_, dt) => {
    const group = groupRef.current
    if (!group) return
    // sleep the whole field beyond earshot
    const near = shipRig.position.distanceTo(CENTER) < FIELD_R + 900
    group.visible = near
    if (!near) return
    for (let i = 0; i < crates.length; i++) {
      const c = crates[i]
      const m = group.children[i]
      if (!m) continue
      // the plow: your hull shoulders crates aside, no harm done
      _v.copy(c.pos).sub(shipRig.position)
      const d = _v.length()
      if (d < PUSH_R && d > 0.01) {
        _v.multiplyScalar(1 / d)
        c.vel.addScaledVector(_v, (PUSH_V * (PUSH_R - d)) / PUSH_R)
        c.spin.set((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1)
      }
      // whisper-weak leash home + gentle damping: the field re-forms
      _v.copy(c.home).sub(c.pos)
      c.vel.addScaledVector(_v, 0.004 * dt * 60)
      c.vel.multiplyScalar(1 - 0.15 * dt)
      c.pos.addScaledVector(c.vel, dt)
      c.angle.x += c.spin.x * dt
      c.angle.y += c.spin.y * dt
      c.angle.z += c.spin.z * dt
      m.position.copy(c.pos)
      m.rotation.set(c.angle.x, c.angle.y, c.angle.z)
      m.scale.setScalar(c.scale)
    }
  })

  return (
    <group ref={groupRef}>
      {models.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </group>
  )
}

useGLTF.preload(CRATES_URL)
