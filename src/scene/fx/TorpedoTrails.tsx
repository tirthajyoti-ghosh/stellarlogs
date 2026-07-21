import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Mesh,
  ShaderMaterial,
  Vector3,
} from 'three'

/**
 * Exhaust trails that trace each torpedo's ACTUAL flight path back to its
 * launch point — the classic missile-trail read from The Expanse and space
 * combat games. Distance-sampled polyline per torpedo, rendered as one
 * camera-facing ribbon mesh (single draw call), aging from a hot white head
 * to a wide dissipating tail.
 */

export interface TrailSource {
  position: Vector3
  velocity: Vector3
  alive: boolean
  launched: boolean
}

const MAX_PTS = 160 // rows per trail (row 0 = live head)
const SAMPLE_DIST = 8 // world units between path samples
const LIFE = 14 // seconds before a path point fully dissipates
const W_HEAD = 0.3
const W_TAIL = 2.1
const DEATH_FADE = 1.4 // trail lingers briefly after the torpedo dies

interface TrailSlot {
  pts: Float32Array
  times: Float32Array
  head: number
  count: number
  fade: number
  wasLaunched: boolean
  collapsed: boolean
}

const _p = new Vector3()
const _prev = new Vector3()
const _next = new Vector3()
const _along = new Vector3()
const _view = new Vector3()
const _side = new Vector3()

