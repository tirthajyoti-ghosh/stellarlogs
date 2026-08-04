import { useEffect, useMemo, useRef, useState } from 'react'
import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
} from 'three'
import type { BoardSpec } from './boardSpecs'
import { FONT, FONT_BOLD } from './font'
import { getGlowDot, getMetalMap } from './panelTexture'
import { createPanelMaterial, lampLayout } from './panelMaterial'
import { shipRig } from '../../state/shipRig'
import { perfFlags } from '../../config/perfFlags'

interface BillboardProps {
  spec: BoardSpec
  accentColor: string
  position: [number, number, number]
  /** Live world position of the parent planet, to aim the board at the ship */
  planetWorldPos: Vector3
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

function ImagePlane({ url, width, height }: { url: string; width: number; height: number }) {
  const materialRef = useRef<MeshBasicMaterial>(null)

  useEffect(() => {
    let disposed = false
    let loaded: Texture | null = null
    const loader = new TextureLoader()
    loader.setCrossOrigin('anonymous')
    loader.load(
      url,
      (tex) => {
        if (disposed) {
          tex.dispose()
          return
        }
        tex.colorSpace = SRGBColorSpace
        loaded = tex
        const material = materialRef.current
        if (material) {
          material.map = tex
          material.color.set('#ffffff')
          material.needsUpdate = true
        }
      },
      undefined,
      () => {}, // failed loads just keep the placeholder panel
    )
    return () => {
      disposed = true
      loaded?.dispose()
    }
  }, [url])

  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial ref={materialRef} color="#0a1830" toneMapped={false} />
    </mesh>
  )
}

function LinkRow({
  label,
  url,
  width,
  height,
  y,
  accentColor,
}: {
  label: string
  url: string
  width: number
  height: number
  y: number
  accentColor: string
}) {
  const meshRef = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hovered])

  return (
    <group position={[0, y, 0.4]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          window.open(url, '_blank', 'noopener')
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.04 : 1}
      >
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color={hovered ? new Color(accentColor).multiplyScalar(0.45) : '#0c1a30'}
          transparent
          opacity={0.92}
        />
      </mesh>
      <Text
        font={FONT}
        fontSize={3.1}
        color={accentColor}
        anchorX="center"
        anchorY="middle"
        position={[0, 0, 0.2]}
        maxWidth={width - 4}
      >
        {label}
      </Text>
    </group>
  )
}

/**
 * SHARED materials. The spread-props JSX (`<meshStandardMaterial {...FRAME}/>`)
 * created one material INSTANCE per mesh — measured at ~2,950 material objects
 * across the world's 82 boards, every one a separate uniform block and a
 * potential program switch. The values were identical; only the identity
 * differed. These lazy singletons keep the exact same values with one identity,
 * so the change is pixel-equal by construction.
 *
 * Not shared on purpose: PuffJet materials (opacity animated per jet), LinkRow
 * materials (hover state per row), ImagePlane (mutates itself when the photo
 * lands), and the panel ShaderMaterial (per-board uniforms).
 */
let frameMat: MeshStandardMaterial | null = null
let darkMat: MeshStandardMaterial | null = null
let coneMat: MeshStandardMaterial | null = null
let glareMat: MeshBasicMaterial | null = null
const lampFaceMats: MeshBasicMaterial[] = []
const accentMats = new Map<string, { marker: MeshBasicMaterial; glow: MeshBasicMaterial }>()

