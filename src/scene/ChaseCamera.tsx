import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Euler, MathUtils, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import { shipRig } from '../state/shipRig'
import { cameraLook } from '../state/cameraLook'

const OFFSET = new Vector3(0, 3.6, 13) // behind and above, in ship space
const LOOK_AHEAD = new Vector3(0, 1.2, -14)
const BASE_FOV = 62
const BOOST_FOV = 76
const WARP_FOV = 98
// Extra camera pull-back per unit of ship speed (sense of velocity)
const SPEED_PULLBACK = 0.012

const _desiredOffset = new Vector3()
const _look = new Vector3()
const _lookAhead = new Vector3()
const _orbitQuat = new Quaternion()
const _orbitEuler = new Euler()

/**
 * Smoothed third-person chase camera. The camera rides WITH the ship (offset
 * damped in world space, so a fast ship never outruns it), plain mouse
 * movement orbits the view around the ship and zooms in for hero shots,
 * steering drags freeze the orbit, boost kicks the FOV out.
 */
export function ChaseCamera() {
  const initialized = useRef(false)
  const orbit = useRef({ yaw: 0, pitch: 0 })
  const offset = useRef(new Vector3())

  useFrame(({ camera }, dt) => {
    const cam = camera as PerspectiveCamera

    // While dragging, track the accumulated orbit angles tightly; on release
    // the stored angles ease back to zero (settle behind the ship)
    if (!cameraLook.dragging) {
      const decay = Math.exp(-2.2 * dt)
      cameraLook.orbitYaw *= decay
      cameraLook.orbitPitch *= decay
    }
    const t = 1 - Math.exp(-(cameraLook.dragging ? 14 : 5) * dt)
    orbit.current.yaw += (cameraLook.orbitYaw - orbit.current.yaw) * t
    orbit.current.pitch += (cameraLook.orbitPitch - orbit.current.pitch) * t

    const orbitAmount = Math.min(
      1,
      (Math.abs(orbit.current.yaw) + Math.abs(orbit.current.pitch)) * 2.5,
    )

    _orbitEuler.set(orbit.current.pitch, orbit.current.yaw, 0, 'YXZ')
    _orbitQuat.setFromEuler(_orbitEuler)

    // Desired offset in world space: pulled in while orbiting (hero shot),
    // pushed out slightly with speed
    // Pullback caps at sub-light speeds so warp doesn't shrink the ship away
    const pullback = 1 + Math.min(shipRig.speed, 520) * SPEED_PULLBACK * 0.1
    _desiredOffset
      .copy(OFFSET)
      .multiplyScalar((1 - orbitAmount * 0.45) * pullback)
      .applyQuaternion(_orbitQuat)
      .applyQuaternion(shipRig.quaternion)

    if (!initialized.current) {
      offset.current.copy(_desiredOffset)
      initialized.current = true
    } else {
      const tp = 1 - Math.exp(-7.5 * dt)
      offset.current.lerp(_desiredOffset, tp)
    }
    // Camera rides with the ship — position lag never scales with speed
    cam.position.copy(shipRig.position).add(offset.current)
    // Fine high-frequency shake while the drive is punching
    if (shipRig.warping && shipRig.speed > 2000) {
      const t = performance.now() / 1000
      const amp = Math.min(1, shipRig.speed / 14000) * 0.5
      cam.position.x += Math.sin(t * 61.7) * amp
      cam.position.y += Math.sin(t * 47.3 + 1.7) * amp
      cam.position.z += Math.sin(t * 53.9 + 3.1) * amp
    }

    // While orbiting, keep the ship itself centered; when settled behind,
    // look ahead of the nose for flying
    _lookAhead.copy(LOOK_AHEAD).applyQuaternion(shipRig.quaternion).add(shipRig.position)
    _look.copy(shipRig.position).lerp(_lookAhead, 1 - orbitAmount)
    cam.up.set(0, 1, 0)
    cam.lookAt(_look)

    const targetFov = shipRig.warping ? WARP_FOV : shipRig.boosting ? BOOST_FOV : BASE_FOV
    if (Math.abs(cam.fov - targetFov) > 0.05) {
      cam.fov = MathUtils.lerp(cam.fov, targetFov, 1 - Math.exp(-4 * dt))
      cam.updateProjectionMatrix()
    }
  }, -1)

  return null
}
