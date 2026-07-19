import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferGeometry, Euler, Group, Quaternion, Vector3 } from 'three'
import { Star } from './Star'
import { Planet } from './Planet'
import { registerGravityBody } from '../physics/gravity'
import type { SystemConfig } from '../config/systems'

function orbitLineGeometry(radius: number): BufferGeometry {
  const points: Vector3[] = []
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2
    points.push(new Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius))
  }
  return new BufferGeometry().setFromPoints(points)
}

interface OrbitingPlanetProps {
  config: SystemConfig['planets'][number]
  systemPosition: Vector3
  sunPosition: Vector3
}

function OrbitingPlanet({ config, systemPosition, sunPosition }: OrbitingPlanetProps) {
  const groupRef = useRef<Group>(null)
  // Shared, mutated in place — the gravity body tracks the orbit automatically
  const worldPos = useMemo(() => new Vector3(), [])
  const tilt = useMemo(
    () => new Quaternion().setFromEuler(new Euler(config.inclination ?? 0, 0, (config.inclination ?? 0) * 0.5)),
    [config.inclination],
  )
  const localPos = useMemo(() => new Vector3(), [])

  useEffect(
    () =>
      registerGravityBody({
        position: worldPos,
        strength: 16,
        radius: config.radius,
        influenceRadius: config.radius * 4,
      }),
    [config.radius, worldPos],
  )

  useFrame(({ clock }) => {
    const angle = config.phase + clock.elapsedTime * config.orbitSpeed
    localPos
      .set(Math.cos(angle) * config.orbitRadius, 0, Math.sin(angle) * config.orbitRadius)
      .applyQuaternion(tilt)
    groupRef.current?.position.copy(localPos)
    worldPos.copy(systemPosition).add(localPos)
  })

  return (
    <group ref={groupRef}>
      <Planet config={config} sunPosition={sunPosition} />
    </group>
  )
}

interface StarSystemProps {
  config: SystemConfig
}

/** A star with orbiting planets, faint orbit guides, and gravity wells. */
export function StarSystem({ config }: StarSystemProps) {
  const systemPosition = useMemo(() => new Vector3(...config.position), [config.position])

  useEffect(
    () =>
      registerGravityBody({
        position: systemPosition,
        strength: 26,
        radius: config.starRadius,
        influenceRadius: config.starRadius * 6,
      }),
    [config.starRadius, systemPosition],
  )

  const orbitGeometries = useMemo(
    () => config.planets.map((p) => orbitLineGeometry(p.orbitRadius)),
    [config.planets],
  )

  return (
    <group position={config.position}>
      <Star color={config.starColor} radius={config.starRadius} seed={config.planets.length} />
      {config.planets.map((planet, i) => (
        <OrbitingPlanet
          key={i}
          config={planet}
          systemPosition={systemPosition}
          sunPosition={systemPosition}
        />
      ))}
      {orbitGeometries.map((geo, i) => {
        const inc = config.planets[i].inclination ?? 0
        return (
          <lineLoop key={i} geometry={geo} rotation={[inc, 0, inc * 0.5]}>
            <lineBasicMaterial
              color={config.starColor}
              transparent
              opacity={0.07}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </lineLoop>
        )
      })}
    </group>
  )
}
