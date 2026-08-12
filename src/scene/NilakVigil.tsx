import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, useGLTF } from '@react-three/drei'
import {
  AdditiveBlending,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Object3D,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three'
import { shipRig } from '../state/shipRig'
import { registerHudLabel } from '../hud/hudState'
import { triggerBell } from '../audio/engine'
import { lightCandle, getCandles, gClaims } from '../systems/tallies'
import { WRECK_POI } from '../config/pois'
import { FONT_BOLD } from './boards/font'

/**
 * THE VIGIL (docs/the-neighborhood.md — the wreck's memorial, rebuilt on
 * the Gamarra pattern from The Expanse: the holographic ship memorial on
 * Lovell Station, Luna — "in memory of the souls lost").
 *
 * A moored platform off the Nilak's hull. Four projector pedestals throw
 * a hologram of HER — the ice hauler herself, whole again, standing
 * vertical on her drive. Her crew's names revolve slowly around her.
 * Below them, a ring of holographic candles — one per candle ever lit,
 * kept forever (localStorage now; the backend will one day make the
 * count everyone's). Press G: your candle lights bright at the deck,
 * climbs, and joins the ring. No banner, no score — you watch it join.
 * Once per approach; a vigil is not a toy.
 */

const NILAK_URL = '/models/nilak.glb'

const SITE_POS = new Vector3(
  WRECK_POI.position[0] + 110,
  WRECK_POI.position[1] - 6,
  WRECK_POI.position[2] + 70,
)
const ADD_RANGE = 90
const SLEEP_RANGE = 1600
const MAX_FLAMES = 48
const NAME_RING_R = 10.5
const CANDLE_RING_R = 6.4
const NAME_SPEED = 0.035 // rad/s — a slow, patient orbit
const CANDLE_SPEED = 0.055
const JOIN_TIME = 5.5 // s for your candle to climb to its slot

/** Her crew. Twenty-six souls; the plate says so. */
const MANIFEST = [
  'VERA OKOYE · MASTER',
  'DUSAN MAKALO · XO',
  'ILUS KAMAL · REACTOR',
  'SOREN BLACKETT',
  'NADIA VOSS',
  'TOMAS ESKRIDGE',
  'KAIA NAMPEYO',
  'RUFE OYADOMARI',
  'MARTA CINZAS',
  'ELIO FONSECA',
  'YUSUF TANAKA',
  'PELLA IRAWAN',
  'GRETA HALVORSEN',
  'OBI ANYANWU',
  'LUCA MBEKI',
  'SUNI KRISHNAMURTHY',
  'ANJA PETROVA',
  'DEWI SANTOSO',
  'COLE MACREADY',
  'FEMI ADEYEMI',
  'INES CASTELLANOS',
  'RAVI CHANDRAN',
  'ZOFIA WALCZAK',
  'HAKIM BOUAZZA',
  'MEI-LIN ZHAO',
  'PETYR ANSGAR',
]

/** Deterministic ring slot for candle i — reload reproduces the layout. */
function candleSlot(i: number): { angle: number; radius: number; height: number } {
  return {
    angle: i * 2.399963, // golden angle: no two candles ever stack
    radius: CANDLE_RING_R + ((i * 37) % 100) / 100 * 1.8,
    height: 2.1 + ((i * 53) % 100) / 100 * 2.4,
  }
}

const _m4 = new Matrix4()
const _q = new Quaternion()
const _s = new Vector3(1, 1, 1)
const _p = new Vector3()
const _yAxis = new Vector3(0, 1, 0)

export function NilakVigil() {
  const nilak = useGLTF(NILAK_URL)
  const [candles, setCandles] = useState(getCandles())
  const rootRef = useRef<Group>(null)
  const nameRingRef = useRef<Group>(null)
  const candleRingRef = useRef<Group>(null)
  const stemsRef = useRef<InstancedMesh>(null)
  const flamesRef = useRef<InstancedMesh>(null)
  const yourCandleRef = useRef<Group>(null)
  const yourFlameRef = useRef<Mesh>(null)
  const g = useRef({
    near: false,
    addedThisApproach: false,
    time: 0,
    // your candle's climb: -1 idle, else 0..1 progress toward slot
    join: -1,
    joinSlot: 0,
    joinFrom: new Vector3(),
  })

  /** The hologram: her own hull, whole, in projected light. */
  const holoMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec3 vN;
          varying vec3 vW;
          void main() {
            vN = normalize(mat3(modelMatrix) * normal);
            vec4 w = modelMatrix * vec4(position, 1.0);
            vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          varying vec3 vN;
          varying vec3 vW;
          void main() {
            vec3 v = normalize(cameraPosition - vW);
            float fres = pow(1.0 - abs(dot(normalize(vN), v)), 2.2);
            float scan = 0.78 + 0.22 * sin(vW.y * 3.2 - uTime * 1.6);
            float flick = 0.94 + 0.06 * sin(uTime * 19.0) * sin(uTime * 6.1);
            float body = (0.55 + 0.95 * fres) * scan * flick;
            float alpha = 0.30 + 0.55 * fres;
            vec3 col = vec3(0.30, 0.75, 1.0) * body * 1.05;
            gl_FragColor = vec4(col, alpha);
          }`,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      }),
    [],
  )

  const holoShip = useMemo(() => {
    // NOTE: Wreck.tsx re-parents the cached scene's hull/pod nodes into
    // itself (<primitive> doesn't clone), so nilak.scene is EMPTY by the
    // time we get here. Clone the nodes straight off the GLTF node map —
    // their local transforms reassemble her whole, as she was built.
    const nodes = (nilak as unknown as { nodes: Record<string, Object3D> }).nodes
    const ship = new Group()
    for (const key of ['hull', 'pod']) {
      const src = nodes[key]
      if (!src) continue
      const c = src.clone(true)
      c.rotation.set(0, 0, 0)
      ship.add(c)
    }
    ship.traverse((o) => {
      const m = o as Mesh
      if (m.isMesh) m.material = holoMat
    })
    return ship
  }, [nilak, holoMat])

  /** The four projector shafts, pedestal lens → her hull. */
  const beams = useMemo(() => {
    const out: { pos: Vector3; quat: Quaternion; len: number }[] = []
    const up = new Vector3(0, 1, 0)
    // each projector paints a different stretch of her hull — the shafts
    // crisscross instead of meeting in one point
    const reach = [10, 16, 22, 28]
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4
      const lens = new Vector3(Math.sin(a) * 8, 2.5, Math.cos(a) * 8)
      const target = new Vector3(Math.sin(a + Math.PI) * 1.2, reach[i], Math.cos(a + Math.PI) * 1.2)
      const dir = target.clone().sub(lens)
      const len = dir.length()
      const quat = new Quaternion().setFromUnitVectors(up, dir.normalize())
      out.push({ pos: lens.clone().addScaledVector(dir, len / 2), quat, len })
    }
    return out
  }, [])

  // lay the permanent candles into the instanced ring
  useEffect(() => {
    const stems = stemsRef.current
    const flames = flamesRef.current
    if (!stems || !flames) return
    const shown = Math.min(candles, MAX_FLAMES)
    // if a climb is in flight, its slot stays empty until it lands
    const settled = g.current.join >= 0 ? Math.min(shown, g.current.joinSlot) : shown
    for (let i = 0; i < settled; i++) {
      const slot = candleSlot(i)
      _p.set(Math.sin(slot.angle) * slot.radius, slot.height, Math.cos(slot.angle) * slot.radius)
      _m4.compose(_p, _q.identity(), _s)
      stems.setMatrixAt(i, _m4)
      _p.y += 0.42
      _m4.compose(_p, _q.identity(), _s)
      flames.setMatrixAt(i, _m4)
    }
    stems.count = settled
    flames.count = settled
    stems.instanceMatrix.needsUpdate = true
    flames.instanceMatrix.needsUpdate = true
  }, [candles])

  useEffect(() => {
    const off = registerHudLabel({
      id: 'poi-vigil',
      name: 'THE VIGIL',
      color: '#9fdcff',
      kind: 'poi',
      position: SITE_POS,
      yOffset: 40,
      el: null,
      detail: 'MV NILAK — ALL HANDS · G ADDS YOUR CANDLE',
      jumpStandoff: 320,
    })
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'KeyG' || e.repeat) return
      const st = g.current
      if (!st.near || st.addedThisApproach || st.join >= 0) return
      st.addedThisApproach = true
      const n = lightCandle()
      st.joinSlot = Math.min(n - 1, MAX_FLAMES - 1)
      st.join = 0
      // your candle appears low on the deck, on your side of the ring
      const ring = candleRingRef.current
      if (ring) {
        _p.copy(shipRig.position).sub(SITE_POS)
        _p.y = 0
        if (_p.lengthSq() < 1) _p.set(0, 0, 1)
        _p.normalize().multiplyScalar(4.2)
        _p.y = 1.0
        // into ring-local space (the ring has rotated)
        st.joinFrom.copy(_p).applyAxisAngle(_yAxis, -ring.rotation.y)
      }
      setCandles(n)
      triggerBell() // one soft toll, heard inside your own hull
    }
    window.addEventListener('keydown', down)
    return () => {
      off()
      window.removeEventListener('keydown', down)
    }
  }, [])

  useFrame((_, dt) => {
    const st = g.current
    const d = shipRig.position.distanceTo(SITE_POS)
    st.near = d < ADD_RANGE
    gClaims.vigil = st.near
    if (d > ADD_RANGE * 2.2) st.addedThisApproach = false

    const root = rootRef.current
    if (root) root.visible = d < SLEEP_RANGE
    if (!root || !root.visible) return

    st.time += dt
    holoMat.uniforms.uTime.value = st.time

    // the slow orbits
    if (nameRingRef.current) nameRingRef.current.rotation.y += NAME_SPEED * dt
    if (candleRingRef.current) candleRingRef.current.rotation.y += CANDLE_SPEED * dt

    // your candle's climb to its slot
    const yours = yourCandleRef.current
    if (yours) {
      if (st.join >= 0) {
        st.join = Math.min(1, st.join + dt / JOIN_TIME)
        const t = st.join
        const ease = t * t * (3 - 2 * t)
        const slot = candleSlot(st.joinSlot)
        _p.set(Math.sin(slot.angle) * slot.radius, slot.height, Math.cos(slot.angle) * slot.radius)
        yours.position.lerpVectors(st.joinFrom, _p, ease)
        yours.visible = true
        // burns bright on the way up, settles to one of the many
        const flame = yourFlameRef.current
        if (flame) flame.scale.setScalar(1.9 - 0.9 * ease)
        if (st.join >= 1) {
          st.join = -1
          yours.visible = false
          // land it into the permanent ring
          const stems = stemsRef.current
          const flames = flamesRef.current
          if (stems && flames) {
            _m4.compose(_p, _q.identity(), _s)
            stems.setMatrixAt(st.joinSlot, _m4)
            _p.y += 0.42
            _m4.compose(_p, _q.identity(), _s)
            flames.setMatrixAt(st.joinSlot, _m4)
            stems.count = Math.min(getCandles(), MAX_FLAMES)
            flames.count = stems.count
            stems.instanceMatrix.needsUpdate = true
            flames.instanceMatrix.needsUpdate = true
          }
        }
      } else {
        yours.visible = false
      }
    }
  })

  return (
    <group ref={rootRef} position={[SITE_POS.x, SITE_POS.y, SITE_POS.z]}>
      {/* the moored platform */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[13, 14, 1, 8]} />
        <meshStandardMaterial color="#262c34" metalness={0.55} roughness={0.65} flatShading />
      </mesh>
      {/* four projector pedestals, lenses hot */}
      {beams.map((b, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        const px = Math.sin(a) * 8
        const pz = Math.cos(a) * 8
        return (
          <group key={i}>
            <mesh position={[px, 1.1, pz]}>
              <cylinderGeometry args={[0.55, 0.85, 2.2, 6]} />
              <meshStandardMaterial color="#343b45" metalness={0.65} roughness={0.5} flatShading />
            </mesh>
            <mesh position={[px, 2.32, pz]}>
              <cylinderGeometry args={[0.34, 0.42, 0.22, 8]} />
              <meshBasicMaterial color={[0.8, 2.0, 2.6]} toneMapped={false} />
            </mesh>
            {/* the projection shaft — this IS the hologram's light */}
            <mesh position={b.pos} quaternion={b.quat}>
              <coneGeometry args={[1.5, b.len, 12, 1, true]} />
              <meshBasicMaterial
                color="#5fd0ff"
                transparent
                opacity={0.03}
                blending={AdditiveBlending}
                depthWrite={false}
                side={DoubleSide}
              />
            </mesh>
          </group>
        )
      })}
      {/* HER — standing vertical on her drive, whole again */}
      <group position={[0, 22, 0]} rotation={[0, 0.4, Math.PI / 2]} scale={0.48}>
        <primitive object={holoShip} />
      </group>
      {/* the crew, revolving slowly around her */}
      <group ref={nameRingRef}>
        {MANIFEST.map((name, i) => {
          const a = (i / MANIFEST.length) * Math.PI * 2
          return (
            <Text
              key={name}
              font={FONT_BOLD}
              fontSize={0.62}
              letterSpacing={0.16}
              color="#9fdcff"
              fillOpacity={0.82}
              anchorX="center"
              anchorY="middle"
              position={[Math.sin(a) * NAME_RING_R, 5.5 + (i % 7) * 2.9, Math.cos(a) * NAME_RING_R]}
              rotation={[0, a, 0]}
              material-toneMapped={false}
              material-depthWrite={false}
            >
              {name}
            </Text>
          )
        })}
      </group>
      {/* the candles, a lower ring — one per candle ever lit */}
      <group ref={candleRingRef}>
        <instancedMesh ref={stemsRef} args={[undefined, undefined, MAX_FLAMES]} instanceMatrix-usage={DynamicDrawUsage}>
          <cylinderGeometry args={[0.07, 0.09, 0.62, 6]} />
          <meshBasicMaterial
            color="#6fc4e8"
            transparent
            opacity={0.5}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </instancedMesh>
        <instancedMesh ref={flamesRef} args={[undefined, undefined, MAX_FLAMES]} instanceMatrix-usage={DynamicDrawUsage}>
          <sphereGeometry args={[0.17, 6, 6]} />
          <meshBasicMaterial color={[0.9, 2.2, 2.8]} toneMapped={false} />
        </instancedMesh>
        {/* yours, while it climbs */}
        <group ref={yourCandleRef} visible={false}>
          <mesh>
            <cylinderGeometry args={[0.07, 0.09, 0.62, 6]} />
            <meshBasicMaterial
              color="#6fc4e8"
              transparent
              opacity={0.6}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh ref={yourFlameRef} position={[0, 0.42, 0]}>
            <sphereGeometry args={[0.17, 6, 6]} />
            <meshBasicMaterial color={[1.4, 3.0, 3.6]} toneMapped={false} />
          </mesh>
        </group>
      </group>
      {/* the plates */}
      <Text
        font={FONT_BOLD}
        fontSize={1.0}
        letterSpacing={0.24}
        color="#c9d8e4"
        anchorX="center"
        anchorY="middle"
        position={[0, 1.6, 12.6]}
        material-toneMapped={false}
      >
        {'IN MEMORY OF THE 26 SOULS OF THE MV NILAK'}
      </Text>
      <Text
        font={FONT_BOLD}
        fontSize={1.35}
        letterSpacing={0.3}
        color="#9fdcff"
        anchorX="center"
        anchorY="middle"
        position={[0, 0.2, 12.6]}
        material-toneMapped={false}
      >
        SHE CARRIED WATER
      </Text>
      <Text
        font={FONT_BOLD}
        fontSize={0.55}
        letterSpacing={0.18}
        color="#5f7c92"
        anchorX="center"
        anchorY="middle"
        position={[0, -1.0, 12.6]}
        material-toneMapped={false}
      >
        {`CANDLES LIT ${candles}`}
      </Text>
    </group>
  )
}

useGLTF.preload(NILAK_URL)
