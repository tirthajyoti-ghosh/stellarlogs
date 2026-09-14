import { createRoot } from 'react-dom/client'
import { useRef, type ReactElement } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { DrivePlume } from '../scene/DrivePlume'
import { NpcPlume, type NpcPlumeHandle } from '../scene/fx/NpcPlume'
import { DraugrPlumes, createDrivePower } from '../scene/fx/DraugrPlumes'
import { CLASSES } from '../config/laneClasses'
import { shipRig } from '../state/shipRig'

/**
 * SHIPS & DRIVES — the judging bench (his ask 2026-09-14): every hull
 * in the universe with its drive exhaust EXACTLY as the game runs it —
 * same models, same plume modules, same class config, same offsets —
 * orbitable so the rig can be inspected from any angle. The buttons
 * stage every drive at once (the player's plume is driven through
 * shipRig, the same switch the game uses).
 */

const stageState = { stage: 1.2 }

// panel wiring (plain DOM, outside React)
document.querySelectorAll<HTMLButtonElement>('#panel button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#panel button').forEach((x) => x.classList.remove('on'))
    b.classList.add('on')
    stageState.stage = Number(b.dataset.stage)
  })
})

/** the player's hull, mounted exactly as Ship.tsx mounts it */
function PlayerShip() {
  const gltf = useGLTF('/models/tachi.glb')
  const MODEL_SCALE = 0.0135
  const MODEL_CENTER = 57.65 * MODEL_SCALE
  useFrame(() => {
    // stage the game's own throttle flags; DrivePlume reads these
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

/** one lane hull with its class's real bell layout */
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

const SHIPS: { name: string; x: number; el: ReactElement }[] = [
  { name: 'BLT-1129 · YOUR SHIP', x: 0, el: <PlayerShip /> },
  { name: 'ICE HAULER · 2 BELLS', x: 70, el: <LaneShip cls={0} /> },
  { name: 'SALVAGE HAULER · 2 BELLS', x: 160, el: <LaneShip cls={1} /> },
  { name: 'STAR FREIGHTER · 3 BELLS', x: 260, el: <LaneShip cls={2} /> },
  { name: 'THE DRAUGR · 4 BELLS', x: 350, el: <Draugr /> },
]

function Bench() {
  return (
    <Canvas camera={{ fov: 50, near: 0.1, far: 5000, position: [160, 40, 220] }} gl={{ antialias: true }}>
      <color attach="background" args={['#06090f']} />
      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#7c95b5', '#1a2230', 0.8]} />
      <directionalLight position={[200, 300, 200]} intensity={1.6} />
      <OrbitControls target={[160, 0, 0]} enableDamping />
      {SHIPS.map((s) => (
        <group key={s.name} position={[s.x, 0, 0]}>
          {s.el}
        </group>
      ))}
    </Canvas>
  )
}

createRoot(document.getElementById('bench')!).render(<Bench />)
