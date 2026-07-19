import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Ship } from './scene/Ship'
import { SkyDome } from './scene/SkyDome'
import { ChaseCamera } from './scene/ChaseCamera'
import { Starfield } from './scene/Starfield'
import { StarSystem } from './scene/StarSystem'
import { ContactStation } from './scene/ContactStation'
import { Effects } from './scene/Effects'
import { useShipControls } from './systems/useShipControls'
import { HudBridge } from './hud/HudBridge'
import { HUD } from './hud/HUD'
import { ALL_SYSTEMS } from './config/systems'

export default function App() {
  useShipControls()

  return (
    <div id="app">
      <Canvas
        gl={{ logarithmicDepthBuffer: true, antialias: true }}
        camera={{ fov: 62, near: 0.5, far: 60000 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#020814']} />
        <ambientLight intensity={0.12} />
        <hemisphereLight args={['#4a6b9a', '#0a0e1a', 0.35]} />
        {/* Offline studio-space environment for metallic reflections */}
        <Environment resolution={64}>
          <Lightformer intensity={1.4} color="#8fb8e8" position={[0, 6, -9]} scale={[12, 6, 1]} />
          <Lightformer intensity={0.8} color="#ffd9a0" position={[-8, 2, 4]} scale={[6, 4, 1]} />
          <Lightformer intensity={0.5} color="#3a5a8a" position={[8, -4, 2]} scale={[8, 5, 1]} />
        </Environment>
        <SkyDome />
        <Starfield />
        {ALL_SYSTEMS.map((system) => (
          <StarSystem key={system.id} config={system} />
        ))}
        <ContactStation />
        <Ship />
        <ChaseCamera />
        <HudBridge />
        <Effects />
      </Canvas>

      <HUD />
    </div>
  )
}
