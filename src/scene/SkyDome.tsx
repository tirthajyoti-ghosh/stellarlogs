import { Suspense, useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { BackSide, Mesh, Quaternion, SRGBColorSpace, TextureLoader, Vector3 } from 'three'
import { shipRig } from '../state/shipRig'

/** Same plane as the starfield band — keep in sync with Starfield.tsx. */
export const BAND_TILT = new Vector3(0.42, 1, 0.18).normalize()

/**
 * Real sky: NASA SVS "Deep Star Maps 2020" (public domain), galactic
 * orientation, tone-mapped offline from the source EXR to a 4k equirect JPG.
 * The Milky Way band, dust lanes and both Magellanic Clouds are the actual
 * sky — one draw call.
 */
function Dome() {
  const meshRef = useRef<Mesh>(null)
  const texture = useLoader(TextureLoader, '/textures/starmap_4k.jpg')
  useMemo(() => {
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 8
  }, [texture])
  const quaternion = useMemo(
    () => new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), BAND_TILT),
    [],
  )

  // A backdrop must be unreachable: keep it centered on the ship
  useFrame(() => {
    meshRef.current?.position.copy(shipRig.position)
  })

  return (
    <mesh ref={meshRef} quaternion={quaternion} renderOrder={-2}>
      <sphereGeometry args={[24000, 48, 32]} />
      {/* Dimmed so the real sky stays a backdrop, not a spotlight */}
      <meshBasicMaterial map={texture} color="#9aa0ac" side={BackSide} depthWrite={false} fog={false} />
    </mesh>
  )
}

export function SkyDome() {
  return (
    <Suspense fallback={null}>
      <Dome />
    </Suspense>
  )
}
