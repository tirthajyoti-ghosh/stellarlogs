import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard as DreiBillboard, Text } from '@react-three/drei'
import { AdditiveBlending, BufferGeometry, Euler, Group, MathUtils, Quaternion, Vector3 } from 'three'
import { Star } from './Star'
import { Planet } from './Planet'
import { PlanetBoards } from './boards/PlanetBoards'
import { FONT_BOLD, FONT } from './boards/font'
import { registerGravityBody } from '../physics/gravity'
import { shipRig } from '../state/shipRig'
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
}

function OrbitingPlanet({ config, systemPosition, sunPosition, accentColor }: OrbitingPlanetProps) {
  const groupRef = useRef<Group>(null)
  // Shared, mutated in place — gravity body and boards track the orbit
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
      <PlanetBoards
        item={config.item}
        planetRadius={config.radius}
        worldPos={worldPos}
        accentColor={accentColor}
      />
      {/* Planet name tag, always readable on approach */}
      <DreiBillboard position={[0, config.radius * 1.45, 0]}>
        <Text
          font={FONT_BOLD}
          fontSize={config.radius * 0.16}
          color={accentColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={config.radius * 0.008}
          outlineColor="#000000"
        >
          {config.item.title.toUpperCase()}
        </Text>
      </DreiBillboard>
    </group>
  )
}

/** Big system title floating above the star, fading in on approach. */
function SystemTitle({ config, systemPosition }: { config: SystemConfig; systemPosition: Vector3 }) {
  const groupRef = useRef<Group>(null)
  const opacity = useRef(0)

  useFrame(() => {
    const group = groupRef.current
    if (!group) return
    const d = systemPosition.distanceTo(shipRig.position)
    const target = d < 7000 && d > 900 ? 1 : 0
    opacity.current = MathUtils.lerp(opacity.current, target, 0.06)
    group.visible = opacity.current > 0.02
    const s = 0.6 + 0.4 * opacity.current
    group.scale.setScalar(s * Math.max(1, d / 2500))
  })

  return (
    <group ref={groupRef} position={[0, config.starRadius * 2.6, 0]}>
      <DreiBillboard>
        <Text
          font={FONT_BOLD}
          fontSize={90}
          color={config.starColor}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={2.2}
          outlineColor="#000000"
          letterSpacing={0.12}
        >
          {config.name.toUpperCase()}
        </Text>
        <Text
          font={FONT}
          fontSize={30}
          color="#c9d6e8"
          anchorX="center"
          anchorY="top"
          position={[0, -14, 0]}
          maxWidth={1400}
          outlineWidth={1}
          outlineColor="#000000"
        >
          {config.overview}
        </Text>
      </DreiBillboard>
    </group>
  )
}

/** A star with orbiting content planets, faint orbit guides, gravity wells. */
export function StarSystem({ config }: { config: SystemConfig }) {
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
      <SystemTitle config={config} systemPosition={systemPosition} />
      {config.planets.map((planet, i) => (
        <OrbitingPlanet
          key={i}
          config={planet}
          systemPosition={systemPosition}
          sunPosition={systemPosition}
          accentColor={config.starColor}
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
