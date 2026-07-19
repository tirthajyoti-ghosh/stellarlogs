import { useEffect } from 'react'
import { shipInput } from '../physics/shipInput'
import { cameraLook } from '../state/cameraLook'

const DRAG_SENSITIVITY = 0.0075 // rad per px
const PITCH_CLAMP = 1.2

/**
 * Desktop controls.
 * Keyboard steers the ship: W/↑ thrust, S/↓ brake, A/← D/→ yaw, R/F pitch,
 * Shift boost. Mouse drag orbits the camera around the ship (release eases
 * back behind it) — flying is keys, admiring is mouse.
 */
export function useShipControls(): void {
  useEffect(() => {
    const keys = new Set<string>()

    const applyKeys = () => {
      shipInput.thrust = keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0
      shipInput.brake = keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0
      shipInput.yaw =
        (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) +
        (keys.has('KeyD') || keys.has('ArrowRight') ? -1 : 0)
      shipInput.pitch = (keys.has('KeyR') ? 1 : 0) + (keys.has('KeyF') ? -1 : 0)
      shipInput.boost = keys.has('ShiftLeft') || keys.has('ShiftRight')
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      keys.add(e.code)
      applyKeys()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code)
      applyKeys()
    }
    const onBlur = () => {
      keys.clear()
      applyKeys()
    }

    // Mouse-drag camera orbit
    let dragId: number | null = null
    let lastX = 0
    let lastY = 0

    const onPointerDown = (e: PointerEvent) => {
      if (dragId !== null) return
      if ((e.target as HTMLElement).closest('button, a, [data-ui]')) return
      dragId = e.pointerId
      cameraLook.dragging = true
      lastX = e.clientX
      lastY = e.clientY
    }
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== dragId) return
      cameraLook.orbitYaw -= (e.clientX - lastX) * DRAG_SENSITIVITY
      cameraLook.orbitPitch += (e.clientY - lastY) * DRAG_SENSITIVITY
      cameraLook.orbitPitch = Math.max(-PITCH_CLAMP, Math.min(PITCH_CLAMP, cameraLook.orbitPitch))
      lastX = e.clientX
      lastY = e.clientY
    }
    const endDrag = (e: PointerEvent) => {
      if (e.pointerId !== dragId) return
      dragId = null
      cameraLook.dragging = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [])
}
