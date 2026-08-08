import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  Box3,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Quaternion,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

/**
 * THE TRAIL's clues bench (the-hunt.md pass 4.2) — dev-only, like shipyard.
 * The dust-cylinder verdict was "a semi-transparent pipe; we can't afford
 * that," so evidence is now built from REAL matter: the belts' rock pack
 * for THE SCORCH, the fleet's buoy for the tightbeam relay, container-grade
 * hulls for the vented cargo. Open /clues.html on the dev server, judge on
 * black, THEN it enters the world.
 */

const renderer = new WebGLRenderer({ antialias: true })
renderer.outputColorSpace = SRGBColorSpace
renderer.toneMapping = ACESFilmicToneMapping
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const scene = new Scene()
scene.background = new Color('#020610')
const camera = new PerspectiveCamera(55, innerWidth / innerHeight, 0.5, 8000)
camera.position.set(0, 120, 420)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// game-adjacent lighting: dim key, cool fill, plus the player's floodlight
scene.add(new AmbientLight('#5a7188', 0.22))
const key = new DirectionalLight('#fff2df', 2.4)
key.position.set(1800, 900, 1200)
scene.add(key)
const flood = new PointLight('#dff0ff', 0, 2000, 1.15)
scene.add(flood)
let floodOn = true

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

// faint starfield so scale reads
{
  const g = new BufferGeometry()
  const n = 900
  const pos = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const v = new Vector3().randomDirection().multiplyScalar(5200)
    pos.set([v.x, v.y, v.z], i * 3)
  }
  g.setAttribute('position', new BufferAttribute(pos, 3))
  scene.add(new Points(g, new PointsMaterial({ color: '#5a6f84', size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0.5 })))
}

/** each clue points HER LINE: faint chevrons along local +X */
function chevrons(parent: Group, span: number) {
  const mat = new MeshBasicMaterial({ color: '#57e6c4', transparent: true, opacity: 0.2, toneMapped: false })
  for (let i = 1; i <= 3; i++) {
    const c = new Group()
    const a = new Mesh(new BoxGeometry(4.5, 0.5, 0.5), mat)
    a.position.set(-1.5, 0, 1.6)
    a.rotation.y = 0.62
    const b = new Mesh(new BoxGeometry(4.5, 0.5, 0.5), mat)
    b.position.set(-1.5, 0, -1.6)
    b.rotation.y = -0.62
    c.add(a, b)
    c.position.x = span * 0.55 + i * 26
    parent.add(c)
  }
}

const stations: { key: string; name: string; note: string; group: Group; cam: [number, number, number] }[] = []

// ------------------------------------------------------------------ SCORCH
const scorch = new Group()
scorch.position.set(-620, 0, 0)
scene.add(scorch)
stations.push({
  key: '1',
  name: 'THE SCORCH',
  note: '<b>She burned through a gravel pocket.</b><br/>Real rocks from the belt pack, rubble to fist-of-god, strung 420 units along her line — her exhaust cooked the fines and they still glint. Density thins toward the fresh end.',
  group: scorch,
  cam: [-620, 80, 320],
})

// ------------------------------------------------------------------ CARGO
const cargo = new Group()
cargo.position.set(0, 0, 0)
scene.add(cargo)
stations.push({
  key: '2',
  name: 'VENTED CARGO',
  note: '<b>She dumped mass for a hard burn.</b><br/>Container-grade hulls (the freighter palette), tumbling dead slow in a string. The spill points her line.',
  group: cargo,
  cam: [0, 60, 220],
})
{
  const palette = ['#6b4a36', '#55606c', '#4a5a58', '#5d5346']
  const boxes: Mesh[] = []
  const geo = new BoxGeometry(1, 0.82, 1.24)
  for (let i = 0; i < 7; i++) {
    const m = new MeshStandardMaterial({
      color: palette[i % palette.length],
      metalness: 0.45,
      roughness: 0.72,
      flatShading: true,
    })
    const box = new Mesh(geo, m)
    const t = i / 6 - 0.5
    box.position.set(t * 150 + (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20)
    box.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3)
    const s = 7.5 + Math.random() * 5
    box.scale.setScalar(s)
    cargo.add(box)
    boxes.push(box)
  }
  ;(cargo as unknown as { boxes: Mesh[] }).boxes = boxes
  chevrons(cargo, 170)
}

// ------------------------------------------------------------------ BUOY
const buoyG = new Group()
buoyG.position.set(560, 0, 0)
scene.add(buoyG)
stations.push({
  key: '3',
  name: 'RELAY BUOY',
  note: '<b>A militia relay caught a tightbeam fragment.</b><br/>The fleet\'s real buoy in militia trim — teal lamp, patient blink. In the game it speaks: "…RUNNING DARK TILL THE POINT…"',
  group: buoyG,
  cam: [560, 22, 78],
})

// the SCORCH shimmer: exhaust-cooked fines, per-point twinkle via two
// phase-offset clouds
function shimmer(parent: Group) {
  for (let layer = 0; layer < 2; layer++) {
    const n = 420
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const t = Math.pow(Math.random(), 0.8) - 0.5 // denser mid-string
      const spread = 14 + (t + 0.5) * 46 // disperses toward the old end
      pos[i * 3] = -t * 420
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    const m = new PointsMaterial({
      color: new Color(1.25, 0.52, 0.18),
      size: 1.25,
      transparent: true,
      opacity: 0.4,
      blending: AdditiveBlending,
      depthWrite: false,
    })
    const p = new Points(g, m)
    ;(p as unknown as { phase: number }).phase = layer * Math.PI
    parent.add(p)
  }
}

