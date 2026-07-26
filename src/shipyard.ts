import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  PerspectiveCamera,
  PointLight,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

/**
 * A dev-only shipyard: every raider candidate, same hull length, spinnable.
 * Not part of the production bundle — it exists so a hull gets judged by eye
 * before it ever reaches the world. Open /shipyard.html on the dev server.
 */

interface Candidate {
  key: string
  url: string
  name: string
  note: string
}

// Now an asset-review bench for the ships actually in the world. Add a
// candidate here whenever a new hull is being considered.
const CANDIDATES: Candidate[] = [
  { key: 'd', url: '/models/draugr.glb', name: 'DRAUGR', note: 'raider · Omega class · 597 KB' },
  { key: 'i', url: '/models/imiq.glb', name: 'IMIQ', note: 'ice hauler · 1567 KB' },
  { key: 'a', url: '/models/freighter-a.glb', name: 'GS-100', note: 'salvage hauler · 2200 KB' },
  { key: 'b', url: '/models/freighter-b.glb', name: 'STAR FREIGHTER', note: 'long-haul · 1016 KB' },
  { key: 'n', url: '/models/nilak.glb', name: 'NILAK', note: 'the wreck · 1224 KB' },
  { key: 't', url: '/models/tachi.glb', name: 'YOUR SHIP', note: 'the player · 2282 KB' },
]

const renderer = new WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = SRGBColorSpace
renderer.toneMapping = ACESFilmicToneMapping
renderer.toneMappingExposure = 1.45
document.body.appendChild(renderer.domElement)

const scene = new Scene()
scene.background = new Color('#05080f')
const camera = new PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 4000)
camera.position.set(28, 11, 33)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.08

// Lighting close to the game's: cold key, warm rim, dim fill
scene.add(new AmbientLight('#5d7fae', 1.0))
const key = new DirectionalLight('#cfe4ff', 3.4)
key.position.set(1, 0.8, 0.6)
scene.add(key)
const rim = new DirectionalLight('#ffb877', 2.0)
rim.position.set(-1, -0.2, -0.7)
scene.add(rim)
scene.add(new PointLight('#7fd4ff', 40, 260, 2).translateY(30))

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
const holder = new Group()
scene.add(holder)

const statsEl = document.getElementById('stats')!
const barEl = document.getElementById('bar')!
const loadingEl = document.getElementById('loading')!

const loaded = new Map<string, Group>()
let current = ''
let spin = true

function countVerts(root: Group): number {
  let n = 0
  root.traverse((o) => {
    const m = o as Mesh
    if (m.isMesh && m.geometry) n += m.geometry.attributes.position?.count ?? 0
  })
  return n
}

async function show(key: string) {
  const cand = CANDIDATES.find((c) => c.key === key)!
  current = key
  for (const btn of barEl.querySelectorAll('button')) {
    btn.classList.toggle('on', btn.dataset.key === key)
  }
  let model = loaded.get(key)
  if (!model) {
    loadingEl.style.display = 'grid'
    const gltf = await loader.loadAsync(cand.url)
    model = gltf.scene
    // frame every hull identically so shapes are compared, not scales
    const box = new Box3().setFromObject(model)
    const size = box.getSize(new Vector3())
    const centre = box.getCenter(new Vector3())
    model.position.sub(centre)
    const wrap = new Group()
    wrap.add(model)
    wrap.scale.setScalar(24 / Math.max(size.x, size.y, size.z))
    loaded.set(key, wrap)
    model = wrap
    loadingEl.style.display = 'none'
  }
  holder.clear()
  holder.add(model)
  holder.rotation.y = 0
  statsEl.innerHTML = `<b>${cand.name}</b><br>${cand.note}<br>${countVerts(model).toLocaleString()} verts`
}

for (const cand of CANDIDATES) {
  const btn = document.createElement('button')
  btn.dataset.key = cand.key
  btn.innerHTML = `${cand.name}<small>${cand.note.split(' · ').pop()}</small>`
  btn.onclick = () => show(cand.key)
  barEl.appendChild(btn)
}
const spinBtn = document.createElement('button')
spinBtn.innerHTML = 'PAUSE SPIN<small>toggle</small>'
spinBtn.onclick = () => {
  spin = !spin
  spinBtn.innerHTML = `${spin ? 'PAUSE' : 'RESUME'} SPIN<small>toggle</small>`
}
barEl.appendChild(spinBtn)

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
addEventListener('keydown', (e) => {
  const i = CANDIDATES.findIndex((c) => c.key === current)
  if (e.key === 'ArrowRight') show(CANDIDATES[(i + 1) % CANDIDATES.length].key)
  if (e.key === 'ArrowLeft') show(CANDIDATES[(i - 1 + CANDIDATES.length) % CANDIDATES.length].key)
})

renderer.setAnimationLoop(() => {
  if (spin) holder.rotation.y += 0.0035
  controls.update()
  renderer.render(scene, camera)
})

show('d')
