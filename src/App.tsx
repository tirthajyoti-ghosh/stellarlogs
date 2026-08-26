import { Component, Suspense, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Ship } from './scene/Ship'
import { SkyDome } from './scene/SkyDome'
import { ChaseCamera } from './scene/ChaseCamera'
import { Starfield } from './scene/Starfield'
import { StarSystem } from './scene/StarSystem'
import { ContactStation } from './scene/ContactStation'
import { Asteroids } from './scene/Asteroids'
import { SleepingSpread } from './scene/SleepingSpread'
import { CargoSpills } from './scene/CargoSpills'
import { NilakVigil } from './scene/NilakVigil'
import { SmallSecrets } from './scene/SmallSecrets'
import { DriftKillBoard } from './scene/DriftKillBoard'
import { DriftCrib } from './scene/DriftCrib'
import { KhioneSleet } from './scene/activities/KhioneSleet'
import { GunneryRange } from './scene/activities/GunneryRange'
import { IceRoute } from './scene/activities/IceRoute'
import { BeltRun } from './scene/activities/BeltRun'
import { DraugrSighting } from './scene/DraugrSighting'
import { InteramniaDrift } from './scene/InteramniaDrift'
import { Explosions } from './scene/fx/Explosions'
import { HullDamage } from './scene/fx/HullDamage'
import { Effects } from './scene/Effects'
import { AdaptiveResolution } from './scene/AdaptiveResolution'
import { HardenMaterials } from './scene/HardenMaterials'
import { useShipControls } from './systems/useShipControls'
import { startChatter } from './audio/chatter'
import { HudBridge } from './hud/HudBridge'
import { HUD } from './hud/HUD'
import { SeoContent } from './SeoContent'
import { ALL_SYSTEMS } from './config/systems'
import { QUALITY } from './config/quality'
import { PROBES } from './config/probes'
import { PostFxGate } from './scene/PostFxGate'

/**
 * If the 3D canvas dies — GL context creation failing under GPU pressure,
 * a driver reset, anything that makes the R3F tree throw — the failure mode
 * must be a readable screen, not an uncaught React error over a black page.
 * One observed in the field (2026-08-05): React #185 out of R3F's GL
 * bring-up gate on a loaded machine, unreproducible on three environments
 * here. The world can be mortal; the page cannot.
 */
class GlFaultBoundary extends Component<{ children: ReactNode }, { fault: boolean }> {
  state = { fault: false }
  static getDerivedStateFromError() {
    return { fault: true }
  }
  componentDidCatch(error: unknown) {
    console.error('[stellarlogs] render fault — canvas safed', error)
  }
  render() {
    if (!this.state.fault) return this.props.children
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#020814',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          fontFamily: "'Space Mono', ui-monospace, monospace",
          color: '#9fb2c8',
          zIndex: 40,
        }}
      >
        <div style={{ color: '#ffb454', letterSpacing: '0.3em', fontSize: '13px' }}>
          REACTOR FAULT
        </div>
        <div style={{ fontSize: '11px', letterSpacing: '0.12em', opacity: 0.8 }}>
          GRAPHICS CONTEXT FAILED — SYSTEMS SAFED
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '10px',
            padding: '10px 26px',
            background: 'transparent',
            border: '1px solid #ffb454',
            color: '#ffb454',
            fontFamily: 'inherit',
            fontSize: '12px',
            letterSpacing: '0.25em',
            cursor: 'pointer',
          }}
        >
          RE-IGNITE
        </button>
      </div>
    )
  }
}

export default function App() {
  useShipControls()
  startChatter()

  return (
    <div id="app">
      <GlFaultBoundary>
      <Canvas
        gl={{ logarithmicDepthBuffer: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 62, near: 0.5, far: 60000 }}
        /**
         * No `dpr` prop on purpose. R3F re-applies that prop from `configure()`
         * on every Canvas render, which snapped any runtime change straight
         * back to the tier ceiling — <AdaptiveResolution> owns the pixel ratio
         * instead, and sets the tier ceiling itself on its first frame.
         */
        onCreated={({ gl }) => {
          // his brightness notches (round 2, 2026-08-26): cumulative +55%
          // — a phone in daylight was reading dark, and desktop takes it too
          gl.toneMappingExposure = 1.55
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
          /**
           * Context-loss breadcrumbs. three itself preventDefaults the loss
           * and restores the context (WebGLRenderer.onContextLost) — these
           * listeners only make the event VISIBLE, because a field report of
           * "console error at open" (React #185 from R3F's own GL bring-up
           * gate churning, seen 2026-08-05 on a machine under GPU pressure)
           * is undiagnosable without knowing whether the context blinked.
           */
          gl.domElement.addEventListener('webglcontextlost', () => {
            console.warn('[stellarlogs] WebGL context lost — three will attempt restore')
          })
          gl.domElement.addEventListener('webglcontextrestored', () => {
            console.info('[stellarlogs] WebGL context restored')
          })
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
        <SleepingSpread />
        <CargoSpills />
        <NilakVigil />
        <SmallSecrets />
        <DriftKillBoard />
        <DriftCrib />
        <Suspense fallback={null}>
          <GunneryRange />
          <IceRoute />
          <KhioneSleet />
          <BeltRun />
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
        {QUALITY.postprocessing && <PostFxGate><Effects /></PostFxGate>}
      </Canvas>
      </GlFaultBoundary>

      <HUD />
      <SeoContent />
    </div>
  )
}
