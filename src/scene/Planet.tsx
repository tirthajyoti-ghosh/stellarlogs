import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  Group,
  ShaderMaterial,
  Vector3,
} from 'three'
import { planetVertex, planetFragment } from './shaders/planetShader'
import { cloudVertex, cloudFragment } from './shaders/cloudShader'
import { coronaVertex, coronaFragment } from './shaders/starShader'
import { ringsVertex, ringsFragment } from './shaders/ringsShader'
import type { PlanetConfig, PlanetType } from '../config/systems'

const MODE: Record<PlanetType, number> = {
  gasGiant: 0,
  lava: 1,
  ice: 2,
  terrestrialWet: 3,
  terrestrialDry: 4,
  barren: 5,
}

interface Palette {
  a: string
  b: string
  c: string
  atmosphere: string
  atmosphereShell?: number // shell glow strength, 0 = none
  emissive?: string
  emissiveStrength?: number
  noiseScale: number
  clouds?: boolean
}

const PALETTES: Record<PlanetType, Palette> = {
  gasGiant: { a: '#e8d5b0', b: '#c98f42', c: '#7a4f22', atmosphere: '#ffd9a0', atmosphereShell: 0.5, noiseScale: 1.4 },
  lava: { a: '#241512', b: '#4a2a1e', c: '#000000', atmosphere: '#ff6a2a', atmosphereShell: 0.35, emissive: '#ff5a1f', emissiveStrength: 2.6, noiseScale: 1.8 },
  ice: { a: '#e8f2fc', b: '#a9cbe8', c: '#6f9fc9', atmosphere: '#bfe0ff', atmosphereShell: 0.4, noiseScale: 2.0 },
  terrestrialWet: { a: '#0f3a6d', b: '#3d7a3c', c: '#8a9a50', atmosphere: '#6fb2ff', atmosphereShell: 0.6, noiseScale: 1.6, clouds: true },
  terrestrialDry: { a: '#b9894e', b: '#8a5a30', c: '#5c3a1e', atmosphere: '#e8b880', atmosphereShell: 0.35, noiseScale: 1.9, clouds: true },
  barren: { a: '#8d8d94', b: '#5c5c63', c: '#3a3a40', atmosphere: '#9aa0ab', atmosphereShell: 0, noiseScale: 2.2 },
}

interface PlanetProps {
  config: PlanetConfig
  sunPosition: Vector3
}

/** Procedural shader planet with optional clouds, atmosphere shell and rings. */
export function Planet({ config, sunPosition }: PlanetProps) {
  const spinRef = useRef<Group>(null)
  const palette = PALETTES[config.type]

  const surfaceMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: planetVertex,
        fragmentShader: planetFragment,
        uniforms: {
          uTime: { value: 0 },
          uSunPosition: { value: sunPosition },
          uColorA: { value: new Color(palette.a) },
          uColorB: { value: new Color(palette.b) },
          uColorC: { value: new Color(palette.c) },
          uAtmosphereColor: { value: new Color(palette.atmosphere) },
          uEmissiveColor: { value: new Color(palette.emissive ?? '#000000') },
          uEmissiveStrength: { value: palette.emissiveStrength ?? 0 },
          uNoiseScale: { value: palette.noiseScale },
          uSeed: { value: config.seed },
          uMode: { value: MODE[config.type] },
        },
      }),
    [config.seed, config.type, palette, sunPosition],
  )

  const cloudMaterial = useMemo(
    () =>
      palette.clouds
        ? new ShaderMaterial({
            vertexShader: cloudVertex,
            fragmentShader: cloudFragment,
            uniforms: {
              uTime: { value: 0 },
              uSunPosition: { value: sunPosition },
              uSeed: { value: config.seed * 3.7 },
            },
            transparent: true,
            depthWrite: false,
          })
        : null,
    [config.seed, palette.clouds, sunPosition],
  )

  const atmosphereMaterial = useMemo(
    () =>
      palette.atmosphereShell
        ? new ShaderMaterial({
            vertexShader: coronaVertex,
            fragmentShader: coronaFragment,
            uniforms: {
              uColor: {
                value: new Color(palette.atmosphere).multiplyScalar(palette.atmosphereShell),
              },
            },
            side: BackSide,
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
          })
        : null,
    [palette],
  )

  const ringsMaterial = useMemo(
    () =>
      config.rings
        ? new ShaderMaterial({
            vertexShader: ringsVertex,
            fragmentShader: ringsFragment,
            uniforms: {
              uColorA: { value: new Color('#cbb59a') },
              uColorB: { value: new Color('#8a7a64') },
              uSunPosition: { value: sunPosition },
              uInnerRadius: { value: config.radius * 1.45 },
              uOuterRadius: { value: config.radius * 2.6 },
              uSeed: { value: config.seed },
            },
            side: DoubleSide,
            transparent: true,
            depthWrite: false,
          })
        : null,
    [config.radius, config.rings, config.seed, sunPosition],
  )

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    surfaceMaterial.uniforms.uTime.value = t
    if (cloudMaterial) cloudMaterial.uniforms.uTime.value = t
    if (spinRef.current) spinRef.current.rotation.y += dt * 0.02
  })

  return (
    <group>
      <group ref={spinRef}>
        <mesh material={surfaceMaterial}>
          <sphereGeometry args={[config.radius, 64, 64]} />
        </mesh>
        {cloudMaterial && (
          <mesh material={cloudMaterial}>
            <sphereGeometry args={[config.radius * 1.02, 48, 48]} />
          </mesh>
        )}
      </group>
      {atmosphereMaterial && (
        <mesh material={atmosphereMaterial}>
          <sphereGeometry args={[config.radius * 1.08, 48, 48]} />
        </mesh>
      )}
      {ringsMaterial && (
        <mesh material={ringsMaterial} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[config.radius * 1.45, config.radius * 2.6, 128]} />
        </mesh>
      )}
    </group>
  )
}
