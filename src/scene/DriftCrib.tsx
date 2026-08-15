import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text, useGLTF } from '@react-three/drei'
import {
  AdditiveBlending,
  Box3,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Plane,
  Points,
  PointsMaterial,
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
  woundHolds,
} from '../systems/reserve'
import { FONT_BOLD } from './boards/font'
import { DRIFT_POI } from '../config/pois'

/**
 * THE CRIB, rebuilt from HER OWN HULL (docs/the-storm.md pass 4).
 *
 * Four sections cut straight out of nilak.glb with clipping planes —
 * real plating, her real paint, torch-cut open ends — racked in a
 * cradle on the rim with irregular ice masses packed inside. "HER
 * PLATES ARE THIS DECK. HER TANKS ARE OUR WATER" is now literally what
 * you are looking at: the vigil and the crib are the same body, seen
 * twice.
 *
 * A wounded hold vents a stream of ice glitter (Points, visible from
 * the whole picket). The colony repairs itself AFTER the pass: two
 * patch skiffs come out from behind the colony's rock (no pop — they
 * emerge, Expanse construction-skiff pattern), weld the wounds closed
 * one at a time, and fly home.
 */

const NILAK_URL = '/models/nilak.glb'
const SKIFF_URL = '/models/skiff.glb'
const SLEEP_RANGE = 2600
const HOLD_X = [-51, -17, 17, 51]
const HOLD_LEN = 30
const DRIFT = new Vector3(...DRIFT_POI.position)
/** where the boats live: behind the colony's rock, out of sight */
const SKIFF_HOME = DRIFT.clone().add(new Vector3(-140, -60, 120))
const VENT_N = 44

/** one hold: a clipped window of her hull. Each hold shows a DIFFERENT
 *  stretch of the ship, so no two read alike. */
function NilakHold({ index }: { index: number }) {
  const gltf = useGLTF(NILAK_URL)
  const holderRef = useRef<Group>(null)
  const built = useRef(false)

  // build on the FIRST FRAME, not in an effect: the clipping planes are
  // world-space, so the parent chain's world matrices must exist before
  // we measure the placed clone (the audit's invisible-hull bug)
  useFrame(() => {
    const holder = holderRef.current
    if (!holder || built.current) return
    built.current = true
    const clone = gltf.scene.clone(true)
    holder.add(clone)
    const box = new Box3().setFromObject(clone)
    const size = new Vector3()
    box.getSize(size)
    const long = Math.max(size.x, size.y, size.z)
    const axis: 'x' | 'y' | 'z' = size.x === long ? 'x' : size.y === long ? 'y' : 'z'
    const FULL = 176
    const scale = FULL / long
    const winFrac = HOLD_LEN / FULL
    const t0 = 0.14 + index * 0.19
    const t1 = t0 + winFrac
    const c = box.getCenter(new Vector3())
    const winCenter = box.min[axis] + long * ((t0 + t1) / 2)
    const offset = new Vector3()
    offset[axis] = winCenter - c[axis]
    clone.position.sub(c).sub(offset)
    holder.scale.setScalar(scale)
    if (axis === 'y') holder.rotation.z = Math.PI / 2
    else if (axis === 'z') holder.rotation.y = Math.PI / 2
    // update the PARENT chain first — on the first tick the renderer has
    // not yet computed world matrices, and world-space planes need them
    holder.updateWorldMatrix(true, true)
    const wb = new Box3().setFromObject(clone)
    const spanX = wb.max.x - wb.min.x
    const spanY = wb.max.y - wb.min.y
    const spanZ = wb.max.z - wb.min.z
    const wAxis: 'x' | 'y' | 'z' =
      spanX >= spanY && spanX >= spanZ ? 'x' : spanY >= spanZ ? 'y' : 'z'
    const span = wb.max[wAxis] - wb.min[wAxis]
    const lo = wb.min[wAxis] + span * t0
    const hi = wb.min[wAxis] + span * t1
    const n = new Vector3()
    n[wAxis] = 1
    const planes = [new Plane(n.clone(), -lo), new Plane(n.clone().negate(), hi)]
    clone.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return
      const src = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshStandardMaterial
      const mat = src.clone()
      mat.clippingPlanes = planes
      mat.side = DoubleSide
      mesh.material = mat
    })
  })

  return <group ref={holderRef} />
}

/** the ice inside an open end: irregular pale masses, never a lamp */
function IceMass({ x }: { x: number }) {
  const mat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#5f7382',
        metalness: 0,
        roughness: 0.96,
        flatShading: true,
      }),
    [],
  )
  const geo = useMemo(() => new IcosahedronGeometry(1, 1), [])
  const lumps = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        p: [
          x + (i % 2 === 0 ? -1 : 1) * (HOLD_LEN / 2 - 3 - ((i * 17) % 5)),
          ((i * 37) % 7) - 3,
          ((i * 53) % 9) - 4,
        ] as [number, number, number],
        s: 3.2 + ((i * 29) % 3),
      })),
    [x],
  )
  return (
    <>
      {lumps.map((l, i) => (
        <mesh key={i} geometry={geo} material={mat} position={l.p} scale={l.s} />
      ))}
    </>
  )
}

