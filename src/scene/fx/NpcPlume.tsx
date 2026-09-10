import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Mesh, Sprite, Vector3 } from 'three'
import { createPlumeVolumeMaterial, createPlumeCoronaMaterial } from '../DrivePlume'
import { IS_TOUCH } from '../../config/quality'

/**
 * Every drive in the universe burns with the SAME flame (his order
 * 2026-09-10): the player's raymarched volumetric, parameterized for
 * NPC hulls. Cheaper march (fewer steps — nobody orbits a stranger's
 * bell), and a distance LOD: past VOLUME_RANGE only the corona sprite
 * survives, which is all a drive resolves to at that range anyway.
 *
 * Stage follows the player convention: 0 = cold, 1 = cruise burn,
 * 2 = full burn. The parent sets it from the ship's real drive state
 * each frame via the handle.
 */

const VOLUME_RANGE = 2400
const STEPS = IS_TOUCH ? 10 : 18

export interface NpcPlumeHandle {
  setStage(stage: number): void
}

interface NpcPlumeProps {
  /** bell diameter, world units */
  dia: number
  /** flame length at full burn, world units */
  len: number
  /** emission tint (the Draugr burns violet) */
  tint?: [number, number, number]
}

const _world = new Vector3()
const _camLocal = new Vector3()

export const NpcPlume = forwardRef<NpcPlumeHandle, NpcPlumeProps>(function NpcPlume(
  { dia, len, tint },
  ref,
) {
  const { camera } = useThree()
  const stageRef = useRef(0)
  const volRef = useRef<Mesh>(null)
  const coronaRef = useRef<Sprite>(null)

  const volMat = useMemo(() => {
    const m = createPlumeVolumeMaterial(STEPS)
    if (tint) m.uniforms.uTint.value.set(...tint)
    return m
  }, [tint])
  const coronaMat = useMemo(() => {
    const m = createPlumeCoronaMaterial()
    if (tint) m.color.setRGB(tint[0] * 0.56, tint[1] * 0.74, tint[2], 'srgb-linear')
    return m
  }, [tint])

  useImperativeHandle(ref, () => ({
    setStage(stage: number) {
      stageRef.current = stage
    },
  }))

  useFrame(() => {
    const vol = volRef.current
    const corona = coronaRef.current
    if (!vol || !corona) return
    const stage = stageRef.current
    const cruise = Math.min(stage, 1)
    const burnK = Math.max(0, stage - 1)
    const now = performance.now() / 1000
    const flicker = 1 + 0.05 * Math.sin(now * 43) + 0.035 * Math.sin(now * 97)

    if (stage <= 0.02) {
      vol.visible = false
      coronaMat.opacity = 0
      return
    }

    vol.getWorldPosition(_world)
    const dist = _world.distanceTo(camera.position)

    // the corona always burns — the far-off marker of a lit drive
    coronaMat.opacity = (cruise * 0.1 + burnK * 0.12) * flicker
    const cs = (0.25 + cruise * 0.2 + burnK * 0.35) * dia
    corona.scale.set(cs, cs, 1)

    // the volume only inside resolve range
    vol.visible = dist < VOLUME_RANGE
    if (!vol.visible) return
    const flameLen = len * (0.4 * cruise + 0.6 * burnK)
    const flameDia = dia * (0.72 + 0.28 * burnK)
    vol.scale.set(flameDia, Math.max(flameLen, 0.001), flameDia)
    vol.position.y = -Math.max(flameLen, 0.001) / 2
    vol.updateMatrixWorld()
    _camLocal.copy(camera.position)
    vol.worldToLocal(_camLocal)
    volMat.uniforms.uCamLocal.value.copy(_camLocal)
    volMat.uniforms.uTime.value = now % 300
    volMat.uniforms.uStage.value = stage
    volMat.uniforms.uFlicker.value = flicker
    volMat.uniforms.uAxial.value = flameLen * 0.75
    volMat.uniforms.uRadial.value = flameDia * 2.2
  })

  return (
    <group>
      <mesh ref={volRef} material={volMat} visible={false} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <sprite ref={coronaRef} material={coronaMat} />
    </group>
  )
})
