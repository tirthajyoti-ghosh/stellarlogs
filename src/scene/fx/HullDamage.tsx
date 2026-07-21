import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import {
  AdditiveBlending,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  NormalBlending,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Sprite,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
} from 'three'
import { shipRig } from '../../state/shipRig'

/**
 * Hull damage as ACTUAL damage, not floating orbs: every torpedo hit opens a
 * breach PINNED to the hull (ship-local space, computed from the incoming
 * velocity) that continuously vents vapor — the classic Expanse "we're
 * leaking atmosphere" read — with tiny hot embers and an electrical arc
 * flickering at the breach itself. Particle textures from Kenney's Particle
 * Pack (CC0). Two instanced-quad systems + two sprites — 4 draw calls total.
 */

const MAX_VENTS = 2
const SMOKE_N = 56
const EMBER_N = 24
/** Approximate hull half-extents in rig-local space (nose = -Z, no roll) */
const HULL = { x: 1.15, y: 0.95, z: 3.25 }

interface Vent {
  active: boolean
  localPos: Vector3
  localDir: Vector3
}

const _q = new Quaternion()
const _v = new Vector3()
const _w = new Vector3()

export const damageFx = {
  vents: Array.from({ length: MAX_VENTS }, (): Vent => ({
    active: false,
    localPos: new Vector3(),
    localDir: new Vector3(),
  })),
  /** 0..1 — scales emission with how wounded the ship is */
  severity: 0,
  /** Open a breach where the ordnance came in (worldVel = incoming velocity) */
  add(worldVel: { x: number; y: number; z: number }): void {
    const vent =
      this.vents.find((v) => !v.active) ?? this.vents[Math.floor(Math.random() * MAX_VENTS)]
    // Direction the hit came FROM, in rig-local space (with a little scatter)
    _q.copy(shipRig.quaternion).invert()
    _v.set(worldVel.x, worldVel.y, worldVel.z)
      .normalize()
      .multiplyScalar(-1)
      .applyQuaternion(_q)
    _v.x += (Math.random() - 0.5) * 0.4
    _v.y += (Math.random() - 0.5) * 0.4
    _v.z += (Math.random() - 0.5) * 0.4
    _v.normalize()
    // Project onto the hull ellipsoid so the breach sits ON the ship
    const t =
      1 /
      Math.sqrt(
        (_v.x / HULL.x) ** 2 + (_v.y / HULL.y) ** 2 + (_v.z / HULL.z) ** 2,
      )
    vent.localPos.copy(_v).multiplyScalar(t * 0.96)
    // Vent along the ellipsoid surface normal at the breach
    vent.localDir
      .set(
        vent.localPos.x / (HULL.x * HULL.x),
        vent.localPos.y / (HULL.y * HULL.y),
        vent.localPos.z / (HULL.z * HULL.z),
      )
      .normalize()
    vent.active = true
  },
  clear(): void {
    for (const vent of this.vents) vent.active = false
    this.severity = 0
  },
}

interface ParticleSystem {
  geometry: InstancedBufferGeometry
  material: ShaderMaterial
  offsets: Float32Array
  sizes: Float32Array
  alphas: Float32Array
  pos: Float32Array
  vel: Float32Array
  age: Float32Array
  life: Float32Array
  count: number
}

