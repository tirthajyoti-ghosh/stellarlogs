import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, useGLTF } from '@react-three/drei'
import {
  AdditiveBlending,
  DoubleSide,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three'
import { shipRig } from '../state/shipRig'
import { registerHudLabel } from '../hud/hudState'
import {
  CRIB_POS,
  getReserve,
  musterIn,
  openWounds,
  skiffsWorking,
} from '../systems/reserve'
import { FONT_BOLD } from './boards/font'
import { DRIFT_POI } from '../config/pois'

/**
 * THE CRIB (docs/the-storm.md pass 3) — the Nilak's own salvaged cargo
 * holds, bolted into a cradle on the Drift's rim and packed with ice.
 * She was an ice hauler; her holds were built for exactly this. A
 * sunshade stands over them because exposed ice sublimates in starlight.
 *
 * A holed hold shows its wound and VENTS — a slow glittering plume off
 * the rim that you can see from anywhere on the picket. That is the game
 * telling you what you let through, with no words at all.
 *
 * And then the colony repairs itself: two patch skiffs fly out from the
 * docks (Tirtha's reference: the construction skiffs of The Expanse S6)
 * and close the wounds one at a time.
 */

const SKIFF_URL = '/models/skiff.glb'
const SLEEP_RANGE = 2600
const HOLD_X = [-48, -16, 16, 48]
const DRIFT = new Vector3(...DRIFT_POI.position)

function Skiff({ index, target }: { index: number; target: Vector3 }) {
  const gltf = useGLTF(SKIFF_URL)
  const ref = useRef<Group>(null)
  const model = useMemo(() => {
    const m = gltf.scene.clone(true)
    m.traverse((o) => {
      const mesh = o as Mesh
      if (mesh.isMesh) {
        const src = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshStandardMaterial
        const mat = src.clone()
        mat.metalness = Math.min(1, (mat.metalness ?? 0.5) + 0.1)
        mesh.material = mat
      }
    })
    return m
  }, [gltf])
  const torchRef = useRef<Mesh>(null)
  const g = useRef({ t: index * 2.1 })

  useFrame((_, dt) => {
    const grp = ref.current
    if (!grp) return
    const working = skiffsWorking()
    const muster = musterIn()
    grp.visible = working || muster > 0
    if (!grp.visible) return
    g.current.t += dt
    const t = g.current.t
    // out of the docks, on station at the wound, holding with small drift
    const from = DRIFT
    const k = muster > 0 ? Math.max(0, 1 - muster / 14) : 1
    grp.position.lerpVectors(from, target, k * k * (3 - 2 * k))
    grp.position.x += Math.sin(t * 0.6 + index) * 2.4
    grp.position.y += Math.sin(t * 0.47 + index * 2) * 1.8 + 10
    grp.position.z += Math.cos(t * 0.53 + index) * 2.4
    grp.lookAt(target.x, target.y, target.z)
    const torch = torchRef.current
    if (torch) {
      // the welding arc: irregular, never a steady lamp
      const flick = working ? Math.max(0, Math.sin(t * 31 + index) * Math.sin(t * 7.3)) : 0
      const m = torch.material as MeshBasicMaterial
      m.opacity = flick * 0.9
      torch.scale.setScalar(0.5 + flick * 1.3)
    }
  })

  return (
    <group ref={ref}>
      <group scale={2.4}>
        <primitive object={model} />
      </group>
      <mesh ref={torchRef} position={[0, 0, 5]}>
        <sphereGeometry args={[0.9, 8, 8]} />
        <meshBasicMaterial
          color={[2.6, 2.9, 3.4]}
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

export function DriftCrib() {
  const rootRef = useRef<Group>(null)
  const [reserve, setReserve] = useState(() => Math.round(getReserve()))
  const [wounds, setWounds] = useState(() => openWounds())
  const ventRefs = useRef<(Object3D | null)[]>([])

  const iceMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color('#7f95a6'),
        metalness: 0.0,
        roughness: 0.98,
        flatShading: true,
      }),
    [],
  )
  const holdMat = useMemo(
    () => new MeshStandardMaterial({ color: '#6f7a86', metalness: 0.7, roughness: 0.55, flatShading: true }),
    [],
  )
  const rigMat = useMemo(
    () => new MeshStandardMaterial({ color: '#2c333d', metalness: 0.55, roughness: 0.7 }),
    [],
  )
  const shadeMat = useMemo(
    () => new MeshStandardMaterial({ color: '#c8b189', metalness: 0.85, roughness: 0.35, flatShading: true }),
    [],
  )

  useEffect(() => {
    const off = registerHudLabel({
      id: 'poi-crib',
      name: 'THE CRIB',
      color: '#8fa8bd',
      kind: 'poi',
      position: CRIB_POS,
      yOffset: 60,
      el: null,
      detail: "MV NILAK'S HOLDS — THE DRIFT'S ICE",
      jumpStandoff: 420,
    })
    return off
  }, [])

  const tick = useRef(0)
  useFrame((_, dt) => {
    const root = rootRef.current
    if (!root) return
    root.visible = shipRig.position.distanceTo(CRIB_POS) < SLEEP_RANGE
    if (!root.visible) return
    tick.current += dt
    if (tick.current > 1) {
      tick.current = 0
      const r = Math.round(getReserve())
      setReserve((prev) => (prev === r ? prev : r))
      const w = openWounds()
      setWounds((prev) => (prev === w ? prev : w))
    }
    // the vent plumes drift and shimmer — ice going away in the light
    const now = performance.now() / 1000
    for (let i = 0; i < ventRefs.current.length; i++) {
      const v = ventRefs.current[i]
      if (!v) continue
      v.visible = i < wounds
      if (!v.visible) continue
      const s = 1 + Math.sin(now * 1.7 + i) * 0.16
      v.scale.set(s, 1 + Math.sin(now * 0.9 + i) * 0.1, s)
      v.rotation.z = Math.sin(now * 0.4 + i) * 0.12
    }
  })

  const woundTargets = useMemo(
    () => HOLD_X.map((x) => new Vector3(CRIB_POS.x + x, CRIB_POS.y + 16, CRIB_POS.z + 14)),
    [],
  )

  return (
    <>
      <group ref={rootRef} position={[CRIB_POS.x, CRIB_POS.y, CRIB_POS.z]}>
        {/* the cradle they welded her holds into */}
        <mesh material={rigMat} position={[0, -26, 0]}>
          <boxGeometry args={[132, 5, 44]} />
        </mesh>
        {/* THE SUNSHADE — exposed ice sublimates in starlight, so they
            keep a foil roof over the whole cradle */}
        <group position={[0, 26, 0]} rotation-x={-0.12}>
          <mesh material={shadeMat}>
            <boxGeometry args={[140, 0.6, 52]} />
          </mesh>
          {[-60, -20, 20, 60].map((x) => (
            <mesh key={x} material={rigMat} position={[x, -8, 0]}>
              <boxGeometry args={[2, 16, 2]} />
            </mesh>
          ))}
        </group>

        {HOLD_X.map((x, i) => (
          <group key={x} position={[x, 0, 0]}>
            {/* her hold: a hull cylinder, open at the ends */}
            <mesh material={holdMat} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[13, 13, 28, 16, 1, true]} />
            </mesh>
            {/* the ice inside it */}
            <mesh material={iceMat} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[11.6, 11.6, 27, 12]} />
            </mesh>
            <mesh material={rigMat} position={[0, -19, 0]}>
              <boxGeometry args={[6, 14, 6]} />
            </mesh>
            <Text
              font={FONT_BOLD}
              fontSize={2.9}
              letterSpacing={0.16}
              color="#c9d8e4"
              anchorX="center"
              anchorY="middle"
              position={[0, 2.5, 13.4]}
              material-toneMapped={false}
            >
              {i % 2 === 0 ? 'MV NILAK' : 'INTERAMNIA'}
            </Text>
            {/* THE WOUND: a torn hold vents a slow glittering plume */}
            <group
              ref={(el) => {
                ventRefs.current[i] = el
              }}
              visible={false}
              position={[0, 13, 6]}
            >
              <mesh position={[0, 26, 0]}>
                <coneGeometry args={[9, 52, 12, 1, true]} />
                <meshBasicMaterial
                  color="#8fc4e8"
                  transparent
                  opacity={0.05}
                  blending={AdditiveBlending}
                  depthWrite={false}
                  toneMapped={false}
                  side={DoubleSide}
                />
              </mesh>
              <mesh position={[0, 4, 0]}>
                <coneGeometry args={[3.4, 12, 10, 1, true]} />
                <meshBasicMaterial
                  color="#cfe6f6"
                  transparent
                  opacity={0.12}
                  blending={AdditiveBlending}
                  depthWrite={false}
                  toneMapped={false}
                  side={DoubleSide}
                />
              </mesh>
            </group>
          </group>
        ))}

        {/* the gauge — the only number that matters out here */}
        <group position={[0, -24, 30]}>
          <mesh material={rigMat}>
            <boxGeometry args={[66, 16, 2]} />
          </mesh>
          <Text
            font={FONT_BOLD}
            fontSize={4}
            letterSpacing={0.24}
            color="#8fa8bd"
            anchorX="center"
            anchorY="middle"
            position={[0, 4, 1.4]}
            material-toneMapped={false}
          >
            {wounds > 0 ? `WORKING STOCK · ${wounds} HOLD${wounds > 1 ? 'S' : ''} OPEN` : 'WORKING STOCK'}
          </Text>
          <Text
            font={FONT_BOLD}
            fontSize={6.6}
            letterSpacing={0.1}
            color={wounds > 0 ? '#ff5040' : reserve > 60 ? '#57e6c4' : reserve > 30 ? '#ffb454' : '#ff5040'}
            anchorX="center"
            anchorY="middle"
            position={[0, -3.8, 1.4]}
            material-toneMapped={false}
          >
            {`${reserve}%`}
          </Text>
        </group>
        <Text
          font={FONT_BOLD}
          fontSize={3.4}
          letterSpacing={0.22}
          color="#5f7c92"
          anchorX="center"
          anchorY="middle"
          position={[0, -36, 30]}
          material-toneMapped={false}
        >
          NO SHIP LEAVES THE DRIFT DRY
        </Text>
      </group>
      {/* the colony's patch boats */}
      <Skiff index={0} target={woundTargets[0]} />
      <Skiff index={1} target={woundTargets[2]} />
    </>
  )
}

useGLTF.preload(SKIFF_URL)
