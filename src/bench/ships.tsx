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
 * scene made inspection miserable. One WebGL context, ten scissored
 * views (drei View). Every hull carries its exhaust rig exactly as
 * the game runs it; candidates carry none until a hull is chosen and
 * its bells are measured.
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

function CandidateShip({ url }: { url: string }) {
  const gltf = useGLTF(url)
  const holder = useRef({ done: false })
  useFrame(() => {
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
  return <primitive object={gltf.scene} />
}

interface CellDef {
  name: string
  dist: number
  el: ReactElement
}

const CELLS: CellDef[] = [
  { name: 'BLT-1129 · YOUR SHIP', dist: 14, el: <PlayerShip /> },
  { name: 'ICE HAULER', dist: 110, el: <LaneShip cls={0} /> },
  { name: 'SALVAGE HAULER', dist: 100, el: <LaneShip cls={1} /> },
  { name: 'STAR FREIGHTER', dist: 130, el: <LaneShip cls={2} /> },
  { name: 'THE DRAUGR', dist: 80, el: <Draugr /> },
  { name: 'A · CARGO SPACESHIP', dist: 95, el: <CandidateShip url="/models/candidates/c3.glb" /> },
  { name: 'B · TRANSPORTER', dist: 95, el: <CandidateShip url="/models/candidates/c15.glb" /> },
  { name: 'C · BUEY II', dist: 95, el: <CandidateShip url="/models/candidates/c16.glb" /> },
  { name: 'D · HAULER', dist: 95, el: <CandidateShip url="/models/candidates/c17.glb" /> },
  { name: 'E · SPACESHIP-CARGO', dist: 95, el: <CandidateShip url="/models/candidates/c0.glb" /> },
  { name: 'F · MCRN DONNAGER · EXPANSE CANON', dist: 95, el: <CandidateShip url="/models/candidates/donnager.glb" /> },
  { name: "G · EPSTEIN'S YACHT · EXPANSE CANON", dist: 95, el: <CandidateShip url="/models/candidates/epstein.glb" /> },
  { name: 'H · NOSTROMO COMMERCIAL TUG', dist: 95, el: <CandidateShip url="/models/candidates/nostromo.glb" /> },
  { name: 'I · INDUSTRIAL SHIP (PREUSS CONCEPT)', dist: 95, el: <CandidateShip url="/models/candidates/preuss.glb" /> },
  { name: 'J · VALLEY FORGE GREENHOUSE FREIGHTER', dist: 95, el: <CandidateShip url="/models/candidates/valleyforge.glb" /> },
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
