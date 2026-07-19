import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  ShaderMaterial,
  SpriteMaterial,
} from 'three'
import { starVertex, starFragment, coronaVertex, coronaFragment } from './shaders/starShader'

function makeGlowTexture(): CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.18, 'rgba(255,255,255,0.35)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.08)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new CanvasTexture(canvas)
}

interface StarProps {
  color: string
  radius: number
  seed?: number
}

/** Animated star: fbm surface (HDR for bloom), corona shell, halo sprite, light. */
export function Star({ color, radius, seed = 1 }: StarProps) {
  const surfaceMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: starVertex,
        fragmentShader: starFragment,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new Color(color) },
          uSeed: { value: seed },
        },
      }),
    [color, seed],
  )

  const coronaMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: coronaVertex,
        fragmentShader: coronaFragment,
        uniforms: { uColor: { value: new Color(color) } },
        side: BackSide,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [color],
  )

  const spriteMaterial = useMemo(
    () =>
      new SpriteMaterial({
        map: makeGlowTexture(),
        color: new Color(color),
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.55,
      }),
    [color],
  )

  useFrame(({ clock }) => {
    surfaceMaterial.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <group>
      <mesh material={surfaceMaterial}>
        <sphereGeometry args={[radius, 64, 64]} />
      </mesh>
      <mesh material={coronaMaterial}>
        <sphereGeometry args={[radius * 1.35, 48, 48]} />
      </mesh>
      <sprite material={spriteMaterial} scale={[radius * 7, radius * 7, 1]} />
      {/* One light per star — with 7 systems, light count matters */}
      <pointLight color="#fff0dd" intensity={6.5} distance={0} decay={0.35} />
    </group>
  )
}
