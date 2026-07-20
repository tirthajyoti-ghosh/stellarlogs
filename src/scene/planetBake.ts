import {
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three'
import type { IUniform } from 'three'
import { bakeVertex } from './shaders/planetBakeShader'

/**
 * One-time GPU bakes of procedural planet surfaces into equirect textures.
 * ~40 planets bake at startup; the queue runs ONE bake per animation frame so
 * loading never hitches on a single long frame.
 */

const queue: Array<() => void> = []
let pumping = false

function pump(): void {
  const job = queue.shift()
  if (job) job()
  if (queue.length > 0) requestAnimationFrame(pump)
  else pumping = false
}

function enqueue(job: () => void): void {
  queue.push(job)
  if (!pumping) {
    pumping = true
    requestAnimationFrame(pump)
  }
}

const _camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
const _scene = new Scene()
const _quad = new Mesh(new PlaneGeometry(2, 2))
_scene.add(_quad)

/**
 * Queue an equirect bake. `onDone` receives the finished texture (mipmapped,
 * horizontally wrapping) once its turn in the queue comes up.
 */
export function bakeEquirect(
  gl: WebGLRenderer,
  fragmentShader: string,
  uniforms: Record<string, IUniform>,
  width: number,
  height: number,
  onDone: (texture: Texture) => void,
): void {
  enqueue(() => {
    const target = new WebGLRenderTarget(width, height, { depthBuffer: false })
    target.texture.generateMipmaps = true
    target.texture.minFilter = LinearMipmapLinearFilter
    target.texture.magFilter = LinearFilter
    target.texture.wrapS = RepeatWrapping
    target.texture.wrapT = ClampToEdgeWrapping

    const material = new ShaderMaterial({ vertexShader: bakeVertex, fragmentShader, uniforms })
    _quad.material = material

    const prevTarget = gl.getRenderTarget()
    gl.setRenderTarget(target)
    gl.render(_scene, _camera)
    gl.setRenderTarget(prevTarget)

    material.dispose()
    onDone(target.texture)
  })
}
