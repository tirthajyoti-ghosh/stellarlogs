import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Group,
} from 'three'
import { shipRig } from '../state/shipRig'

function makeStarTexture(): CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.3, 'rgba(255,255,255,0.6)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new CanvasTexture(canvas)
}

const STAR_TINTS: [number, number, number][] = [
  [1, 1, 1],
  [0.72, 0.82, 1], // blue-white
  [1, 0.88, 0.7], // warm
  [1, 0.75, 0.62], // orange
]

function makeShell(count: number, radius: number, jitter: number): BufferGeometry {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    // Uniform points on a sphere shell with radial jitter
    const u = Math.random() * 2 - 1
    const theta = Math.random() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    const r = radius * (1 - jitter + Math.random() * jitter * 2)
    positions[i * 3] = s * Math.cos(theta) * r
    positions[i * 3 + 1] = u * r
    positions[i * 3 + 2] = s * Math.sin(theta) * r
    const tint = STAR_TINTS[Math.floor(Math.random() * STAR_TINTS.length)]
    const brightness = 0.35 + Math.random() * 0.65
    colors[i * 3] = tint[0] * brightness
    colors[i * 3 + 1] = tint[1] * brightness
    colors[i * 3 + 2] = tint[2] * brightness
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(positions, 3))
  geo.setAttribute('color', new BufferAttribute(colors, 3))
  return geo
}

/**
 * Two star layers: a distant static shell and a nearer shell that follows the
 * ship at a fraction of its motion, producing parallax as you fly.
 */
export function Starfield() {
  const nearRef = useRef<Group>(null)
  const texture = useMemo(() => makeStarTexture(), [])
  const farGeo = useMemo(() => makeShell(4200, 20000, 0.15), [])
  const nearGeo = useMemo(() => makeShell(2200, 7000, 0.35), [])

  useFrame(() => {
    // Near layer trails the ship at 85% => 15% relative drift = parallax
    nearRef.current?.position.copy(shipRig.position).multiplyScalar(0.85)
  })

  return (
    <>
      <points geometry={farGeo}>
        <pointsMaterial
          map={texture}
          size={55}
          vertexColors
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
      <group ref={nearRef}>
        <points geometry={nearGeo}>
          <pointsMaterial
            map={texture}
            size={16}
            vertexColors
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </points>
      </group>
    </>
  )
}
