import { useEffect, useMemo, useRef, useState } from 'react'
import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Color, Group, Mesh, MeshBasicMaterial, SRGBColorSpace, Texture, TextureLoader } from 'three'
import type { BoardSpec } from './boardSpecs'
import { FONT, FONT_BOLD } from './font'

const PANEL_BG = '#050d1c'

interface BillboardProps {
  spec: BoardSpec
  accentColor: string
  position: [number, number, number]
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

const FRAME = { color: '#39414d', metalness: 0.7, roughness: 0.4, flatShading: true }
const DARKMETAL = { color: '#161c26', metalness: 0.75, roughness: 0.45, flatShading: true }

/** Structural frame, back bus, thruster pods — the Futurama satellite rig. */
function BoardStructure({ width: w, height: h, accentColor }: { width: number; height: number; accentColor: string }) {
  const beam = 2.2
  return (
    <group>
      {/* Perimeter frame beams */}
      <mesh position={[0, h / 2 + beam / 2, -0.5]}>
        <boxGeometry args={[w + beam * 2, beam, 2.4]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <mesh position={[0, -h / 2 - beam / 2, -0.5]}>
        <boxGeometry args={[w + beam * 2, beam, 2.4]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <mesh position={[-w / 2 - beam / 2, 0, -0.5]}>
        <boxGeometry args={[beam, h, 2.4]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <mesh position={[w / 2 + beam / 2, 0, -0.5]}>
        <boxGeometry args={[beam, h, 2.4]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      {/* Solid backing plate with ribs */}
      <mesh position={[0, 0, -1.4]}>
        <boxGeometry args={[w + beam, h + beam, 0.8]} />
        <meshStandardMaterial {...DARKMETAL} />
      </mesh>
      {[-w / 4, w / 4].map((x) => (
        <mesh key={x} position={[x, 0, -2.1]}>
          <boxGeometry args={[1.6, h * 0.85, 0.7]} />
          <meshStandardMaterial {...FRAME} />
        </mesh>
      ))}
      {/* Satellite bus on the back */}
      <mesh position={[0, 0, -3.6]}>
        <boxGeometry args={[w * 0.22, h * 0.3, 2.6]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      {/* Corner thruster pods (station-keeping — no actual motion) */}
      {[
        [-w / 2, -h / 2],
        [w / 2, -h / 2],
        [-w / 2, h / 2],
        [w / 2, h / 2],
      ].map(([x, y], i) => (
        <group key={i} position={[x, y, -1.2]}>
          <mesh>
            <boxGeometry args={[2.6, 2.6, 2.6]} />
            <meshStandardMaterial {...DARKMETAL} />
          </mesh>
          <mesh position={[x > 0 ? 2 : -2, 0, 0]} rotation-z={x > 0 ? -Math.PI / 2 : Math.PI / 2}>
            <coneGeometry args={[0.8, 1.6, 8, 1, true]} />
            <meshStandardMaterial {...DARKMETAL} side={2} />
          </mesh>
        </group>
      ))}
      {/* Blinking marker lights on the top corners */}
      {[-w / 2, w / 2].map((x) => (
        <mesh key={x} position={[x, h / 2 + beam, 0]}>
          <sphereGeometry args={[0.9, 8, 8]} />
          <meshBasicMaterial color={accentColor} toneMapped={false} />
        </mesh>
      ))}
      {/* Floodlight bar washing the panel face, like real ad boards */}
      <mesh position={[0, h / 2 + beam * 1.8, 2.5]}>
        <boxGeometry args={[w * 0.5, 0.9, 0.9]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <pointLight position={[0, h / 2 + 2, 6]} color="#e8f0ff" intensity={2} distance={Math.max(w, h) * 1.2} decay={2} />
    </group>
  )
}

/**
 * One content panel as a physical orbital billboard: framed panel with a
 * satellite bus and thrusters, slowly spinning about its vertical axis.
 * The parent (PlanetBoards) drives position; spin happens here.
 */
export function Billboard({ spec, accentColor, position }: BillboardProps) {
  const spinRef = useRef<Group>(null)
  // Deterministic per-board phase from its dimensions (stable across renders)
  const phase = useMemo(() => ((spec.width * 7.31 + spec.height * 3.7) % 6.28), [spec.width, spec.height])

  useFrame(({ clock }) => {
    const spin = spinRef.current
    if (!spin) return
    // Slow satellite spin with a slight tumble wobble
    spin.rotation.y = phase + clock.elapsedTime * 0.12
    spin.rotation.x = Math.sin(clock.elapsedTime * 0.11 + phase) * 0.05
  })

  return (
    <group position={position}>
      <group ref={spinRef}>
        <BoardStructure width={spec.width} height={spec.height} accentColor={accentColor} />
        {/* Accent glow frame */}
        <mesh position={[0, 0, -0.4]}>
          <planeGeometry args={[spec.width + 1.6, spec.height + 1.6]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.55} toneMapped={false} />
        </mesh>
        {/* Panel */}
        <mesh>
          <planeGeometry args={[spec.width, spec.height]} />
          <meshBasicMaterial color={PANEL_BG} opacity={1} />
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

