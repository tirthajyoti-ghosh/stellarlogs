import { useEffect } from 'react'
import { shipInput } from '../physics/shipInput'
import { cameraLook } from '../state/cameraLook'

/**
 * Desktop controls.
 * Keyboard: W/↑ thrust, S/↓ brake, A/← D/→ yaw, R/F pitch, Shift boost.
 * Pointer: press-and-drag anywhere acts as a virtual stick (yaw + pitch),
 * which is also exactly how the mobile joystick will drive the ship.
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

    // Pointer-drag steering (virtual stick centered on the press point)
    let dragId: number | null = null
    let originX = 0
    let originY = 0
    const STICK_RANGE = 110 // px to reach full deflection

    const onPointerDown = (e: PointerEvent) => {
      if (dragId !== null) return
      if ((e.target as HTMLElement).closest('button, a, [data-ui]')) return
      dragId = e.pointerId
      cameraLook.dragging = true
      originX = e.clientX
      originY = e.clientY
    }
    const onPointerMove = (e: PointerEvent) => {
      // Free-look: cursor offset from center orbits the camera (mouse only —
      // touch devices get their own controls)
      if (e.pointerType === 'mouse' && dragId === null) {
        cameraLook.x = (e.clientX / window.innerWidth) * 2 - 1
        cameraLook.y = (e.clientY / window.innerHeight) * 2 - 1
      }
      if (e.pointerId !== dragId) return
      const dx = (e.clientX - originX) / STICK_RANGE
      const dy = (e.clientY - originY) / STICK_RANGE
      shipInput.yaw = Math.max(-1, Math.min(1, -dx))
      shipInput.pitch = Math.max(-1, Math.min(1, -dy))
    }
    const endDrag = (e: PointerEvent) => {
      if (e.pointerId !== dragId) return
      dragId = null
      cameraLook.dragging = false
      shipInput.yaw = 0
      shipInput.pitch = 0
      applyKeys() // keyboard may still be held
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