function getFrameMat(): MeshStandardMaterial {
  if (!frameMat)
    frameMat = new MeshStandardMaterial({
      color: '#39414d',
      metalness: 0.55,
      roughness: 0.62,
      flatShading: true,
      emissive: '#0d1420',
      emissiveIntensity: 1,
      map: getMetalMap(),
    })
  return frameMat
}
function getDarkMat(): MeshStandardMaterial {
  if (!darkMat)
    darkMat = new MeshStandardMaterial({
      color: '#161c26',
      metalness: 0.6,
      roughness: 0.7,
      flatShading: true,
      map: getMetalMap(),
    })
  return darkMat
}
/** open thruster cone — the one legitimate double-sided surface */
function getConeMat(): MeshStandardMaterial {
  if (!coneMat) {
    coneMat = new MeshStandardMaterial({
      color: '#161c26',
      metalness: 0.6,
      roughness: 0.7,
      flatShading: true,
      map: getMetalMap(),
      side: 2,
    })
    coneMat.userData.keepDoubleSide = true
  }
  return coneMat
}
function getLampFaceMat(i: number): MeshBasicMaterial {
  if (!lampFaceMats[i]) {
    const v = [0.92, 1.1, 0.84][i] ?? 1
    lampFaceMats[i] = new MeshBasicMaterial({ toneMapped: false })
    lampFaceMats[i].color.setRGB(2.6 * v, 2.42 * v, 1.98 * v)
  }
  return lampFaceMats[i]
}
function getGlareMat(): MeshBasicMaterial {
  if (!glareMat) {
    glareMat = new MeshBasicMaterial({
      map: getGlowDot(),
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    glareMat.color.setRGB(1.5, 1.4, 1.15)
  }
  return glareMat
}
function getAccentMats(accent: string): { marker: MeshBasicMaterial; glow: MeshBasicMaterial } {
  let m = accentMats.get(accent)
  if (!m) {
    m = {
      marker: new MeshBasicMaterial({ color: accent, toneMapped: false }),
      glow: new MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.55, toneMapped: false }),
    }
    accentMats.set(accent, m)
  }
  return m
}

/** Structural frame, back bus, thruster pods — the Futurama satellite rig. */
function BoardStructure({ width: w, height: h, accentColor }: { width: number; height: number; accentColor: string }) {
  const beam = 2.2
  return (
    <group>
      {/* Perimeter frame beams */}
      <mesh position={[0, h / 2 + beam / 2, -0.5]} material={getFrameMat()}>
        <boxGeometry args={[w + beam * 2, beam, 2.4]} />
      </mesh>
      <mesh position={[0, -h / 2 - beam / 2, -0.5]} material={getFrameMat()}>
        <boxGeometry args={[w + beam * 2, beam, 2.4]} />
      </mesh>
      <mesh position={[-w / 2 - beam / 2, 0, -0.5]} material={getFrameMat()}>
        <boxGeometry args={[beam, h, 2.4]} />
      </mesh>
      <mesh position={[w / 2 + beam / 2, 0, -0.5]} material={getFrameMat()}>
        <boxGeometry args={[beam, h, 2.4]} />
      </mesh>
      {/* Solid backing plate with ribs */}
      <mesh position={[0, 0, -1.4]} material={getDarkMat()}>
        <boxGeometry args={[w + beam, h + beam, 0.8]} />
      </mesh>
      {[-w / 4, w / 4].map((x) => (
        <mesh key={x} position={[x, 0, -2.1]} material={getFrameMat()}>
          <boxGeometry args={[1.6, h * 0.85, 0.7]} />
        </mesh>
      ))}
      {/* Satellite bus on the back */}
      <mesh position={[0, 0, -3.6]} material={getFrameMat()}>
        <boxGeometry args={[w * 0.22, h * 0.3, 2.6]} />
      </mesh>
      {/* Corner thruster pods (station-keeping — no actual motion) */}
      {[
        [-w / 2, -h / 2],
        [w / 2, -h / 2],
        [-w / 2, h / 2],
        [w / 2, h / 2],
      ].map(([x, y], i) => (
        <group key={i} position={[x, y, -1.2]}>
          <mesh material={getDarkMat()}>
            <boxGeometry args={[2.6, 2.6, 2.6]} />
          </mesh>
          {/* open cone, seen from inside — the shared material keeps side=2
              and userData.keepDoubleSide so HardenMaterials leaves it alone */}
          <mesh
            position={[x > 0 ? 2 : -2, 0, 0]}
            rotation-z={x > 0 ? -Math.PI / 2 : Math.PI / 2}
            material={getConeMat()}
          >
            <coneGeometry args={[0.8, 1.6, 8, 1, true]} />
          </mesh>
        </group>
      ))}
      {/* Blinking marker lights on the top corners */}
      {[-w / 2, w / 2].map((x) => (
        <mesh key={x} position={[x, h / 2 + beam, 0]} material={getAccentMats(accentColor).marker}>
          <sphereGeometry args={[0.9, 8, 8]} />
        </mesh>
      ))}
      {/* Floodlight rig: a boom held off the top frame on two raked standoffs,
          three angled heads aimed back down at the face. The heads sit exactly
          where the panel shader's virtual lamps sit (lampLayout is the single
          source of truth), so the hardware and the light agree. The glowing
          faces are the only HDR emitters here — in vacuum there is nothing to
          scatter a beam in, so what you see is fixtures and lit plate, the way
          night work on a real gantry looks. */}
      <FloodRig width={w} height={h} />
    </group>
  )
}

