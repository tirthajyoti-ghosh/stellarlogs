import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Group,
  Mesh,
  Quaternion,
  ShaderMaterial,
  SpriteMaterial,
  Vector3,
} from 'three'
import { NOISE_GLSL } from './shaders/noiseGlsl'
import { shipRig } from '../state/shipRig'
import { warp } from '../physics/warp'

const TUNNEL_RADIUS = 130
const TUNNEL_LENGTH = 3000

const _dir = new Vector3()
const _quat = new Quaternion()
const FORWARD = new Vector3(0, 0, -1)

const tunnelVertex = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #include <logdepthbuf_vertex>
}
`

const tunnelFragment = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;

${NOISE_GLSL}

void main() {
  #include <logdepthbuf_fragment>
  // vUv.x wraps around the tube, vUv.y runs along it (0 = ahead, 1 = behind)
  float around = vUv.x * 6.28318;
  float along = vUv.y;

  // Flowing energy ribbons racing toward the viewer, swirling slowly
  float swirl = around * 3.0 + along * 14.0 - uTime * 9.0 + snoise(vec3(vUv * 5.0, uTime * 0.4)) * 1.2;
  float ribbons = pow(0.5 + 0.5 * sin(swirl), 3.0);
  float wisps = fbm(vec3(around * 0.8, along * 9.0 - uTime * 5.0, uTime * 0.25)) * 0.5 + 0.5;

  // Blue core → violet edge palette
  vec3 core = vec3(0.45, 0.75, 1.0);
  vec3 edge = vec3(0.62, 0.4, 1.0);
  vec3 color = mix(edge, core, ribbons) * (0.5 + wisps);

  // Fade both ends of the tube so it dissolves into space
  float endFade = smoothstep(0.0, 0.28, along) * (1.0 - smoothstep(0.72, 1.0, along));
  float alpha = (ribbons * 0.55 + wisps * 0.22) * endFade * uIntensity;

  gl_FragColor = vec4(color * uIntensity * 1.6, alpha);
  #include <colorspace_fragment>
}
`

function makeGlowTexture(): CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.25, 'rgba(190,205,255,0.5)')
  g.addColorStop(0.6, 'rgba(150,130,255,0.14)')
  g.addColorStop(1, 'rgba(140,120,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new CanvasTexture(canvas)
}

/**
 * The Everspace read: an animated energy tube around the flight path with a
 * blinding destination glow at the far end. Rides with the ship during jumps.
 */
export function WarpTunnel() {
  const groupRef = useRef<Group>(null)
  const tunnelRef = useRef<Mesh>(null)
  const intensity = useRef(0)

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: tunnelVertex,
        fragmentShader: tunnelFragment,
        uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 } },
        transparent: true,
        depthWrite: false,
        side: BackSide,
        blending: AdditiveBlending,
      }),
    [],
  )

  const glowMaterial = useMemo(
    () =>
      new SpriteMaterial({
        map: makeGlowTexture(),
        color: '#cdd8ff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  )

  useFrame(({ clock }, dt) => {
    const group = groupRef.current
    if (!group) return
    const jumping = warp.phase === 'jump'
    const target = jumping ? Math.min(1, shipRig.speed / 9000 + 0.2) : 0
    intensity.current += (target - intensity.current) * (1 - Math.exp(-(jumping ? 5 : 9) * dt))
    material.uniforms.uIntensity.value = intensity.current
    glowMaterial.opacity = intensity.current * 0.9
    group.visible = intensity.current > 0.02
    if (!group.visible) return

    material.uniforms.uTime.value = clock.elapsedTime
    _dir.copy(warp.arrival).sub(shipRig.position)
    if (_dir.lengthSq() > 1) {
      _quat.setFromUnitVectors(FORWARD, _dir.normalize())
      group.quaternion.copy(_quat)
    }
    group.position.copy(shipRig.position)
  })

  return (
    <group ref={groupRef} visible={false}>
      {/* Energy tube: cylinder axis is Y — rotate onto Z */}
      <mesh ref={tunnelRef} material={material} rotation-x={Math.PI / 2} frustumCulled={false}>
        <cylinderGeometry args={[TUNNEL_RADIUS * 1.6, TUNNEL_RADIUS, TUNNEL_LENGTH, 40, 24, true]} />
      </mesh>
      {/* Destination glow at the tunnel mouth */}
      <sprite material={glowMaterial} position={[0, 0, -TUNNEL_LENGTH * 0.52]} scale={[900, 900, 1]} />
    </group>
  )
}
