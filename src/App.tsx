import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Ship } from './scene/Ship'
import { SkyDome } from './scene/SkyDome'
import { ChaseCamera } from './scene/ChaseCamera'
import { Starfield } from './scene/Starfield'
import { StarSystem } from './scene/StarSystem'
import { ContactStation } from './scene/ContactStation'
import { Asteroids } from './scene/Asteroids'
import { GunneryRange } from './scene/activities/GunneryRange'
import { IceRoute } from './scene/activities/IceRoute'
import { BeltRun } from './scene/activities/BeltRun'
import { Wreck } from './scene/Wreck'
import { DraugrSighting } from './scene/DraugrSighting'
import { InteramniaDrift } from './scene/InteramniaDrift'
import { Explosions } from './scene/fx/Explosions'
import { HullDamage } from './scene/fx/HullDamage'
import { Effects } from './scene/Effects'
import { AdaptiveResolution } from './scene/AdaptiveResolution'
import { HardenMaterials } from './scene/HardenMaterials'
import { useShipControls } from './systems/useShipControls'
import { HudBridge } from './hud/HudBridge'
import { HUD } from './hud/HUD'
import { SeoContent } from './SeoContent'
import { ALL_SYSTEMS } from './config/systems'
import { QUALITY } from './config/quality'
import { PROBES } from './config/probes'

export default function App() {
  useShipControls()

  return (
    <div id="app">
      <Canvas
        gl={{ logarithmicDepthBuffer: true, antialias: true }}
        camera={{ fov: 62, near: 0.5, far: 60000 }}
        /**
         * No `dpr` prop on purpose. R3F re-applies that prop from `configure()`
         * on every Canvas render, which snapped any runtime change straight
         * back to the tier ceiling — <AdaptiveResolution> owns the pixel ratio
         * instead, and sets the tier ceiling itself on its first frame.
         */
        onCreated={({ gl }) => {
          /**
           * three asks the driver for the shader info log straight after
           * linking, and that question cannot be answered until linking has
           * finished — one profile showed 253 ms sitting inside
           * `getProgramInfoLog` on an approach to the Comms Station. An A/B of
           * this flag alone did NOT isolate a repeatable win, so it is not
           * claimed as the fix; it is kept because the cost is real when it
           * lands and there is nothing to gain from asking in a build whose
           * shaders are already known to compile. Checks stay on in dev, where
           * a broken shader should be loud.
           */
          gl.debug.checkShaderErrors = import.meta.env.DEV
          if (PROBES) {
            // enough of the renderer to measure it: the flag above, GPU timer
            // queries, and the scene graph for attributing cost per subtree
            const w = window as unknown as Record<string, unknown>
            w.__gl = gl
          }
        }}
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
        <Asteroids />
        <Suspense fallback={null}>
          <GunneryRange />
          <IceRoute />
          <BeltRun />
          <Wreck />
          <DraugrSighting />
          <InteramniaDrift />
          <Explosions />
          {/* Player hull breaches: shared across all combat activities */}
          <HullDamage />
        </Suspense>
        <Ship />
        <ChaseCamera />
        <AdaptiveResolution />
        <HardenMaterials />
        <HudBridge />
        {QUALITY.postprocessing && <Effects />}
      </Canvas>

      <HUD />
      <SeoContent />
    </div>
  )
}