/** The lamp hardware. Positions and aim come from lampLayout — the same
 *  numbers the panel shader lights with. */
function FloodRig({ width: w, height: h }: { width: number; height: number }) {
  const { positions, tilt } = lampLayout(w, h)
  const boomY = positions[0].y - 0.2
  const boomZ = positions[0].z - 0.4
  return (
    <group>
      {/* boom */}
      <mesh position={[0, boomY, boomZ]} material={getDarkMat()}>
        <boxGeometry args={[w * 0.78, 0.8, 0.8]} />
      </mesh>
      {/* raked standoffs tying the boom back to the top frame */}
      {[-w * 0.3, w * 0.3].map((x) => (
        <mesh key={x} position={[x, boomY - 1.2, boomZ - 1.6]} rotation-x={0.62} material={getDarkMat()}>
          <boxGeometry args={[0.6, 0.6, 3.6]} />
        </mesh>
      ))}
      {/* heads: housing behind, burning face in front, tilted onto the plate */}
      {positions.map((p, i) => (
        <group key={i} position={[p.x, p.y, p.z]} rotation-x={tilt}>
          <mesh position={[0, 0, -0.7]} material={getFrameMat()}>
            <boxGeometry args={[2.2, 1.8, 1.2]} />
          </mesh>
          {/* slightly different age per bulb — nothing in a port matches */}
          <mesh material={getLampFaceMat(i)}>
            <planeGeometry args={[1.7, 1.3]} />
          </mesh>
        </group>
      ))}
      {/* glare: the bulbs read from the reading side even though the heads
          are tilted away — a soft dot, not a beam; vacuum has no beams */}
      {positions.map((p, i) => (
        <mesh key={'g' + i} position={[p.x, p.y - 0.3, p.z + 0.5]} material={getGlareMat()}>
          <planeGeometry args={[2.6, 1.9]} />
        </mesh>
      ))}
    </group>
  )
}

