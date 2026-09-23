import { createRoot } from 'react-dom/client'
import { Suspense, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, View, useGLTF } from '@react-three/drei'
import { Box3, Vector3 } from 'three'
import { DrivePlume } from '../scene/DrivePlume'
import { NpcPlume, type NpcPlumeHandle } from '../scene/fx/NpcPlume'
import { DraugrPlumes, createDrivePower } from '../scene/fx/DraugrPlumes'
import { CLASSES } from '../config/laneClasses'
import { shipRig } from '../state/shipRig'

/**
 * SHIPS & DRIVES — the judging bench, v2 (his ask 2026-09-14): one
 * WINDOW PER SHIP, each with its own orbit camera, because a shared
 * scene made inspection miserable. One WebGL context, scissored views
 * (drei View). Every hull burns the game's own drive plume from its
 * REAL bells — positions and diameters measured off each mesh with the
 * cluster tool (2026-09-23), flames aligned to the true aft axis.
 */

const stageState = { stage: 1.2 }

document.querySelectorAll<HTMLButtonElement>('#panel button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#panel button').forEach((x) => x.classList.remove('on'))
    b.classList.add('on')
    stageState.stage = Number(b.dataset.stage)
  })
})

function PlayerShip() {
  const gltf = useGLTF('/models/tachi.glb')
  const MODEL_SCALE = 0.0135
  const MODEL_CENTER = 57.65 * MODEL_SCALE
  useFrame(() => {
    shipRig.thrusting = stageState.stage > 0.05
    shipRig.boosting = stageState.stage > 1.4
  })
  return (
    <group>
      <group position={[0, -MODEL_CENTER, 0]} rotation-y={Math.PI}>
        <group rotation-x={-Math.PI / 2} scale={MODEL_SCALE}>
          <primitive object={gltf.scene} />
        </group>
        <group position={[0, -3.08, 0]}>
          <DrivePlume />
        </group>
      </group>
    </group>
  )
}

function LaneShip({ cls }: { cls: number }) {
  const def = CLASSES[cls]
  const gltf = useGLTF(def.url)
  const handles = useRef<(NpcPlumeHandle | null)[]>([])
  useFrame(() => {
    for (let b = 0; b < def.bells.length; b++) handles.current[b]?.setStage(stageState.stage)
  })
  return (
    <group>
      <primitive object={gltf.scene} />
      {def.bells.map((bell, b) => (
        <group
          key={b}
          position={[def.plumeX, bell[0], bell[1]]}
          rotation={[0, 0, -Math.PI / 2]}
          scale={def.bellDia / 7}
        >
          <NpcPlume
            ref={(h) => {
              handles.current[b] = h
            }}
            dia={7}
            len={38}
          />
        </group>
      ))}
    </group>
  )
}

function Draugr() {
  const gltf = useGLTF('/models/draugr.glb')
  const drive = useRef(createDrivePower()).current
  useFrame(() => {
    drive.power = Math.min(1, stageState.stage / 2)
  })
  return (
    <group>
      <primitive object={gltf.scene} />
      <DraugrPlumes drive={drive} />
    </group>
  )
}

/**
 * A measured drive rig: bell exit positions and diameters in the MODEL's
 * own coordinate space (read off the mesh with the cluster tool), plus a
 * rotation that points the plume's local -Y down the ship's real aft
 * axis. Bells: [x, y, z, dia].
 */
interface CandidateRig {
  rot: [number, number, number]
  bells: [number, number, number, number][]
}

/** local -Y → given aft axis */
const AFT = {
  negX: [0, 0, -Math.PI / 2] as [number, number, number],
  posX: [0, 0, Math.PI / 2] as [number, number, number],
  negZ: [Math.PI / 2, 0, 0] as [number, number, number],
  posZ: [-Math.PI / 2, 0, 0] as [number, number, number],
}

function CandidateShip({ url, rig }: { url: string; rig?: CandidateRig }) {
  const gltf = useGLTF(url)
  const holder = useRef({ done: false })
  const handles = useRef<(NpcPlumeHandle | null)[]>([])
  useFrame(() => {
    for (let b = 0; b < (rig?.bells.length ?? 0); b++) handles.current[b]?.setStage(stageState.stage)
    if (holder.current.done) return
    const scene = gltf.scene
    const box = new Box3().setFromObject(scene)
    const size = box.getSize(new Vector3())
    const max = Math.max(size.x, size.y, size.z)
    if (!isFinite(max) || max <= 0) return
    const s = 55 / max
    const center = box.getCenter(new Vector3())
    scene.scale.setScalar(s)
    scene.position.copy(center).multiplyScalar(-s)
    holder.current.done = true
  })
  return (
    <primitive object={gltf.scene}>
      {rig?.bells.map(([x, y, z, d], i) => (
        <group key={i} position={[x, y, z]} rotation={rig.rot} scale={d / 7}>
          <NpcPlume
            ref={(h) => {
              handles.current[i] = h
            }}
            dia={7}
            len={38}
          />
        </group>
      ))}
    </primitive>
  )
}