export function TorpedoTrails({ sources }: { sources: TrailSource[] }) {
  const meshRef = useRef<Mesh>(null)
  const slots = useMemo<TrailSlot[]>(
    () =>
      sources.map(() => ({
        pts: new Float32Array(MAX_PTS * 3),
        times: new Float32Array(MAX_PTS),
        head: 0,
        count: 0,
        fade: 0,
        wasLaunched: false,
        collapsed: true,
      })),
    [sources],
  )

  const { geometry, material } = useMemo(() => {
    const rows = sources.length * MAX_PTS
    const positions = new Float32Array(rows * 2 * 3)
    const fades = new Float32Array(rows * 2)
    const across = new Float32Array(rows * 2)
    for (let i = 0; i < rows; i++) {
      across[i * 2] = -1
      across[i * 2 + 1] = 1
    }
    const index: number[] = []
    for (let s = 0; s < sources.length; s++) {
      const base = s * MAX_PTS * 2
      for (let r = 0; r < MAX_PTS - 1; r++) {
        const a = base + r * 2
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('aFade', new BufferAttribute(fades, 1))
    geometry.setAttribute('aAcross', new BufferAttribute(across, 1))
    geometry.setIndex(index)
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uColor: { value: new Vector3(0.78, 0.82, 0.88) } },
      vertexShader: /* glsl */ `
        attribute float aFade;
        attribute float aAcross;
        varying float vFade;
        varying float vAcross;
        void main() {
          vFade = aFade;
          vAcross = aAcross;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vFade;
        varying float vAcross;
        void main() {
          float edge = 1.0 - vAcross * vAcross; // soft ribbon edges
          gl_FragColor = vec4(uColor, vFade * edge);
        }
      `,
    })
    return { geometry, material }
  }, [sources])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(({ camera, clock }) => {
    const now = clock.elapsedTime
    const posAttr = geometry.getAttribute('position') as BufferAttribute
    const fadeAttr = geometry.getAttribute('aFade') as BufferAttribute
    const positions = posAttr.array as Float32Array
    const fades = fadeAttr.array as Float32Array
    let touched = false

    for (let s = 0; s < sources.length; s++) {
      const src = sources[s]
      const slot = slots[s]
      const flying = src.alive && src.launched

      // Launch edge: start a fresh path at the origin point
      if (flying && !slot.wasLaunched) {
        slot.count = 1
        slot.head = 0
        slot.pts[0] = src.position.x
        slot.pts[1] = src.position.y
        slot.pts[2] = src.position.z
        slot.times[0] = now
        slot.fade = 1
      }
      slot.wasLaunched = flying

      if (flying) {
        // Distance-based sampling so the polyline follows the real path
        const hx = slot.pts[slot.head * 3]
        const hy = slot.pts[slot.head * 3 + 1]
        const hz = slot.pts[slot.head * 3 + 2]
        const dx = src.position.x - hx
        const dy = src.position.y - hy
        const dz = src.position.z - hz
        if (dx * dx + dy * dy + dz * dz > SAMPLE_DIST * SAMPLE_DIST) {
          slot.head = (slot.head + 1) % MAX_PTS
          slot.count = Math.min(slot.count + 1, MAX_PTS)
          slot.pts[slot.head * 3] = src.position.x
          slot.pts[slot.head * 3 + 1] = src.position.y
          slot.pts[slot.head * 3 + 2] = src.position.z
          slot.times[slot.head] = now
        }
      } else if (slot.fade > 0) {
        slot.fade = Math.max(0, slot.fade - (1 / DEATH_FADE) * (1 / 60))
      }

      const visible = slot.count > 0 && slot.fade > 0
      if (!visible) {
        if (!slot.collapsed) {
          // Collapse this slot's rows once (degenerate → renders nothing)
          const base = s * MAX_PTS * 2
          for (let r = 0; r < MAX_PTS; r++) {
            const v = (base + r * 2) * 3
            positions[v] = positions[v + 3] = 0
            positions[v + 1] = positions[v + 4] = 0
            positions[v + 2] = positions[v + 5] = 0
            fades[base + r * 2] = fades[base + r * 2 + 1] = 0
          }
          slot.collapsed = true
          touched = true
        }
        continue
      }
      slot.collapsed = false
      touched = true

      // Row r → world point: row 0 is the live position, rows 1.. walk the
      // ring buffer newest → oldest.
      const rowCount = Math.min(slot.count + 1, MAX_PTS)
      const point = (r: number, out: Vector3) => {
        if (r <= 0 && flying) return out.copy(src.position)
        const k = Math.min(flying ? r - 1 : r, slot.count - 1)
        const idx = (slot.head - k + MAX_PTS * 2) % MAX_PTS
        return out.set(slot.pts[idx * 3], slot.pts[idx * 3 + 1], slot.pts[idx * 3 + 2])
      }
      const pointTime = (r: number) => {
        if (r <= 0 && flying) return now
        const k = Math.min(flying ? r - 1 : r, slot.count - 1)
        const idx = (slot.head - k + MAX_PTS * 2) % MAX_PTS
        return slot.times[idx]
      }

      const base = s * MAX_PTS * 2
      const usable = flying ? rowCount : Math.min(slot.count, MAX_PTS)
      for (let r = 0; r < MAX_PTS; r++) {
        const v = (base + r * 2) * 3
        if (r >= usable) {
          // Degenerate leftover rows onto the tail point
          point(usable - 1, _p)
          positions[v] = positions[v + 3] = _p.x
          positions[v + 1] = positions[v + 4] = _p.y
          positions[v + 2] = positions[v + 5] = _p.z
          fades[base + r * 2] = fades[base + r * 2 + 1] = 0
          continue
        }
        point(r, _p)
        point(Math.max(0, r - 1), _prev)
        point(Math.min(usable - 1, r + 1), _next)
        _along.copy(_prev).sub(_next)
        _view.copy(_p).sub(camera.position)
        _side.crossVectors(_along, _view)
        const len = _side.length()
        if (len < 1e-5) _side.set(1, 0, 0)
        else _side.multiplyScalar(1 / len)

        const age = Math.max(0, now - pointTime(r))
        const grow = Math.min(1, age / 6)
        const width = W_HEAD + (W_TAIL - W_HEAD) * grow
        // Head runs hot, the tail dissipates with age; whole trail obeys the
        // slot fade after death and a tail ramp when the buffer saturates
        let alpha = (1 - Math.min(1, age / LIFE)) * slot.fade
        alpha *= 0.28 + 0.72 * (1 - grow) // hotter near the motor
        if (r > usable - 6) alpha *= (usable - r) / 6

        positions[v] = _p.x - _side.x * width
        positions[v + 1] = _p.y - _side.y * width
        positions[v + 2] = _p.z - _side.z * width
        positions[v + 3] = _p.x + _side.x * width
        positions[v + 4] = _p.y + _side.y * width
        positions[v + 5] = _p.z + _side.z * width
        fades[base + r * 2] = fades[base + r * 2 + 1] = alpha
      }
    }

    if (touched) {
      posAttr.needsUpdate = true
      fadeAttr.needsUpdate = true
    }
  })

  return <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />
}
