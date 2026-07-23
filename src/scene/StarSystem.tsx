import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferGeometry, Euler, Group, Quaternion, Vector3 } from 'three'
import { Star } from './Star'
import { Planet } from './Planet'
import { PlanetBoards } from './boards/PlanetBoards'
import { registerGravityBody } from '../physics/gravity'
import { registerHudLabel } from '../hud/hudState'
import { labelsChanged } from '../hud/LabelLayer'
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
  accentColor: string
  systemName: string
  /** Shared live world position (owned by StarSystem so moons can read parents) */
  worldPos: Vector3
  /** Live world position of the parent planet, when this body is a MOON */
  parentWorldPos?: Vector3
}

function OrbitingPlanet({
  config,
  systemPosition,
  sunPosition,
  accentColor,
  systemName,
  worldPos,
  parentWorldPos,
}: OrbitingPlanetProps) {
  const groupRef = useRef<Group>(null)
  const tilt = useMemo(
    () => new Quaternion().setFromEuler(new Euler(config.inclination ?? 0, 0, (config.inclination ?? 0) * 0.5)),
    [config.inclination],
  )
  const localPos = useMemo(() => new Vector3(), [])

  useEffect(
    () =>
      registerGravityBody({
        position: worldPos,
        strength: config.gravity?.strength ?? 16,
        radius: config.radius,
        influenceRadius: config.gravity?.influence ?? config.radius * 4,
        maxPull: config.gravity?.maxPull,
      }),
    [config.gravity, config.radius, worldPos],
  )

  useEffect(() => {
    const unregister = registerHudLabel({
      id: `planet-${config.seed}-${config.item.title}`,
      name: config.item.title.toUpperCase(),
      color: accentColor,
      kind: 'planet',
      position: worldPos,
      yOffset: config.radius * 1.6,
      el: null,
      group: systemName.toUpperCase(),
      readRange: config.radius * 7 + 220,
    })
    labelsChanged()
    return () => {
      unregister()
      labelsChanged()
    }
  }, [accentColor, config.item.title, config.radius, config.seed, worldPos, systemName])

  useFrame(({ clock }) => {
    const angle = config.phase + clock.elapsedTime * config.orbitSpeed
    localPos
      .set(Math.cos(angle) * config.orbitRadius, 0, Math.sin(angle) * config.orbitRadius)
      .applyQuaternion(tilt)
    // Moons orbit their parent's LIVE position; planets orbit the star
    if (parentWorldPos) {
      worldPos.copy(parentWorldPos).add(localPos)
      groupRef.current?.position.copy(worldPos).sub(systemPosition)
    } else {
      groupRef.current?.position.copy(localPos)
      worldPos.copy(systemPosition).add(localPos)
    }
  })

  return (
    <group ref={groupRef}>
      <Planet config={config} sunPosition={sunPosition} />
      {!config.noBoards && (
        <PlanetBoards
          item={config.item}
          planetRadius={config.radius}
          worldPos={worldPos}
          accentColor={accentColor}
        />
      )}
    </group>
  )
}

/** A star with orbiting content planets, faint orbit guides, gravity wells. */
export function StarSystem({ config }: { config: SystemConfig }) {
  const systemPosition = useMemo(() => new Vector3(...config.position), [config.position])
  // Live world positions per planet, so moons can chase their parents
  const planetWorldPositions = useMemo(
    () => config.planets.map(() => new Vector3()),
    [config.planets],
  )

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
          accentColor={config.starColor}
          systemName={config.name}
          worldPos={planetWorldPositions[i]}
          parentWorldPos={
            planet.parent !== undefined ? planetWorldPositions[planet.parent] : undefined
          }
        />
      ))}
      {orbitGeometries.map((geo, i) => {
        if (config.planets[i].parent !== undefined) return null // moons: no star-centered guide
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
