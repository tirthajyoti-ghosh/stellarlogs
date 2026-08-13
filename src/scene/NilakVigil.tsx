import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, useGLTF } from '@react-three/drei'
import {
  AdditiveBlending,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
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
import { Billboard } from './boards/Billboard'
import type { BoardSpec } from './boards/boardSpecs'

/**
 * THE VIGIL (docs/the-neighborhood.md — the wreck's memorial, rebuilt on
 * the Gamarra pattern from The Expanse: the holographic ship memorial on
 * Lovell Station, Luna — "in memory of the souls lost").
 *
 * A moored platform where the Nilak died on approach — her hull long
 * since scrapped for parts (a colony wastes nothing); this is all that
 * stands. Four projector pedestals throw a hologram of HER — the ice
 * hauler herself, whole again, standing vertical on her drive. Her
 * crew's names revolve around her from drive to bow, each with the line
 * their people left, the way lines are left on gravestones — and when
 * you fly close, the names passing through your line of sight swell
 * like macOS dock icons under a cursor, then settle back. Below them, a
 * ring of holographic candles — one per candle ever lit, kept forever
 * (localStorage now; the backend will one day make the count
 * everyone's). Press G: your candle lights bright at the deck, climbs,
 * and joins the ring. No banner, no score — you watch it join.
 * Once per approach; a vigil is not a toy.
 */

const NILAK_URL = '/models/nilak.glb'

const SITE_POS = new Vector3(...WRECK_POI.position)
const ADD_RANGE = 90
const SLEEP_RANGE = 1600
const MAX_FLAMES = 48
const NAME_RING_R = 10.5
const CANDLE_RING_R = 6.4
const NAME_SPEED = 0.05 // rad/s — slow and patient, but alive
const CANDLE_SPEED = 0.055
const JOIN_TIME = 5.5 // s for your candle to climb to its slot

/** Her crew — forty-two souls, each with a line their people left, the
 *  way lines are left on gravestones: some proud, some funny, some just
 *  sad. The plate below counts them from this list. */
const MANIFEST: { name: string; line: string }[] = [
  { name: 'VERA OKOYE · MASTER', line: 'FORTY YEARS ON THE ICE RUN — NEVER ONCE LATE' },
  { name: 'DUSAN MAKALO · XO', line: 'HE SANG OFF-KEY AND WE LET HIM' },
  { name: 'ILUS KAMAL · REACTOR', line: 'THE DRIVE NEVER STUTTERED ON HER WATCH' },
  { name: 'SOREN BLACKETT', line: 'DA — THE TOMATOES CAME UP' },
  { name: 'NADIA VOSS', line: 'SHE STILL OWES ME A DANCE' },
  { name: 'TOMAS ESKRIDGE', line: 'PAID EVERY DEBT BUT THIS ONE' },
  { name: 'KAIA NAMPEYO', line: 'YOUNGEST ABOARD · LOUDEST LAUGH' },
  { name: 'RUFE OYADOMARI', line: 'HE CALLED EVERY PORT HOME' },
  { name: 'MARTA CINZAS', line: 'MAMA — WE KEPT THE GARDEN' },
  { name: 'ELIO FONSECA', line: 'HE WAS SAVING FOR CERES' },
  { name: 'YUSUF TANAKA', line: 'TEA AT THE SAME HOUR, EVERY WATCH' },
  { name: 'PELLA IRAWAN', line: 'SHE NAMED THE SHIP’S CAT' },
  { name: 'GRETA HALVORSEN', line: 'TWENTY CROSSINGS. ONE MORE, SHE SAID' },
  { name: 'OBI ANYANWU', line: 'BIG HANDS · SOFT BREAD' },
  { name: 'LUCA MBEKI', line: 'HE WROTE US EVERY BURN' },
  { name: 'SUNI KRISHNAMURTHY', line: 'SHE FIXED WHAT COULD NOT BE FIXED' },
  { name: 'ANJA PETROVA', line: 'WE STILL SET YOUR PLACE, ANJUSHKA' },
  { name: 'DEWI SANTOSO', line: 'SHE SENT WATER HOME IN STORIES' },
  { name: 'COLE MACREADY', line: 'OWED NOBODY · LOVED EVERYBODY' },
  { name: 'FEMI ADEYEMI', line: 'THE STARS WERE ALWAYS HERS' },
  { name: 'INES CASTELLANOS', line: 'COME HOME WAS ALL WE ASKED' },
  { name: 'RAVI CHANDRAN', line: 'HE KNEW EVERY VALVE BY NAME' },
  { name: 'ZOFIA WALCZAK', line: 'FIRST OUT THE LOCK, ALWAYS' },
  { name: 'HAKIM BOUAZZA', line: 'HIS COFFEE COULD WAKE THE DEAD' },
  { name: 'MEI-LIN ZHAO', line: 'SHE DREW BIRDS SHE NEVER SAW' },
  { name: 'PETYR ANSGAR', line: 'TILL THE WATER COMES BACK ROUND, LOVE' },
  { name: 'ODUYA REMBEK', line: 'HE HELD THE LOCK FOR OTHERS FIRST' },
  { name: 'SASHA VOLKOV', line: 'BORN ON CERES · DIED CARRYING WATER' },
  { name: 'MIRA OKONJO', line: 'MY SISTER. MY WHOLE SKY' },
  { name: 'JAN BRAAM', line: 'HE NEVER LOST AT CARDS. WE CHECKED' },
  { name: 'THUY NGUYEN', line: 'SHE LEFT THE RADIO ON FOR US' },
  { name: 'KOFI MENSAH', line: 'STILL THE BEST COOK OFF PALLAS' },
  { name: 'ROSA ETXEBERRIA', line: 'FOUR KIDS, AMA. ALL OF US FLYING NOW' },
  { name: 'DMITRI PAVLENKO', line: 'HE MEASURED TWICE, ALWAYS' },
  { name: 'AMARA DIALLO', line: 'THE DRIFT STILL SINGS HER SONGS' },
  { name: 'HANS OKAFOR-LIND', line: 'PAPA — WE FINISHED YOUR BOAT' },
  { name: 'NIKO TERAUCHI', line: 'SHORTEST TEMPER · LONGEST FRIEND' },
  { name: 'CELESTE MORAES', line: 'SHE SAID THE BELT WAS BEAUTIFUL. IT IS' },
  { name: 'IBRAHIM SAYEGH', line: 'HE PRAYED FOR RAIN HE NEVER SAW' },
  { name: 'WEI ZHANG', line: 'GRANDFATHER — THE WELL RUNS CLEAR' },
  { name: 'ESPEN LARSEN', line: 'HE OWED ME TEN SCRIP. KEEP IT, BOSMANG' },
  { name: 'TALIA BEN-AMI', line: 'SHE WAS GOING TO SEE EARTH IN SPRING' },
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
const _axis = new Vector3()

function smooth01(x: number): number {
  const t = Math.max(0, Math.min(1, x))
  return t * t * (3 - 2 * t)
}

/** How far up the wave lifts a name at the cone's center. */
const MAG_MAX = 1.9
/** The wave only plays close-in — a memorial, not a billboard. */
const MAG_NEAR = 280

export function NilakVigil() {
  const nilak = useGLTF(NILAK_URL)
  const [candles, setCandles] = useState(getCandles())
  const rootRef = useRef<Group>(null)
  const nameRingRef = useRef<Group>(null)
  const nameGroups = useRef<(Group | null)[]>([])
  const nameScale = useRef<Float32Array>(new Float32Array(MANIFEST.length).fill(1))
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
          #include <common>
          #include <logdepthbuf_pars_vertex>
          varying vec3 vN;
          varying vec3 vW;
          void main() {
            vN = normalize(mat3(modelMatrix) * normal);
            vec4 w = modelMatrix * vec4(position, 1.0);
            vW = w.xyz;
            // EXACT same op ORDER as MeshBasicMaterial's project_vertex,
            // then the SAME log-depth chunk the whole app renders with
            // (gl.logarithmicDepthBuffer: a plain-z shader here writes
            // garbage depth against every built-in material — this was
            // the hologram's depth lie all along)
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            #include <logdepthbuf_vertex>
          }`,
        fragmentShader: /* glsl */ `
          #include <common>
          #include <logdepthbuf_pars_fragment>
          uniform float uTime;
          varying vec3 vN;
          varying vec3 vW;
          void main() {
            #include <logdepthbuf_fragment>
            vec3 v = normalize(cameraPosition - vW);
            float fres = pow(1.0 - abs(dot(normalize(vN), v)), 2.2);
            float scan = 0.78 + 0.22 * sin(vW.y * 3.2 - uTime * 1.6);
            float flick = 0.94 + 0.06 * sin(uTime * 19.0) * sin(uTime * 6.1);
            float body = (0.55 + 0.95 * fres) * scan * flick;
            // the Z-prepass culls her interior and everything bright
            // behind her, so this single front shell can stay glassy:
            // see-through vs the world's opaque bodies, never outshone
            float alpha = (0.52 + 0.48 * fres) * (0.9 + 0.1 * scan);
            vec3 col = vec3(0.30, 0.75, 1.0) * body * 1.05;
            gl_FragColor = vec4(col, alpha);
          }`,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      }),
    [],
  )

  /** THE Z-PREPASS (how games render holograms honestly): pass 1 writes
   *  her depth only — no color — in the opaque queue, AFTER the world's
   *  opaque bodies (renderOrder 1). Every transparent thing behind her
   *  (the star's huge additive halo, far-side name cards, her own
   *  interior faces) then FAILS the depth test and is culled. Pass 2
   *  draws the visible shell, which now blends only over what is
   *  genuinely in front of the depth she wrote. See-through vs opaque
   *  backgrounds stays (their color is already in the buffer); bright
   *  glows can no longer lie about being in front of her. */
  const depthMat = useMemo(() => {
    const m = new MeshBasicMaterial({ colorWrite: false })
    m.side = DoubleSide
    return m
  }, [])

  const { holoShip, holoDepthShip } = useMemo(() => {
    // Clone off the GLTF node map rather than the scene — robust even if
    // another mount ever re-parents the cached scene's nodes (the old
    // Wreck did exactly that and left nilak.scene empty).
    const nodes = (nilak as unknown as { nodes: Record<string, Object3D> }).nodes
    const build = (material: Material, renderOrder: number) => {
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
        if (m.isMesh) {
          m.material = material
          m.renderOrder = renderOrder
        }
      })
      return ship
    }
    return { holoShip: build(holoMat, 0), holoDepthShip: build(depthMat, 1) }
  }, [nilak, holoMat, depthMat])

  /** The card each gravestone is printed on: a translucent dark pane —
   *  legible text on glass, unmistakably projected, never solid. One
   *  shared material; far-side cards are culled by her Z-prepass. */
  const cardMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#0a2330',
        transparent: true,
        opacity: 0.44,
        depthWrite: false,
      }),
    [],
  )
  const cardEdgeMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#4fb2de',
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      }),
    [],
  )

  /** THE MEMORIAL BOARD — the story the plates couldn't carry, on a
   *  real billboard (house grammar: lamp-lit panel, slews to face you).
   *  New fiction seams, extrapolated from what stands: THE DRY WEEKS
   *  (what the Drift lived through while the water stopped), the racing
   *  club's water runs (why the club's opening lap has its name), and
   *  where her scrapped hull actually went — you are standing on her. */
  const boardSpec = useMemo<BoardSpec>(
    () => ({
      width: 30,
      height: 44,
      blocks: [
        { text: 'SHE CARRIED WATER', size: 2.2, color: '#9fdcff', y: 18.5, maxWidth: 26, bold: true },
        {
          text: 'MV NILAK · ICE HAULER · INTERAMNIA REGISTRY — IN MEMORY OF HER 42 SOULS',
          size: 0.95,
          color: '#7d8a99',
          y: 14.1,
          maxWidth: 26,
        },
        {
          text:
            'RAIDERS TOOK HER INBOUND ON THE ICE ROUTE, HOLDS FULL, THREE DAYS FROM DOCK. ' +
            'THE AMNIA MILITIA WAS SWORN THAT SAME WEEK — THE MANHUNT BOARD HAS NOT EMPTIED SINCE.',
          size: 1.0,
          color: '#c9d8e4',
          y: 10.1,
          maxWidth: 26,
        },
        {
          text:
            'THE DRY WEEKS: ELEVEN DAYS THIS DRIFT LIVED ON DREGS AND RECLAIMER STEAM. ' +
            'THE RACING CLUB STRIPPED THEIR HULLS FOR TANKAGE AND RAN RAW ICE FROM THE OUTER WELLS, ' +
            'LAP AFTER LAP, UNTIL THE RESERVE CAME BACK. THE CLUB CALLS ITS OPENING LAP ' +
            '"THE WATER RUN" TO THIS DAY.',
          size: 1.0,
          color: '#c9d8e4',
          y: 3.3,
          maxWidth: 26,
        },
        {
          text:
            'HER HULL CAME HOME AS SCRAP — A COLONY WASTES NOTHING. HER PLATES DECK THIS ' +
            'PLATFORM. HER TANKS HOLD THE DRIFT’S RESERVE. YOU ARE STANDING ON HER.',
          size: 1.0,
          color: '#c9d8e4',
          y: -7.4,
          maxWidth: 26,
        },
        { text: 'NO SHIP LEAVES THE DRIFT DRY', size: 1.15, color: '#9fdcff', y: -14.2, maxWidth: 26, bold: true },
        { text: `CANDLES LIT ${candles}`, size: 0.8, color: '#5f7c92', y: -17.2, maxWidth: 26 },
      ],
      buttons: [],
    }),
    [candles],
  )

  /** One slot per soul, scattered from her drive to her bow. */
  const slots = useMemo(
    () =>
      MANIFEST.map((_, i) => {
        const a = (i / MANIFEST.length) * Math.PI * 2
        const r = NAME_RING_R + (((i * 29) % 100) / 100) * 1.5
        return {
          a,
          lx: Math.sin(a) * r,
          lz: Math.cos(a) * r,
          h: 4.2 + (((i * 17) % MANIFEST.length) / MANIFEST.length) * 31.8,
        }
      }),
    [],
  )

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
    const nameRing = nameRingRef.current
    if (nameRing) nameRing.rotation.y += NAME_SPEED * dt
    if (candleRingRef.current) candleRingRef.current.rotation.y += CANDLE_SPEED * dt

    // THE DOCK WAVE: a cone from your nose to the column's heart — names
    // revolving through it swell smoothly and settle back as they leave,
    // the way macOS dock icons rise under the cursor. Close-in only.
    if (nameRing) {
      const ry = nameRing.rotation.y
      const cosR = Math.cos(ry)
      const sinR = Math.sin(ry)
      _axis.set(
        SITE_POS.x - shipRig.position.x,
        SITE_POS.y + 18 - shipRig.position.y,
        SITE_POS.z - shipRig.position.z,
      )
      const dCenter = _axis.length()
      _axis.multiplyScalar(1 / Math.max(dCenter, 0.001))
      const approach = smooth01((MAG_NEAR - dCenter) / 160)
      const halfCos = Math.cos(Math.atan2(15, Math.max(dCenter, 1)))
      const blend = Math.min(1, dt * 7)
      for (let i = 0; i < slots.length; i++) {
        const grp = nameGroups.current[i]
        if (!grp) continue
        const slot = slots[i]
        const vx = SITE_POS.x + slot.lx * cosR + slot.lz * sinR - shipRig.position.x
        const vy = SITE_POS.y + slot.h - shipRig.position.y
        const vz = SITE_POS.z - slot.lx * sinR + slot.lz * cosR - shipRig.position.z
        const len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1
        const ca = (vx * _axis.x + vy * _axis.y + vz * _axis.z) / len
        let t = 0
        // the cone ENDS at the hologram — the far side of the ring stays small
        if (len < dCenter * 1.12 && ca > halfCos) {
          t = smooth01((ca - halfCos) / (1 - halfCos))
        }
        const target = 1 + MAG_MAX * t * approach
        const next = nameScale.current[i] + (target - nameScale.current[i]) * blend
        nameScale.current[i] = next
        grp.scale.setScalar(next)
      }
    }

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
      {/* four projector pedestals, lenses hot — fixtures only, no painted
          shafts (billboard/headlight law: nothing scatters in vacuum;
          the hologram itself is the only projected light you see) */}
      {Array.from({ length: 4 }, (_, i) => {
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
          </group>
        )
      })}
      {/* HER — standing vertical on her drive, whole again */}
      <group position={[0, 22, 0]} rotation={[0, 0.4, Math.PI / 2]} scale={0.48}>
        <primitive object={holoDepthShip} />
        <primitive object={holoShip} />
      </group>
      {/* the crew, revolving around her from drive to bow — each a
          gravestone: the name, and under it the line their people left */}
      <group ref={nameRingRef}>
        {MANIFEST.map((soul, i) => {
          const slot = slots[i]
          return (
            <group
              key={soul.name}
              ref={(el) => {
                nameGroups.current[i] = el
              }}
              position={[slot.lx, slot.h, slot.lz]}
              rotation={[0, slot.a, 0]}
            >
              {/* the holo card: faint edge pane behind, dark glass fill */}
              <mesh position={[0, -0.05, -0.07]} material={cardEdgeMat}>
                <planeGeometry args={[8.0, 1.78]} />
              </mesh>
              <mesh position={[0, -0.05, -0.05]} material={cardMat}>
                <planeGeometry args={[7.8, 1.62]} />
              </mesh>
              <Text
                font={FONT_BOLD}
                fontSize={0.46}
                letterSpacing={0.2}
                color="#d6ecff"
                fillOpacity={0.9}
                anchorX="center"
                anchorY="bottom"
                position={[0, 0.1, 0]}
                material-toneMapped={false}
                material-depthWrite={false}
              >
                {soul.name}
              </Text>
              <Text
                font={FONT_BOLD}
                fontSize={0.24}
                letterSpacing={0.14}
                color="#86b8d8"
                fillOpacity={0.7}
                anchorX="center"
                anchorY="top"
                maxWidth={7}
                textAlign="center"
                position={[0, -0.1, 0]}
                material-toneMapped={false}
                material-depthWrite={false}
              >
                {soul.line}
              </Text>
            </group>
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
      {/* the memorial board — her story, off the platform's edge,
          station-kept like every board in the neighborhood */}
      <Billboard
        spec={boardSpec}
        accentColor="#9fdcff"
        position={[-30, 20, 0]}
        planetWorldPos={SITE_POS}
      />
    </group>
  )
}

useGLTF.preload(NILAK_URL)
