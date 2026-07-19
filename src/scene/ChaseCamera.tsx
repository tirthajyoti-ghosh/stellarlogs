import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, PerspectiveCamera, Vector3 } from 'three'
import { shipRig } from '../state/shipRig'

const OFFSET = new Vector3(0, 3.6, 13) // behind and above, in ship space
const LOOK_AHEAD = new Vector3(0, 1.2, -14)
const BASE_FOV = 62
const BOOST_FOV = 76

const _desired = new Vector3()
const _look = new Vector3()

/** Smoothed third-person chase camera with an FOV kick while boosting. */
export function ChaseCamera() {
  const initialized = useRef(false)

  useFrame(({ camera }, dt) => {
    const cam = camera as PerspectiveCamera
    _desired.copy(OFFSET).applyQuaternion(shipRig.quaternion).add(shipRig.position)
    _look.copy(LOOK_AHEAD).applyQuaternion(shipRig.quaternion).add(shipRig.position)

    if (!initialized.current) {
      cam.position.copy(_desired)
      initialized.current = true
    } else {
      // Exponential damping — frame-rate independent
      const t = 1 - Math.exp(-7.5 * dt)
      cam.position.lerp(_desired, t)
    }
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