function makeSystem(
  count: number,
  map: Texture,
  color: [number, number, number],
  additive: boolean,
): ParticleSystem {
  const plane = new PlaneGeometry(1, 1)
  const geometry = new InstancedBufferGeometry()
  geometry.index = plane.index
  geometry.setAttribute('position', plane.getAttribute('position'))
  geometry.setAttribute('uv', plane.getAttribute('uv'))
  const offsets = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const alphas = new Float32Array(count)
  const rots = new Float32Array(count)
  for (let i = 0; i < count; i++) rots[i] = Math.random() * Math.PI * 2
  geometry.setAttribute('aOffset', new InstancedBufferAttribute(offsets, 3))
  geometry.setAttribute('aSize', new InstancedBufferAttribute(sizes, 1))
  geometry.setAttribute('aAlpha', new InstancedBufferAttribute(alphas, 1))
  geometry.setAttribute('aRot', new InstancedBufferAttribute(rots, 1))
  geometry.instanceCount = count
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: additive ? AdditiveBlending : NormalBlending,
    uniforms: { uMap: { value: map }, uColor: { value: color } },
    vertexShader: /* glsl */ `
      attribute vec3 aOffset;
      attribute float aSize;
      attribute float aAlpha;
      attribute float aRot;
      varying vec2 vUv;
      varying float vAlpha;
      void main() {
        vUv = uv;
        vAlpha = aAlpha;
        vec2 p = position.xy;
        float c = cos(aRot), s = sin(aRot);
        p = mat2(c, s, -s, c) * p;
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 world = aOffset + (right * p.x + up * p.y) * aSize;
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vAlpha;
      void main() {
        vec4 t = texture2D(uMap, vUv);
        gl_FragColor = vec4(uColor * t.rgb, t.a * vAlpha);
      }
    `,
  })
  return {
    geometry,
    material,
    offsets,
    sizes,
    alphas,
    pos: new Float32Array(count * 3),
    vel: new Float32Array(count * 3),
    age: new Float32Array(count),
    life: new Float32Array(count),
    count,
  }
}

function spawn(sys: ParticleSystem, x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number): void {
  let best = 0
  let bestAge = -1
  for (let i = 0; i < sys.count; i++) {
    if (sys.age[i] >= sys.life[i]) {
      best = i
      break
    }
    if (sys.age[i] > bestAge) {
      bestAge = sys.age[i]
      best = i
    }
  }
  sys.pos[best * 3] = x
  sys.pos[best * 3 + 1] = y
  sys.pos[best * 3 + 2] = z
  sys.vel[best * 3] = vx
  sys.vel[best * 3 + 1] = vy
  sys.vel[best * 3 + 2] = vz
  sys.age[best] = 0
  sys.life[best] = life
}

