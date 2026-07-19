import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Group,
  Vector3,
} from 'three'
import { shipRig } from '../state/shipRig'
import { BAND_TILT } from './SkyDome'

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
  [0.72, 0.82, 1],
  [1, 0.88, 0.7],
  [1, 0.75, 0.62],
]



function makeShell(count: number, radius: number, jitter: number, brightness = 1): BufferGeometry {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1
    const theta = Math.random() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    const r = radius * (1 - jitter + Math.random() * jitter * 2)
    positions[i * 3] = s * Math.cos(theta) * r
    positions[i * 3 + 1] = u * r
    positions[i * 3 + 2] = s * Math.sin(theta) * r
    const tint = STAR_TINTS[Math.floor(Math.random() * STAR_TINTS.length)]
    const b = (0.35 + Math.random() * 0.65) * brightness
    colors[i * 3] = tint[0] * b
    colors[i * 3 + 1] = tint[1] * b
    colors[i * 3 + 2] = tint[2] * b
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(positions, 3))
  geo.setAttribute('color', new BufferAttribute(colors, 3))
  return geo
}

/** Dense star band hugging the galactic plane, Gaussian spread around it. */
function makeBand(count: number, radius: number): BufferGeometry {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const p = new Vector3()
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    // approximate gaussian around the band plane
    const spread =
      (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 0.14
    p.set(Math.cos(theta), spread, Math.sin(theta)).normalize()
    // rotate so the band plane is tilted: build basis from BAND_TILT
    const up = BAND_TILT
    const t1 = new Vector3(1, 0, 0).cross(up).normalize()
    const t2 = up.clone().cross(t1)
    const world = t1
      .clone()
      .multiplyScalar(p.x)
      .addScaledVector(up, p.y)
      .addScaledVector(t2, p.z)
      .multiplyScalar(radius * (0.92 + Math.random() * 0.16))
    positions[i * 3] = world.x
    positions[i * 3 + 1] = world.y
    positions[i * 3 + 2] = world.z
    const tint = STAR_TINTS[Math.floor(Math.random() * STAR_TINTS.length)]
    const b = 0.25 + Math.random() * 0.5
    colors[i * 3] = tint[0] * b
    colors[i * 3 + 1] = tint[1] * b
    colors[i * 3 + 2] = tint[2] * b
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(positions, 3))
  geo.setAttribute('color', new BufferAttribute(colors, 3))
  return geo
}

/**
 * Sky dome: distant shell + milky-way band with nebula haze, plus a nearer
 * parallax shell that trails the ship.
 */
export function Starfield() {
  const nearRef = useRef<Group>(null)
  const starTexture = useMemo(() => makeStarTexture(), [])
  const farGeo = useMemo(() => makeShell(5200, 20000, 0.15), [])
  const bandGeo = useMemo(() => makeBand(7500, 21000), [])
  const heroGeo = useMemo(() => makeShell(140, 19000, 0.1, 1.6), [])
  const nearGeo = useMemo(() => makeShell(2600, 7000, 0.35), [])

  useFrame(() => {
    nearRef.current?.position.copy(shipRig.position).multiplyScalar(0.85)
  })

  const pointsMat = (size: number, opacity = 1) => (
    <pointsMaterial
      map={starTexture}
      size={size}
      vertexColors
      transparent
      opacity={opacity}
      depthWrite={false}
      blending={AdditiveBlending}
    />
  )

  return (
    <>
      <points geometry={farGeo}>{pointsMat(55)}</points>
      <points geometry={bandGeo}>{pointsMat(42, 0.9)}</points>
      <points geometry={heroGeo}>{pointsMat(160)}</points>
      <group ref={nearRef}>
        <points geometry={nearGeo}>{pointsMat(16)}</points>
      </group>
    </>
  )
}