/** a wounded hold's vent: a visible stream of ice glitter */
function makeVentGeometry(): BufferGeometry {
  const g = new BufferGeometry()
  const pos = new Float32Array(VENT_N * 3)
  const seed = new Float32Array(VENT_N)
  for (let i = 0; i < VENT_N; i++) seed[i] = Math.random()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  ;(g as unknown as { userData: { seed: Float32Array } }).userData = { seed }
  return g
}

function Skiff({ index }: { index: number }) {
  const gltf = useGLTF(SKIFF_URL)
  const ref = useRef<Group>(null)
  const model = useMemo(() => gltf.scene.clone(true), [gltf])
  const torchRef = useRef<Mesh>(null)
  const g = useRef({ t: index * 2.3, out: 0 })

  useFrame((_, dt) => {
    const grp = ref.current
    if (!grp) return
    const working = skiffsWorking()
    const muster = musterIn()
    // ease OUT toward the wound when there is work, ease HOME when not —
    // the boats emerge from behind the colony's rock: no pop, ever
    const want = working || muster > 0 ? 1 : 0
    g.current.out += (want - g.current.out) * Math.min(1, dt * (want ? 0.5 : 0.7))
    const out = g.current.out
    grp.visible = out > 0.01
    if (!grp.visible) return
    g.current.t += dt
    const t = g.current.t
    const holds = woundHolds()
    const myHold = holds[index % Math.max(1, holds.length)] ?? 0
    const target = _skiffTarget.set(
      CRIB_POS.x + HOLD_X[myHold],
      CRIB_POS.y + 10,
      CRIB_POS.z + 16,
    )
    const k = out * out * (3 - 2 * out)
    grp.position.lerpVectors(SKIFF_HOME, target, k)
    grp.position.x += Math.sin(t * 0.6 + index) * 1.6 * k
    grp.position.y += Math.sin(t * 0.47 + index * 2) * 1.2 * k
    grp.position.z += Math.cos(t * 0.53 + index) * 1.6 * k
    grp.lookAt(target.x, target.y - 6, target.z)
    const torch = torchRef.current
    if (torch) {
      const flick =
        working && out > 0.96 ? Math.max(0, Math.sin(t * 31 + index) * Math.sin(t * 7.3)) : 0
      const m = torch.material as MeshBasicMaterial
      m.opacity = flick * 0.85
      torch.scale.setScalar(0.4 + flick * 1.0)
    }
  })

  return (
    <group ref={ref}>
      {/* build length 8u × 0.9 ≈ 7 u — a workman's boat, SMALLER than the tug */}
      <group scale={0.9}>
        <primitive object={model} />
      </group>
      <mesh ref={torchRef} position={[0, -1.5, 3.2]}>
        <sphereGeometry args={[0.7, 8, 8]} />
        <meshBasicMaterial
          color={[2.2, 2.5, 3.0]}
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

const _skiffTarget = new Vector3()

export function DriftCrib() {
  const rootRef = useRef<Group>(null)
  const { gl } = useThree()
  useEffect(() => {
    // the holds are clipped windows of her hull — needs local clipping on
    gl.localClippingEnabled = true
  }, [gl])

  const [reserve, setReserve] = useState(() => Math.round(getReserve()))
  const [wounds, setWounds] = useState(() => openWounds())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ventRefs = useRef<(Points<any> | null)[]>([])
  const ventGeos = useMemo(() => [0, 1, 2, 3].map(() => makeVentGeometry()), [])
  const ventMat = useMemo(
    () =>
      new PointsMaterial({
        color: '#cfe6f6',
        size: 1.3,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.55,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [],
  )

  const rigMat = useMemo(
    () => new MeshStandardMaterial({ color: '#2c333d', metalness: 0.55, roughness: 0.7 }),
    [],
  )
  const shadeMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#b39a66',
        metalness: 0.65,
        roughness: 0.55,
        flatShading: true,
        side: DoubleSide,
      }),
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
    // the vents: glitter streaming off the wounded holds, rising and
    // shearing downstream — ice leaving, visible from the whole picket
    const now = performance.now() / 1000
    const open = woundHolds()
    for (let i = 0; i < 4; i++) {
      const pts = ventRefs.current[i]
      if (!pts) continue
      const isOpen = open.includes(i)
      pts.visible = isOpen
      if (!isOpen) continue
      const geo = ventGeos[i]
      const seed = (geo as unknown as { userData: { seed: Float32Array } }).userData.seed
      const arr = geo.getAttribute('position').array as Float32Array
      for (let p = 0; p < VENT_N; p++) {
        const u = (now * (0.05 + seed[p] * 0.06) + seed[p]) % 1
        const spread = 1.5 + u * 9
        arr[p * 3] = Math.sin(seed[p] * 61 + now * 0.4) * spread
        arr[p * 3 + 1] = 14 + u * 40
        arr[p * 3 + 2] = Math.cos(seed[p] * 47 + now * 0.3) * spread + u * 7
      }
      geo.getAttribute('position').needsUpdate = true
    }
  })

  return (
    <>
      <group ref={rootRef} position={[CRIB_POS.x, CRIB_POS.y, CRIB_POS.z]}>
        {/* the cradle they welded her holds into */}
        <mesh material={rigMat} position={[0, -24, 0]}>
          <boxGeometry args={[140, 5, 46]} />
        </mesh>
        {[-62, -21, 21, 62].map((x) => (
          <mesh key={`leg-${x}`} material={rigMat} position={[x, -30, 0]}>
            <boxGeometry args={[4, 10, 40]} />
          </mesh>
        ))}

        {/* THE SUNSHADE — a trussed foil roof with a working sag; ice
            sublimates in starlight, so they keep her shaded */}
        <group position={[0, 30, 0]} rotation-x={-0.1}>
          {[-1, 0, 1].map((s) => (
            <mesh key={`shade-${s}`} material={shadeMat} position={[0, s === 0 ? -0.9 : 0, s * 19]} rotation-x={s * 0.09}>
              <boxGeometry args={[150, 0.5, 19]} />
            </mesh>
          ))}
          {[-66, -22, 22, 66].map((x) => (
            <group key={`truss-${x}`}>
              <mesh material={rigMat} position={[x, -6, 0]}>
                <boxGeometry args={[1.6, 12, 1.6]} />
              </mesh>
              <mesh material={rigMat} position={[x, -2.5, 14]} rotation-x={0.9}>
                <boxGeometry args={[1.2, 18, 1.2]} />
              </mesh>
              <mesh material={rigMat} position={[x, -2.5, -14]} rotation-x={-0.9}>
                <boxGeometry args={[1.2, 18, 1.2]} />
              </mesh>
            </group>
          ))}
        </group>

        {/* HER HOLDS — four windows cut from nilak.glb, each a different
            stretch of her hull; the ice packed inside; the vents */}
        {HOLD_X.map((x, i) => (
          <group key={`hold-${i}`} position={[x, 0, 0]}>
            <NilakHold index={i} />
            <IceMass x={0} />
            <points
              ref={(el) => {
                ventRefs.current[i] = el
              }}
              geometry={ventGeos[i]}
              material={ventMat}
              visible={false}
              frustumCulled={false}
            />
          </group>
        ))}

        {/* the stencils: on the cradle rail, not floating in space */}
        <Text
          font={FONT_BOLD}
          fontSize={3.6}
          letterSpacing={0.2}
          color="#c9d8e4"
          anchorX="center"
          anchorY="middle"
          position={[-36, -24, 23.4]}
          material-toneMapped={false}
        >
          MV NILAK
        </Text>
        <Text
          font={FONT_BOLD}
          fontSize={3.6}
          letterSpacing={0.2}
          color="#8fa8bd"
          anchorX="center"
          anchorY="middle"
          position={[36, -24, 23.4]}
          material-toneMapped={false}
        >
          THE DRIFT'S WATER
        </Text>

        {/* the gauge on its own backing plate, clear of the cradle */}
        <group position={[0, -42, 14]}>
          <mesh material={rigMat}>
            <boxGeometry args={[70, 18, 2]} />
          </mesh>
          <Text
            font={FONT_BOLD}
            fontSize={4}
            letterSpacing={0.24}
            color="#8fa8bd"
            anchorX="center"
            anchorY="middle"
            position={[0, 4.4, 1.4]}
            material-toneMapped={false}
          >
            {wounds > 0 ? `WORKING STOCK · ${wounds} HOLD${wounds > 1 ? 'S' : ''} OPEN` : 'WORKING STOCK'}
          </Text>
          <Text
            font={FONT_BOLD}
            fontSize={7}
            letterSpacing={0.1}
            color={wounds > 0 ? '#ff5040' : reserve > 60 ? '#57e6c4' : reserve > 30 ? '#ffb454' : '#ff5040'}
            anchorX="center"
            anchorY="middle"
            position={[0, -4, 1.4]}
            material-toneMapped={false}
          >
            {`${reserve}%`}
          </Text>
          <Text
            font={FONT_BOLD}
            fontSize={2.9}
            letterSpacing={0.22}
            color="#5f7c92"
            anchorX="center"
            anchorY="middle"
            position={[0, -12.6, 1.4]}
            material-toneMapped={false}
          >
            NO SHIP LEAVES THE DRIFT DRY
          </Text>
        </group>
      </group>
      {/* the colony's patch boats — they come out from behind the rock */}
      <Skiff index={0} />
      <Skiff index={1} />
    </>
  )
}

useGLTF.preload(SKIFF_URL)
