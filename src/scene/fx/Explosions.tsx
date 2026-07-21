import { useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import {
  AdditiveBlending,
  RepeatWrapping,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
} from 'three'

/**
 * Pooled flipbook explosions. Sheet: "Explosion 1" animation by WrathGames
 * Studio (OpenGameArt, CC-BY 3.0), 25 frames in a 5×5 grid, retimed for
 * space (white-hot flash → fireball → self-fading smoke; additive blending
 * makes the black background free). Fire one with spawnExplosion().
 */

const SHEET_URL = '/textures/fx/explosion.webp'
const COLS = 5
const ROWS = 5
const FRAMES = 25
const FPS = 30
const DURATION = FRAMES / FPS
const POOL = 8

interface Burst {
  position: Vector3
  scale: number
  delay: number
}

const queue: Burst[] = []

/** World-position explosion. scale ~1 = torpedo kill, ~2 = ship hit. */
export function spawnExplosion(position: Vector3, scale = 1, delay = 0): void {
  queue.push({ position: position.clone(), scale, delay })
}

interface Slot {
  start: number
  scale: number
  position: Vector3
}

export function Explosions() {
  const base = useLoader(TextureLoader, SHEET_URL)
  const spriteRefs = useRef<(Sprite | null)[]>([])
  const slots = useRef<Slot[]>(
    Array.from({ length: POOL }, () => ({ start: -10, scale: 1, position: new Vector3() })),
  )

  const textures = useMemo(() => {
    base.colorSpace = SRGBColorSpace
    return Array.from({ length: POOL }, () => {
      const t: Texture = base.clone()
      t.wrapS = t.wrapT = RepeatWrapping
      t.repeat.set(1 / COLS, 1 / ROWS)
      t.needsUpdate = true
      return t
    })
  }, [base])

  useFrame(({ clock }) => {
    const now = clock.elapsedTime
    // drain spawn queue into free (or oldest) slots
    while (queue.length > 0) {
      const burst = queue.shift()!
      let slot = slots.current.find((s) => now - s.start > DURATION)
      if (!slot) slot = slots.current.reduce((a, b) => (a.start < b.start ? a : b))
      slot.start = now + burst.delay
      slot.scale = burst.scale
      slot.position.copy(burst.position)
    }
    slots.current.forEach((slot, i) => {
      const sprite = spriteRefs.current[i]
      if (!sprite) return
      const age = now - slot.start
      if (age < 0 || age > DURATION) {
        sprite.visible = false
        return
      }
      sprite.visible = true
      const frame = Math.min(FRAMES - 1, Math.floor(age * FPS))
      const col = frame % COLS
      const row = Math.floor(frame / COLS)
      textures[i].offset.set(col / COLS, 1 - (row + 1) / ROWS)
      sprite.position.copy(slot.position)
      // fireball grows fast then coasts
      const grow = 1 - Math.exp(-age * 9)
      const s = slot.scale * (10 + grow * 22)
      sprite.scale.set(s, s, 1)
      const material = sprite.material as SpriteMaterial
      material.rotation = i * 1.3 // stable per-slot rotation for variety
    })
  })

  return (
    <>
      {Array.from({ length: POOL }, (_, i) => (
        <sprite
          key={i}
          visible={false}
          ref={(s) => {
            spriteRefs.current[i] = s
          }}
        >
          <spriteMaterial
            map={textures[i]}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </>
  )
}
