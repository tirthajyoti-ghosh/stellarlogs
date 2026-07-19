import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Euler, MathUtils, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import { shipRig } from '../state/shipRig'
import { cameraLook } from '../state/cameraLook'

const OFFSET = new Vector3(0, 3.6, 13) // behind and above, in ship space
const LOOK_AHEAD = new Vector3(0, 1.2, -14)
const BASE_FOV = 62
const BOOST_FOV = 76
// How far the free-look orbits, radians at full cursor deflection
const LOOK_YAW_RANGE = 2.6
const LOOK_PITCH_RANGE = 0.9
const DEADZONE = 0.06
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

    // Damped free-look orbit angles from cursor position
    const lookX = Math.abs(cameraLook.x) < DEADZONE ? 0 : cameraLook.x
    const lookY = Math.abs(cameraLook.y) < DEADZONE ? 0 : cameraLook.y
    const targetYaw = cameraLook.dragging ? orbit.current.yaw : -lookX * LOOK_YAW_RANGE
    const targetPitch = cameraLook.dragging ? orbit.current.pitch : lookY * LOOK_PITCH_RANGE
    const t = 1 - Math.exp(-5 * dt)
    orbit.current.yaw += (targetYaw - orbit.current.yaw) * t
    orbit.current.pitch += (targetPitch - orbit.current.pitch) * t

    const orbitAmount = Math.min(
      1,
      (Math.abs(orbit.current.yaw) + Math.abs(orbit.current.pitch)) * 2.5,
    )

    _orbitEuler.set(orbit.current.pitch, orbit.current.yaw, 0, 'YXZ')
    _orbitQuat.setFromEuler(_orbitEuler)

    // Desired offset in world space: pulled in while orbiting (hero shot),
    // pushed out slightly with speed
    _desiredOffset
      .copy(OFFSET)
      .multiplyScalar((1 - orbitAmount * 0.45) * (1 + shipRig.speed * SPEED_PULLBACK * 0.1))
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

    // While orbiting, keep the ship itself centered; when settled behind,
    // look ahead of the nose for flying
    _lookAhead.copy(LOOK_AHEAD).applyQuaternion(shipRig.quaternion).add(shipRig.position)
    _look.copy(shipRig.position).lerp(_lookAhead, 1 - orbitAmount)
    cam.up.set(0, 1, 0)
    cam.lookAt(_look)

    const targetFov = shipRig.boosting ? BOOST_FOV : BASE_FOV
    if (Math.abs(cam.fov - targetFov) > 0.05) {
      cam.fov = MathUtils.lerp(cam.fov, targetFov, 1 - Math.exp(-4 * dt))
      cam.updateProjectionMatrix()
    }
  }, -1)

  return null
}
