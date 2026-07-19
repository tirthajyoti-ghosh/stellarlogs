import { useEffect, useRef, useState } from 'react'
import { Billboard as DreiBillboard, Text } from '@react-three/drei'
import { Color, Mesh, MeshBasicMaterial, SRGBColorSpace, Texture, TextureLoader } from 'three'
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

/** One content panel: dark glass, glowing accent frame, SDF text, links. */
export function Billboard({ spec, accentColor, position }: BillboardProps) {
  return (
    <group position={position}>
      <DreiBillboard>
        {/* Accent glow frame */}
        <mesh position={[0, 0, -0.4]}>
          <planeGeometry args={[spec.width + 1.6, spec.height + 1.6]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.55} toneMapped={false} />
        </mesh>
        {/* Panel */}
        <mesh>
          <planeGeometry args={[spec.width, spec.height]} />
          <meshBasicMaterial color={PANEL_BG} transparent opacity={0.88} />
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
      </DreiBillboard>
    </group>
  )
}

