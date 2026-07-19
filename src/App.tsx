import { Canvas } from '@react-three/fiber'
import { Ship } from './scene/Ship'
import { ChaseCamera } from './scene/ChaseCamera'
import { Starfield } from './scene/Starfield'
import { useShipControls } from './systems/useShipControls'
import { DEV_SUN_POSITION, DEV_SUN_RADIUS } from './config/universe'

function DevSun() {
  return (
    <group position={DEV_SUN_POSITION}>
      <mesh>
        <sphereGeometry args={[DEV_SUN_RADIUS, 48, 48]} />
        <meshBasicMaterial color="#ffce73" toneMapped={false} />
      </mesh>
      <pointLight color="#fff2dd" intensity={4} distance={30000} decay={0.4} />
    </group>
  )
}

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
        <ambientLight intensity={0.15} />
        <hemisphereLight args={['#4a6b9a', '#0a0e1a', 0.55]} />
        <Starfield />
        <DevSun />
        <Ship />
        <ChaseCamera />
      </Canvas>

      <div className="dev-hint" data-ui>
        <strong>W/↑</strong> thrust · <strong>S/↓</strong> brake · <strong>A/D</strong> turn ·{' '}
        <strong>R/F</strong> pitch · <strong>Shift</strong> boost · or <strong>drag</strong> to steer
      </div>
    </div>
  )
}