/** A single station-keeping jet: additive cone that puffs when the board turns. */
function PuffJet({
  x,
  z,
  dir,
  jetRef,
}: {
  x: number
  z: number
  dir: 1 | -1
  jetRef: (m: Mesh | null) => void
}) {
  return (
    <mesh ref={jetRef} position={[x, 0, z]} rotation-x={(dir * Math.PI) / 2}>
      <coneGeometry args={[0.7, 3, 8, 1, true]} />
      <meshBasicMaterial
        color="#bfe8ff"
        transparent
        opacity={0}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

const _boardWorld = new Vector3()

/**
 * One content panel as a physical orbital billboard. Geostationary (the parent
 * fixes its position); the board turns on its vertical axis to FACE the ship
 * whenever it's in reading range, firing a visible station-keeping thruster
 * couple while it slews. Its front face is +Z.
 */
export function Billboard({ spec, accentColor, position, planetWorldPos }: BillboardProps) {
  const rootRef = useRef<Group>(null)
  const spinRef = useRef<Group>(null)
  // Deterministic per-board start angle so they don't all begin aligned
  const phase = useMemo(() => (spec.width * 7.31 + spec.height * 3.7) % 6.28, [spec.width, spec.height])
  const jets = useRef<{ leftF: Mesh | null; leftB: Mesh | null; rightF: Mesh | null; rightB: Mesh | null }>({
    leftF: null,
    leftB: null,
    rightF: null,
    rightB: null,
  })
  const initialized = useRef(false)
  const panelMaterial = useMemo(
    () => createPanelMaterial(spec.width, spec.height),
    [spec.width, spec.height],
  )
  useEffect(() => () => panelMaterial.dispose(), [panelMaterial])

  const halfW = spec.width / 2 + 2

  useFrame((_, dt) => {
    const spin = spinRef.current
    const root = rootRef.current
    if (!spin || !root) return
    if (!initialized.current) {
      spin.rotation.y = phase
      initialized.current = true
      /**
       * Everything inside the spinning group — frame, panels, text, jets — is
       * bolted in place and never moves relative to the board. three does not
       * know that, so it rebuilt each of their local matrices every frame:
       * 146 ms in `updateMatrix` and 293 ms in `updateMatrixWorld` on one
       * approach, across all the boards on screen. Computing them once and
       * turning the automatic update off keeps the world matrices correct
       * (those still follow the parent) while dropping the per-frame rebuild.
       */
      if (perfFlags.boardWarmup) {
        spin.updateMatrixWorld(true)
        spin.traverse((child) => {
          if (child !== spin) child.matrixAutoUpdate = false
        })
      }
    }

    // Board world position = planet position + this board's fixed local offset
    _boardWorld.copy(planetWorldPos).add(root.position)
    const dx = shipRig.position.x - _boardWorld.x
    const dz = shipRig.position.z - _boardWorld.z
    // Front face is +Z; aim it at the ship (yaw only — signs stay upright)
    const targetYaw = Math.atan2(dx, dz)
    const delta = wrapAngle(targetYaw - spin.rotation.y)

    // Slow, visible slew with a rate cap; RCS couple fires while turning
    const RATE = 0.7 // rad/s
    const maxStep = RATE * dt
    const step = MathUtils.clamp(delta, -maxStep, maxStep)
    spin.rotation.y += step

    const effort = Math.abs(delta) > 0.015 ? Math.min(1, Math.abs(step) / Math.max(1e-5, maxStep)) : 0
    // step > 0 (turning one way) fires left-back + right-front, and vice-versa
    const cwFire = step > 0 ? effort : 0
    const ccwFire = step < 0 ? effort : 0
    const set = (m: Mesh | null, v: number) => {
      if (m) (m.material as MeshBasicMaterial).opacity = MathUtils.lerp((m.material as MeshBasicMaterial).opacity, v * 0.9, 0.35)
    }
    set(jets.current.leftB, cwFire)
    set(jets.current.rightF, cwFire)
    set(jets.current.leftF, ccwFire)
    set(jets.current.rightB, ccwFire)
  })

  return (
    <group ref={rootRef} position={position}>
      <group ref={spinRef}>
        <BoardStructure width={spec.width} height={spec.height} accentColor={accentColor} />
        {/* Station-keeping jets: a yaw couple at the left/right edges */}
        <PuffJet x={-halfW} z={3} dir={1} jetRef={(m) => (jets.current.leftF = m)} />
        <PuffJet x={-halfW} z={-3} dir={-1} jetRef={(m) => (jets.current.leftB = m)} />
        <PuffJet x={halfW} z={3} dir={1} jetRef={(m) => (jets.current.rightF = m)} />
        <PuffJet x={halfW} z={-3} dir={-1} jetRef={(m) => (jets.current.rightB = m)} />
        {/* Accent glow frame */}
        <mesh position={[0, 0, -0.4]} material={getAccentMats(accentColor).glow}>
          <planeGeometry args={[spec.width + 1.6, spec.height + 1.6]} />
        </mesh>
        {/* The plate, lit per-pixel by the rig's three lamps — real diffuse
            falloff, real view-dependent sheen, normal-mapped relief. Unlit
            corners are the point; the text has its own material in front and
            stays legible wherever the light gives out. One draw call where
            the painted version needed three. */}
        <mesh material={panelMaterial}>
          <planeGeometry args={[spec.width, spec.height]} />
        </mesh>
        {/* Text blocks */}
        {spec.blocks.map((block, i) => (
          <Text
            key={i}
            font={block.bold ? FONT_BOLD : FONT}
            fontSize={block.size}
            color={block.color}
            anchorX="center"
            anchorY="top"
            position={[0, block.y, 0.3]}
            maxWidth={block.maxWidth}
            lineHeight={1.32}
            textAlign="left"
          >
            {block.text}
          </Text>
        ))}
        {/* Link buttons */}
        {spec.buttons.map((btn, i) => (
          <LinkRow
            key={i}
            label={btn.link.label}
            url={btn.link.url}
            width={btn.width}
            height={btn.height}
            y={btn.y}
            accentColor={accentColor}
          />
        ))}
        {/* Photo */}
        {spec.image && spec.imageHeight && (
          <group position={[0, spec.height / 2 - 3 - spec.imageHeight / 2, 0.3]}>
            <ImagePlane
              url={spec.image.url}
              width={spec.width - 6}
              height={spec.imageHeight}
            />
          </group>
        )}
      </group>
    </group>
  )
}