/** Bell maps measured from the hulls (cluster.mjs, 2026-09-23). */
const RIGS: Record<string, CandidateRig> = {
  c3: { rot: AFT.posZ, bells: [[-3620, -1155, 14250, 620], [3620, -1155, 14250, 620]] },
  c16: { rot: [Math.PI / 4, 0, 0], bells: [
    [-24.2, -49.2, -221.8, 13], [0, -49.2, -221.8, 13], [24.2, -49.2, -221.8, 13],
    [-20.4, -41.9, -229.2, 13], [20.4, -41.9, -229.2, 13],
    [-46.4, -33.4, -239, 13], [46.4, -33.4, -239, 13] ] },
  donnager: { rot: AFT.negZ, bells: [
    [-110.8, 153.3, -305, 52], [110.8, 153.3, -305, 52], [-110.8, -68.5, -305, 52], [110.8, -68.5, -305, 52] ] },
  epstein: { rot: AFT.posX, bells: [[199, -0.2, -353.5, 26]] },
  nostromo: { rot: AFT.negZ, bells: [[-233.7, 541.5, -640, 135], [233.7, 541.5, -640, 135]] },
  preuss: { rot: AFT.negZ, bells: [[0, 0, -1.62, 0.38]] },
  virgon: { rot: AFT.negX, bells: [[-69.5, 4.7, 11.4, 6.5], [-69.5, 4.7, 21.8, 6.5]] },
  perseus: { rot: AFT.posZ, bells: [
    [-4.6, -5.2, -84, 4], [-7.4, -7.8, -84, 4], [-10.2, -10.4, -84, 4], [-13, -13, -84, 4], [-4.8, -12, -84, 4],
    [4.6, -5.2, -84, 4], [7.4, -7.8, -84, 4], [10.2, -10.4, -84, 4], [13, -13, -84, 4], [4.8, -12, -84, 4] ] },
  spacecraft03: { rot: [0, 0, 0], bells: [
    [-11.2, -84.5, -16.7, 16], [19.7, -84.5, -16.7, 16], [-11.2, -84.5, -66.1, 16], [19.7, -84.5, -66.1, 16] ] },
  rusty: { rot: AFT.negZ, bells: [[7.4, -0.6, -5.8, 2.6]] },
  zanzibus: { rot: AFT.negZ, bells: [[-2.1, 0.7, -5.4, 1.8], [2.4, 0.7, -5.4, 1.8]] },
}

interface CellDef {
  name: string
  dist: number
  el: ReactElement
}

const CELLS: CellDef[] = [
  { name: 'BLT-1129 · YOUR SHIP', dist: 14, el: <PlayerShip /> },
  { name: 'ICE HAULER · KEPT', dist: 110, el: <LaneShip cls={0} /> },
  { name: 'THE DRAUGR', dist: 80, el: <Draugr /> },
  { name: 'A · CARGO SPACESHIP', dist: 95, el: <CandidateShip url="/models/candidates/c3.glb" rig={RIGS.c3} /> },
  { name: 'C · BUEY II', dist: 95, el: <CandidateShip url="/models/candidates/c16.glb" rig={RIGS.c16} /> },
  { name: 'F · MCRN DONNAGER · EXPANSE CANON', dist: 95, el: <CandidateShip url="/models/candidates/donnager.glb" rig={RIGS.donnager} /> },
  { name: "G · EPSTEIN'S YACHT · EXPANSE CANON", dist: 95, el: <CandidateShip url="/models/candidates/epstein.glb" rig={RIGS.epstein} /> },
  { name: 'H · NOSTROMO COMMERCIAL TUG', dist: 95, el: <CandidateShip url="/models/candidates/nostromo.glb" rig={RIGS.nostromo} /> },
  { name: 'I · INDUSTRIAL SHIP (PREUSS CONCEPT)', dist: 95, el: <CandidateShip url="/models/candidates/preuss.glb" rig={RIGS.preuss} /> },
  { name: 'K · VIRGON EXPRESS · SALVAGE TYPE', dist: 95, el: <CandidateShip url="/models/candidates/virgon.glb" rig={RIGS.virgon} /> },
  { name: 'L · PERSEUS POD FREIGHTER · STAR TYPE', dist: 95, el: <CandidateShip url="/models/candidates/perseus.glb" rig={RIGS.perseus} /> },
  { name: 'M · SPACECRAFT-03 · SALVAGE TYPE', dist: 95, el: <CandidateShip url="/models/candidates/spacecraft03.glb" rig={RIGS.spacecraft03} /> },
  { name: 'N · RUSTY HAULER · SALVAGE TYPE', dist: 95, el: <CandidateShip url="/models/candidates/rusty.glb" rig={RIGS.rusty} /> },
  { name: 'O · ZANZIBUS EXPRESS · STAR TYPE', dist: 95, el: <CandidateShip url="/models/candidates/zanzibus.glb" rig={RIGS.zanzibus} /> },
]

function Cell({ def }: { def: CellDef }) {
  return (
    <div className="cell">
      <div className="cell-label">{def.name}</div>
      <View className="cell-view">
        <color attach="background" args={['#070a10']} />
        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#7c95b5', '#1a2230', 0.85]} />
        <directionalLight position={[1, 2, 1.4]} intensity={1.7} />
        <PerspectiveCamera
          makeDefault
          fov={45}
          near={0.1}
          far={5000}
          position={[def.dist * 0.75, def.dist * 0.3, def.dist * 0.75]}
        />
        <OrbitControls makeDefault enableDamping target={[0, 0, 0]} />
        <Suspense fallback={null}>{def.el}</Suspense>
      </View>
    </div>
  )
}

function App(): ReactNode {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  return (
    <div ref={setContainer} className="holder">
      <div className="grid">
        {CELLS.map((c) => (
          <Cell key={c.name} def={c} />
        ))}
      </div>
      {container && (
        <Canvas
          eventSource={container}
          className="view-canvas"
          gl={{ antialias: true }}
          style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}
        >
          <View.Port />
        </Canvas>
      )}
    </div>
  )
}

createRoot(document.getElementById('bench')!).render(<App />)