export function HullDamage() {
  const smokeTex = useLoader(TextureLoader, '/textures/fx/smoke.webp')
  const emberTex = useLoader(TextureLoader, '/textures/fx/ember.webp')
  const arcTex = useLoader(TextureLoader, '/textures/fx/arc.webp')
  const arcRefs = useRef<(Sprite | null)[]>([])
  const smokeMeshRef = useRef<Mesh>(null)
  const emberMeshRef = useRef<Mesh>(null)
  const accum = useRef({ smoke: 0, ember: 0 })

  const { smoke, ember } = useMemo(() => {
    for (const tex of [smokeTex, emberTex, arcTex]) tex.colorSpace = SRGBColorSpace
    return {
      smoke: makeSystem(SMOKE_N, smokeTex, [0.82, 0.87, 0.95], false),
      ember: makeSystem(EMBER_N, emberTex, [1.2, 0.6, 0.24], true),
    }
  }, [smokeTex, emberTex, arcTex])

  useEffect(() => {
    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__vent = (
        x = 0.4,
        y = -0.5,
        z = 0.8,
      ) => {
        damageFx.add({ x, y, z })
        damageFx.severity = Math.max(damageFx.severity, 0.6)
      }
    }
    return () => {
      smoke.geometry.dispose()
      smoke.material.dispose()
      ember.geometry.dispose()
      ember.material.dispose()
    }
  }, [smoke, ember])

  useFrame((_, dt) => {
    const anyVent = damageFx.severity > 0 && damageFx.vents.some((v) => v.active)

    // Emit from the breaches, pinned to the hull via ship-local coordinates.
    // Each spawn picks a random active vent so multiple breaches share fairly.
    if (anyVent) {
      const active = damageFx.vents.filter((v) => v.active)
      const shipVx = shipRig.velocityDir.x * shipRig.speed
      const shipVy = shipRig.velocityDir.y * shipRig.speed
      const shipVz = shipRig.velocityDir.z * shipRig.speed
      accum.current.smoke += dt * (14 + damageFx.severity * 8) * active.length
      accum.current.ember += dt * (1.6 + damageFx.severity * 1.4) * active.length
      const ventWorld = (vent: Vent) => {
        _w.copy(vent.localPos).applyQuaternion(shipRig.quaternion).add(shipRig.position)
        _v.copy(vent.localDir).applyQuaternion(shipRig.quaternion)
      }
      while (accum.current.smoke >= 1) {
        accum.current.smoke -= 1
        ventWorld(active[Math.floor(Math.random() * active.length)])
        // fast narrow jet — venting atmosphere, not billowing smoke
        const jet = 4.5 + Math.random() * 3
        spawn(
          smoke,
          _w.x + (Math.random() - 0.5) * 0.25,
          _w.y + (Math.random() - 0.5) * 0.25,
          _w.z + (Math.random() - 0.5) * 0.25,
          shipVx + _v.x * jet + (Math.random() - 0.5) * 0.5,
          shipVy + _v.y * jet + (Math.random() - 0.5) * 0.5,
          shipVz + _v.z * jet + (Math.random() - 0.5) * 0.5,
          0.75 + Math.random() * 0.45,
        )
      }
      while (accum.current.ember >= 1) {
        accum.current.ember -= 1
        ventWorld(active[Math.floor(Math.random() * active.length)])
        for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) {
          const kick = 7 + Math.random() * 7
          spawn(
            ember,
            _w.x,
            _w.y,
            _w.z,
            shipVx + _v.x * kick + (Math.random() - 0.5) * 5,
            shipVy + _v.y * kick + (Math.random() - 0.5) * 5,
            shipVz + _v.z * kick + (Math.random() - 0.5) * 5,
            0.3 + Math.random() * 0.25,
          )
        }
      }
    }

    // Integrate + write attributes
    for (const sys of [smoke, ember]) {
      let alive = false
      for (let i = 0; i < sys.count; i++) {
        if (sys.age[i] >= sys.life[i]) {
          sys.alphas[i] = 0
          continue
        }
        alive = true
        sys.age[i] += dt
        const t = Math.min(1, sys.age[i] / sys.life[i])
        sys.pos[i * 3] += sys.vel[i * 3] * dt
        sys.pos[i * 3 + 1] += sys.vel[i * 3 + 1] * dt
        sys.pos[i * 3 + 2] += sys.vel[i * 3 + 2] * dt
        sys.offsets[i * 3] = sys.pos[i * 3]
        sys.offsets[i * 3 + 1] = sys.pos[i * 3 + 1]
        sys.offsets[i * 3 + 2] = sys.pos[i * 3 + 2]
        if (sys === smoke) {
          sys.sizes[i] = 0.3 + t * 0.95
          sys.alphas[i] = 0.7 * Math.min(1, sys.age[i] * 8) * Math.pow(1 - t, 1.5)
        } else {
          sys.sizes[i] = 0.2 + Math.sin(t * Math.PI) * 0.12
          sys.alphas[i] = 1 - t
        }
      }
      const geom = sys.geometry
      ;(geom.getAttribute('aOffset') as InstancedBufferAttribute).needsUpdate = alive || anyVent
      ;(geom.getAttribute('aSize') as InstancedBufferAttribute).needsUpdate = alive || anyVent
      ;(geom.getAttribute('aAlpha') as InstancedBufferAttribute).needsUpdate = true
    }

    // Electrical arcs snapping at the breach itself
    for (let i = 0; i < MAX_VENTS; i++) {
      const sprite = arcRefs.current[i]
      if (!sprite) continue
      const vent = damageFx.vents[i]
      const on = anyVent && vent.active && Math.random() < 0.05 + damageFx.severity * 0.06
      sprite.visible = on
      if (on) {
        _w.copy(vent.localPos).applyQuaternion(shipRig.quaternion).add(shipRig.position)
        sprite.position.copy(_w).add(
          _v.set((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3),
        )
        const s = 1.2 + Math.random() * 1.1
        sprite.scale.set(s, s, 1)
        const material = sprite.material
        material.rotation = Math.random() * Math.PI * 2
        material.opacity = 0.45 + Math.random() * 0.35
      }
    }
  })

  return (
    <group>
      <mesh ref={smokeMeshRef} geometry={smoke.geometry} material={smoke.material} frustumCulled={false} />
      <mesh ref={emberMeshRef} geometry={ember.geometry} material={ember.material} frustumCulled={false} />
      {[0, 1].map((i) => (
        <sprite
          key={i}
          visible={false}
          ref={(s) => {
            arcRefs.current[i] = s
          }}
        >
          <spriteMaterial
            map={arcTex}
            color="#bcd8ff"
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  )
}