// ------------------------------------------------------------ load assets
const loader = new GLTFLoader()
loader.setMeshoptDecoder(MeshoptDecoder)
const dummy = new Object3D()
const _m = new Matrix4()

Promise.all([
  loader.loadAsync('/models/asteroids.glb'),
  loader.loadAsync('/models/buoy.glb'),
]).then(([rocks, buoy]) => {
  // -- SCORCH rocks: instanced variants, transforms kept in matrices
  //    (quantized geometry — same law as Asteroids.tsx)
  rocks.scene.updateMatrixWorld(true)
  const variants: { geometry: BufferGeometry; material: Material; base: Matrix4; norm: number }[] = []
  const pos = new Vector3()
  const quat = new Quaternion()
  const scl = new Vector3()
  rocks.scene.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    mesh.matrixWorld.decompose(pos, quat, scl)
    const rs = new Matrix4().compose(new Vector3(), quat, scl)
    const g = mesh.geometry
    if (!g.boundingBox) g.computeBoundingBox()
    const center = g.boundingBox!.getCenter(new Vector3())
    const size = g.boundingBox!.getSize(new Vector3()).multiply(scl)
    variants.push({
      geometry: g,
      material: Array.isArray(mesh.material) ? mesh.material[0] : mesh.material,
      base: rs.multiply(new Matrix4().makeTranslation(-center.x, -center.y, -center.z)),
      norm: 1 / Math.max(size.x, size.y, size.z, 1e-6),
    })
  })
  const perVariant = 9
  for (const v of variants) {
    const im = new InstancedMesh(v.geometry, v.material, perVariant)
    for (let i = 0; i < perVariant; i++) {
      const t = Math.pow(Math.random(), 0.85) - 0.5
      const spread = 10 + (t + 0.5) * 40
      dummy.position.set(-t * 420, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread)
      dummy.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3)
      // rubble 0.4–2.4, with the odd fist of god
      const s = (Math.random() < 0.1 ? 8 + Math.random() * 5 : 1.4 + Math.random() * 3.2) * v.norm
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      _m.copy(dummy.matrix).multiply(v.base)
      im.setMatrixAt(i, _m)
    }
    im.instanceMatrix.needsUpdate = true
    scorch.add(im)
  }
  shimmer(scorch)
  chevrons(scorch, 460)

  // -- BUOY: the real hardware, militia trim — normalized to ~9 units
  const hull = buoy.scene
  hull.updateMatrixWorld(true)
  const bounds = new Box3().setFromObject(hull)
  const size = bounds.getSize(new Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  if (maxDim > 0) hull.scale.setScalar(15 / maxDim)
  const center = bounds.getCenter(new Vector3()).multiplyScalar(hull.scale.x)
  hull.position.sub(center)
  buoyG.add(hull)
  // the lamp: teal, patient
  const lamp = new Mesh(
    new SphereGeometry(0.7, 10, 10),
    new MeshBasicMaterial({ color: new Color(0.4, 3.2, 2.6), toneMapped: false }),
  )
  lamp.position.set(0, (size.y / maxDim) * 15 * 0.5 + 1.2, 0)
  buoyG.add(lamp)
  ;(buoyG as unknown as { lamp: Mesh }).lamp = lamp
  chevrons(buoyG, 60)

  document.getElementById('loading')?.remove()
})

// ------------------------------------------------------------------ bar/UI
const bar = document.getElementById('bar')!
const note = document.getElementById('note')!
function go(i: number) {
  const st = stations[i]
  controls.target.copy(st.group.position)
  camera.position.set(...st.cam)
  note.innerHTML = `<b>${st.name}</b><br/>${st.note}`
  bar.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === i))
}
stations.forEach((st, i) => {
  const b = document.createElement('button')
  b.innerHTML = `${st.name}<small>key ${st.key}</small>`
  b.addEventListener('click', () => go(i))
  bar.appendChild(b)
})
{
  const b = document.createElement('button')
  b.innerHTML = `FLOODLIGHT<small>key L</small>`
  b.classList.add('on')
  b.addEventListener('click', () => {
    floodOn = !floodOn
    b.classList.toggle('on', floodOn)
  })
  bar.appendChild(b)
}
addEventListener('keydown', (e) => {
  if (e.key === '1') go(0)
  if (e.key === '2') go(1)
  if (e.key === '3') go(2)
  if (e.key === 'l' || e.key === 'L') {
    floodOn = !floodOn
    bar.querySelectorAll('button')[3]?.classList.toggle('on', floodOn)
  }
})
go(0)

// ------------------------------------------------------------------ frame
let t0 = performance.now()
renderer.setAnimationLoop(() => {
  const now = performance.now() / 1000
  const dt = Math.min(0.05, (performance.now() - t0) / 1000)
  t0 = performance.now()
  controls.update()
  // player floodlight rides the camera
  flood.intensity = floodOn ? 7 : 0
  flood.position.copy(camera.position)
  // cargo tumbles dead slow
  const boxes = (cargo as unknown as { boxes?: Mesh[] }).boxes
  if (boxes) for (const b of boxes) { b.rotation.x += dt * 0.14; b.rotation.y += dt * 0.1 }
  // shimmer twinkles
  scorch.traverse((o) => {
    const p = o as Points & { phase?: number }
    if (p.isPoints && p.phase !== undefined) {
      ;(p.material as PointsMaterial).opacity = 0.16 + 0.3 * (0.5 + 0.5 * Math.sin(now * 2.1 + p.phase))
    }
  })
  // the lamp blinks patient
  const lamp = (buoyG as unknown as { lamp?: Mesh }).lamp
  if (lamp) lamp.visible = Math.sin(now * 2.4) > -0.2
  // buoy slow tumble
  buoyG.rotation.y += dt * 0.06
  renderer.render(scene, camera)
})
