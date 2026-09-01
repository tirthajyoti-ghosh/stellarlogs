# Performance audit — 2026-07-26

*Measurement pass. No code was changed. Everything below is measured on the
**production build** (`vite preview`) unless noted, on an **Apple M3**
(ANGLE Metal renderer) at **devicePixelRatio 2**.*

---

## The headline

**The site renders the entire universe every frame, from everywhere, and
about 80% of that is asteroid belts you cannot see.**

Empty deep space — 12,000 units from anything, nothing on screen — still
draws **377 calls and 4.3 million triangles** and still runs at **30fps**.
Turn around so the whole map is *behind* you, and **3.0 million triangles
are still drawn**. The frame cost is essentially identical everywhere on
the map, which is the signature of a fixed, unconditional cost rather than
"too much content".

---

## Method

- Patched `WebGL2RenderingContext.prototype` (`drawElements`, `drawArrays`,
  the `*Instanced` variants, `viewport`, `useProgram`, `bindTexture`) to
  count real draw calls, triangles, shader switches and passes per frame —
  no renderer access needed, works on the minified production build.
- Wrapped `requestAnimationFrame` to time the app's own callback = **JS
  cost per frame**.
- `EXT_disjoint_timer_query_webgl2` for **true GPU time per frame**.
- `PerformanceObserver` for long tasks; Resource Timing for payload.
- Viewport-resize sweep to separate fill-rate from geometry.
- Direction test (face the map vs. face away) to test culling.

---

## Numbers

### Where the frame goes

| | measured |
|---|---|
| **GPU time / frame** | **51.5 ms** (p90 82 ms, max 107 ms) |
| **JS time / frame** | **1.84 ms** (max 44.9 ms during a spawn hitch) |
| Frame time | 34.4 ms p50 → **29 fps** (p90 66.7, p99 116.7) |
| Heap | 117 MB |

**The frame is ~97% GPU.** This single fact decides the whole plan.

### What is being drawn

| location | draws/frame | triangles/frame | fps |
|---|---|---|---|
| Empty deep space (12k units out) | 284–377 | **4,097,839 – 4,298,443** | 30 |
| Comms Station | 110 | 3,071,704 | 30 |
| Amnia docks + live traffic | 126 | 3,131,686 | 31 |
| The Nilak wreck | 140 | 3,137,118 | 30 |
| Gunnery range | 233 | 3,334,896 | 30 |
| **Facing the map** | 374 | 4,412,434 | 30 |
| **Facing away from everything** | **88** | **3,001,257** | 31 |

Two readings from the last two rows: frustum culling *does* work where it is
enabled (draws collapse 374 → 88), and **3 million triangles survive
regardless** — those are the objects that opted out of culling.

### The single biggest cost — asteroid belts

- 4 belts × **380 rocks** each (`QUALITY.asteroidCount`, high tier)
- rock variants average **2,308 triangles** each (10 variants, 1,472–3,394)
- → **380 × 2,308 ≈ 877k triangles per belt → ~3.5M triangles for the four**
- `Asteroids.tsx` sets **`frustumCulled={false}`**, there is no distance
  gate and no LOD

That figure matches the measured 3.0M-triangle floor almost exactly. **The
belts are ~80% of every frame, everywhere in the universe, at all times** —
and from most viewpoints each rock covers a handful of pixels or is not on
screen at all.

### Secondary costs

- **17 places** disable frustum culling (`frustumCulled={false}` across
  Asteroids, InteramniaDrift, IceRoute, GunneryRange, BeltRun, TorpedoTrails,
  PdcRounds, HullDamage).
- **Ship models are heavy**: the frame trace shows 5 individual draws over
  100k triangles each (114k, 156k, 139k, 135k, 126k…). No LOD — a hauler
  2 km away costs the same as one 50 m away.
- **Fill rate is real but secondary**: quartering the viewport took 29 → 58
  fps with triangles unchanged, so pixels matter — but the post chain is
  *not* the villain. The whole bloom pyramid is 11 fullscreen passes
  totalling **0.78 megapixels** (735×400 → 23×13); the scene pass is
  1470×800 at DPR 2.
- **No far-plane discipline**: `far: 60000`, so every system in the map is
  inside the frustum from anywhere.

### Load

| | |
|---|---|
| Total transferred | **21.5 MB** |
| Models | **19.0 MB across 11 files, ALL preloaded at startup** |
| Textures | 2.0 MB (29 files) |
| JS | 455 KB gzipped (1.56 MB raw) |
| Long tasks during startup | **8 tasks, 546 ms blocked** (50–93 ms each) |

Largest models: `gateway.glb` **6.4 MB**, `drift.glb` 2.9 MB, `tachi.glb`
2.3 MB, `freighter-a.glb` 2.2 MB, `imiq.glb` 1.6 MB, `nilak.glb` 1.2 MB.
Every one is fetched and decoded on first paint via `useGLTF.preload`,
whether or not the player is anywhere near it.

---

## Would WASM help? No — and the data says so plainly

**JS is 1.84 ms of a 51.5 ms frame.** If we rewrote every line of our
simulation in Rust and it executed in literally zero time, the frame would
go from 51.5 ms to 49.7 ms: **29 fps → 30 fps.**

WASM accelerates *CPU compute*. Our bottleneck is the GPU rasterising
millions of triangles that should never have been submitted. WASM cannot
issue fewer draw calls, cull an off-screen belt, or pick a lower LOD — those
are scene-graph decisions, and they are equally cheap to make in JS.

Worth knowing: **we already use WASM exactly where it pays.** The meshopt
decoder that decompresses every one of our models is a WASM module, and it's
why a 2 MB `.glb` unpacks as fast as it does.

WASM would become interesting if we were doing heavy per-frame simulation on
thousands of entities — flocking, fluid, large-scale physics. We are running
a handful of ships and a few dozen torpedoes; that is 1.84 ms of work.

**The lever is drawing less, not computing faster.**

---

## Proposed plan (nothing here removes content or changes feel)

Ordered by measured payoff per unit of risk.

**P0 — The boot sequence + tiered loading.** *Ships first: it is the first
impression, and it is what makes every later optimisation safe to land.*
See the section above.

**P1 — Cull and LOD the asteroid belts.** *Biggest single win.*
Re-enable frustum culling with correct bounding volumes; distance-gate whole
belts (a belt 8 km away is not drawn); swap rocks to a low-poly LOD beyond a
few hundred units — 2,308 triangles for a 3-pixel rock is pure waste.
*Expected: ~3.5M → ~200–400k triangles.* Visually identical: the rocks you
can actually resolve keep their detail.

**P2 — Distance-gate the world.** Systems, POIs and activity hardware only
render when within a sensible radius; beyond it, keep the star/planet as the
cheap billboard the HUD already implies. Nothing disappears that you could
see anyway — the labels and radar continue to show everything.
*Expected: removes most of the residual draws from anywhere in deep space.*

**P3 — Audit all 17 `frustumCulled={false}` sites.** Most exist to dodge
bad bounding spheres on instanced meshes; the correct fix is to set the
bounding sphere, not to disable culling.

**P4 — Ship LODs.** Three levels per hull (full / mid / silhouette). A
freighter at 2 km does not need 156k triangles.
*Expected: 500–800k triangles saved whenever traffic is on screen.*

**P5 — Payload discipline.** Stop preloading everything: load hulls on
proximity (the traffic system already knows what's inbound); re-decimate
`gateway.glb` (6.4 MB) and `freighter-a.glb` (2.2 MB); move textures to
KTX2/Basis.
*Expected: 19 MB → 5–7 MB, and the 546 ms of startup long tasks mostly
disappear.*

**P6 — Adaptive resolution.** Measure frame time and scale DPR between 2.0
and 1.25 automatically. On an M3 at 60 fps you keep full sharpness; on a
weak machine it degrades gracefully instead of stuttering. This is the one
lever that trades a little crispness for smoothness, and it only pulls when
the frame is already late.

**P7 — Bloom resolution scale.** Minor (0.78 MP total), do it last if at all.

### Targets

| | now | after P1–P4 | after P0–P6 |
|---|---|---|---|
| triangles/frame | 3.0–4.4 M | ~400 k | ~400 k |
| GPU ms/frame | 51.5 | ~15 | < 12 |
| fps | 29 | 60 | 60 locked |
| payload | 21.5 MB | 21.5 MB | ~7 MB |
| time to fly | instant, then 546 ms of jank | same | boot screen, then smooth |

---

## Two specific questions from Tirtha

### "Distant systems are visible from spawn. How do you keep that?"

They keep being visible. What changes is only what they are *made of*.

Measured screen sizes at our field of view (62°, 780 px tall):

| body | distance | covers |
|---|---|---|
| a planet (r≈100) | 500 u | 285 px |
| a planet | 2,000 u | 72 px |
| a planet | 5,000 u | 29 px |
| **a planet** | **9,000 u** | **16 px** |
| a star (r≈200) | 9,000 u | 32 px |
| an asteroid (r≈15) | 3,000 u | **7 px** |

Today a planet is drawn as a **64×64-segment sphere (~8,200 triangles)**
plus an atmosphere shell at 48 segments (~4,600) plus a glow shell at 32
(~2,000) — roughly **15,000 triangles**. At 9,000 units that is **~900
triangles per visible pixel**.

The fix is not to hide it. It is to stop spending 15,000 triangles to
paint 16 pixels:

- **Screen-size LOD.** At ~70 px an 8× cheaper sphere is indistinguishable;
  at ~16 px a low-segment sphere is pixel-identical; below ~6 px a sprite
  with the same colour and glow is pixel-identical. The star's glow is
  already a cheap shader/sprite.
- **The system never disappears, never dims, never moves.** Same position,
  same colour, same brightness, same HUD label (labels are DOM and cost
  nothing). A visitor at spawn sees exactly the sky they see today.
- Proof: the pixel-diff harness. If a frame changes measurably, the LOD
  threshold was wrong and it does not ship.

Measured cost of what this buys: from one viewpoint, turning toward the
cluster of systems costs **+229 draw calls and +1.2 M triangles** versus
looking away. That is the budget we recover while the sky looks the same.

### "There is no loading — it throws the visitor in raw."

Correct, and it is a measurable part of the sluggishness:

- `DOMContentLoaded` at **154 ms** — the visitor is dropped into the world
  almost immediately…
- …while **19 MB of models across 11 files are still downloading and
  decoding**, because every `useGLTF.preload` fires on module import.
- That decode produces **8 long tasks totalling 546 ms** of blocked main
  thread *during the first seconds of flying*.

So the first impression is a stuttering world, and nothing explains why.

**Proposal — P0, a diegetic boot sequence.** Not a spinner: the ship's
preflight, which is on-brand for a site that is entirely a cockpit.

- Lines tick off against *real* load progress — reactor, nav computer,
  transponder, PDC calibration, drive — with a bar tied to actual bytes.
- It doubles as the **audio-unlock gesture** every browser requires
  (Bruno's "CLICK TO START" solves exactly this problem). Ours reads as
  IGNITION / BEGIN PREFLIGHT. Today's welcome card neither gates rendering
  nor loading.
- **Tiered loading**: only the spawn neighbourhood gates the boot screen —
  the ship, the station, immediate surroundings (a few MB). Everything
  else streams during play, ordered by proximity, with the jump drive's
  8–11 s cinematic as the load window for anything distant.
- This *serves* the no-pop contract rather than fighting it: content
  arrives long before the pilot can reach it, and the boot screen means the
  world is never shown half-built.

---

## THE NO-POP CONTRACT (binding on every optimisation above)

*Tirtha's constraint, 2026-07-26: "whenever the user drives the ship
somewhere else, things must not be popping into existence randomly because
things are going slow somewhere."* Nothing ships unless it satisfies this.
Frame rate is worth nothing if the world flickers.

**1. Only ever remove what cannot contribute a pixel.**
Two removals are provably invisible and they are where nearly all the win
is:
- **Frustum culling** — the object is *off-screen*. By definition it cannot
  pop, because you were not looking at it. (This alone is most of the 3.0 M
  wasted triangles.)
- **Sub-pixel geometry** — a rock whose whole silhouette covers less than
  ~1.5 px. Swapping 2,308 triangles for 40 changes nothing a screen can
  show.

**2. Thresholds are measured in SCREEN SIZE, not world distance.**
An LOD switch keyed to "how many pixels does this cover" is automatically
correct at every field of view and resolution. Keyed to raw distance, it is
a guess that breaks when you zoom or change monitor.

**3. Every switch gets hysteresis.**
Drop to the cheaper level at 1.0× the threshold, restore at 0.85×. Without
this, a ship hovering exactly at the boundary flickers between levels —
which is the worst possible artifact and the one people actually notice.

**4. No hard swaps — dithered cross-fade.**
Across a transition band the two levels blend (screen-door / alpha dither
over ~0.3 s). You get a dissolve, not a jump. Applied to LODs and to any
impostor substitution.

**5. Distant things are REPLACED, never deleted.**
A belt 8 km out is not culled to nothing — its rocks become a cheap
impostor (points/sprites) that preserves the same visual mass and colour.
The band of dust you can see out the window stays exactly where it was. The
rule: *the silhouette of the world never changes, only its cost.*

**6. Loading happens BEFORE arrival, never on it.**
Nothing is fetched or decoded at the moment you need it. Proximity
prefetch, plus the jump drive's 8–11 s flip-and-burn cinematic as the
load window (the same trick the Deep design already relies on). If an
asset is not ready, we keep the current one on screen — we never show a
hole.

**7. Nothing pops IN either.**
Anything that must legitimately appear (a new hauler entering the lanes)
spawns out of view and fades up over ~1 s. Already partly done: traffic
refuses to spawn within 900 units of the player.

### How this gets proven, not asserted

A **visual regression harness**: fly a fixed camera path (spawn → station →
colony → wreck → gunnery → Track → deep space), capture N frames at fixed
positions, and diff the images pixel-by-pixel against the same path on the
pre-optimisation build.

- **Acceptance: no frame differs by more than a small perceptual threshold**,
  and no frame contains a region that changed from "object" to "empty".
- Every optimisation lands only if the diff passes *and* the frame time
  improved. Both, or it does not ship.

This turns "does it still feel the same" from an opinion into a test.

### Explicitly not proposed

- Rewriting simulation in WASM (saves 1.84 ms of a 51.5 ms frame).
- Cutting ships, traffic, activities, text, or the map's scale — none of it
  is the problem. The problem is that we draw all of it all of the time.
- Dropping postprocessing. It is 0.78 megapixels; the look is worth it.

---

---

## P1 RESULT — measured after implementing belt culling (2026-07-26)

**Shipped:** `InstancedMesh.computeBoundingSphere()` on every belt mesh, then
frustum culling re-enabled. The bounds now enclose the real instances rather
than the phantom rock at the origin that made culling look broken.

**No-pop verification — passed.** Captured A/B pairs from the same live scene
by toggling `window.__perf.beltCulling`, plus a control pair where *nothing*
changed but time passed:

| | pixels changed | mean delta |
|---|---|---|
| culling toggled ON | 1.695 % | 0.29 |
| **nothing changed, just waited** | **1.531 %** | **0.29** |

Identical mean; the difference is within capture-timing drift. The amplified
difference images show red/cyan *pairs* (an object that moved) and never an
unpaired red region (an object that vanished) — the same signature appears in
the control. **Nothing disappears.**

**Triangles removed:**

| location | before | after | change |
|---|---|---|---|
| spawn / Comms Station | 3,076,626 | 1,324,188 | **−57 %** |
| inside the Projects belt | 3,262,028 | 2,392,222 | −27 % |
| deep space facing the cluster | 4,470,959 | 3,575,204 | −20 % |

**GPU time saved — and the surprise:**

| location | GPU off | GPU on | saved |
|---|---|---|---|
| spawn | 35.47 ms | 31.82 ms | **−10 %** |
| Amnia docks | 23.52 ms | 24.07 ms | ~0 |
| inside belt | 26.71 ms | 27.70 ms | ~0 |
| deep space | 25.57 ms | 24.43 ms | −4 % |

**Deleting 1.75 million triangles bought only 3.65 ms.** That is the most
useful number in this whole audit: **we are not vertex-bound, we are
fill-bound.** The GPU is not struggling to transform geometry, it is
struggling to shade pixels.

### What that means for the order of work

The remaining plan is re-ranked by this evidence:

1. **Fill-rate first** — adaptive resolution (was P6) and hunting expensive
   fragment work: transparent overdraw from nebulae, atmosphere shells and
   glow shells stacked over large screen areas, plus the procedural planet
   shaders. This is where the 51 ms actually lives.
2. **Payload / startup** (was P5, P0) — 19 MB and 546 ms of blocking decode
   is a real, separate, user-visible problem regardless of frame rate.
3. **Geometry work** (ship LOD, body LOD) — still correct, still worth doing,
   but now understood as second-order: it buys headroom rather than frames.

P1 stays in: it is verified invisible, it removes 1.75 M triangles of pure
waste, and it is a prerequisite for the LOD work to pay off. It simply is not
the headline fix, and the measurement says so.

## Caveats

- All numbers are one machine (M3, DPR 2, Chromium under automation).
  Absolute figures will differ elsewhere; the *ratios* (97% GPU, 3M
  unculled triangles, belts ≈ 80%) are structural and will hold.
- Frame times quantise to vsync (16.7 / 33.3 / 50 ms), which is why the
  GPU-timer figure (51.5 ms) is the honest one and the rAF figure (34 ms)
  understates the cost.


## THE BILLBOARD FREEZE — measured and fixed (2026-08-04)

Reported from the live site: *"when I go close to a planet or the comms
station… the game completely freezes for maybe one or two seconds, and then
the boards appear."*

Reproduced with `__teleport` straight into board range, worst single frame:

| arriving at | before | after |
|---|---|---|
| Work Experience | **1618 ms** | 229 ms |
| Comms Station | 482 ms | 279 ms |
| Projects | 302 ms | 290 ms |

A CPU profile of the hitch (50 µs sampling) attributed it to:

    500 ms  (program)            GPU driver linking new shader programs
     68 ms  getProgramInfoLog    three asking, which forces the wait
    190 ms  updateMatrixWorld    the whole board subtree, in one frame
    146 ms  updateMatrix         static board parts, rebuilt every frame
     48 ms  projectObject

Both of the obvious suspects were wrong: texture upload measured ~0 ms, and
troika builds its SDF atlases in a worker. It was shader compilation and the
scene graph.

**The fix**, all behind `perfFlags.boardWarmup` so it can be A/B'd live:
- boards mount **one per frame** instead of all at once;
- activation starts at **3× the reveal distance**, so the work is finished
  before anything is wanted on screen;
- `renderer.compileAsync()` links the subtree's programs through
  `KHR_parallel_shader_compile` (confirmed available on ANGLE/Metal), and the
  reveal waits on it;
- static board parts get `matrixAutoUpdate = false` after their first
  placement — a steady-state win, not just a hitch win.

`renderer.debug.checkShaderErrors` is also disabled in builds. One profile put
253 ms inside `getProgramInfoLog`, but an A/B of that flag alone did **not**
isolate a repeatable win, so it is not claimed as part of the fix.

Screenshots before/after at the Comms Station are pixel-comparable: same
boards, same layout, same legibility. The remaining ~250 ms on arrival is a
stutter rather than a freeze, and is next.


## PIXELS ARE NOT THE BOTTLENECK — the plan's first step, overturned (2026-08-04)

The audit put adaptive resolution first on the strength of "97% GPU bound and
fill-limited". Measured directly, that does not hold. At a heavy viewpoint
inside the Projects system, pinning the pixel ratio by hand and letting each
setting run for 3.5 s:

| backing store | pixels | GPU time | frame time |
|---|---|---|---|
| 3600 x 2025 | 100% | 177 ms | 73.6 ms |
| 2400 x 1350 | 44% | 166 ms | 65.0 ms |
| 1200 x 675 | 11% | 158 ms | 60.8 ms |

**89% fewer pixels bought 11% of the GPU time.** Whatever dominates that
view, it is not shading pixels. (Absolute GPU figures are inflated — the timer
query window straddles frames — but every row used the same method, so the
comparison is sound. This is also a dev build, where JS costs far more than in
a build; see the caveat below.)

Three corrections follow:

1. **Adaptive resolution is insurance, not the headline fix.** It ships,
   because a genuinely fill-bound device (phone, integrated graphics) still
   benefits, but it now proves its own worth: each reduction is a trial, and if
   the frames do not measurably improve it puts the pixels back and stops
   trying. On the machine above it correctly stepped 1.5 -> 1.35, saw the
   median go from 63.9 ms to 75.3 ms, reverted, and gave up.

2. **The ordering needs re-deriving.** "Fill-rate first" was inferred from the
   97% GPU split, not from a pixel-count experiment. The experiment now exists
   and disagrees, so the next question is what that GPU time is actually spent
   on at a heavy viewpoint — vertex work, draw-call count, texture bandwidth or
   a specific expensive material.

3. **Measure the build, not the dev server.** Everything above is a dev build
   under automation, where React and three are unminified and JS costs are much
   larger than what a visitor sees. The July figures may not be comparable. The
   probes needed to measure a production build (`__teleport`, `__setDpr`) are
   DEV-only, so getting a like-for-like number needs a deliberate probe build —
   that is the next measurement, before any more optimisation is chosen.

### A note on method

Two false results were produced along the way and both were the harness, not
the site: pinning the pixel ratio appeared to do nothing because the disabled
controller was re-pinning it to the ceiling every frame, and `renderer.info`
reports one draw call because three resets it per render pass and the last pass
is the composer's fullscreen quad. Neither number meant what it looked like.


## WHAT THE FRAME IS ACTUALLY SPENT ON — probe build (2026-08-04)

`npm run build:probe` produces the production bundle with the measurement
hooks left in, so for the first time these numbers describe what a visitor
runs rather than the dev server. The difference is not small:

| at the same viewpoint, 2400x1350 | dev server | probe build |
|---|---|---|
| frame | 73.6 ms (14 fps) | **22.9 ms (44 fps)** |
| GPU | 177 ms | 47.7 ms |

The July GPU figure (51.5 ms) matches the probe build, so the audit's
*measurement* was sound. Its *inference* — "GPU bound, therefore
fill-limited" — was not: dropping from 3600x2025 to 1200x675 still only
moved the frame from 22.9 ms to 20.4 ms.

### Two findings that dwarf everything else on the plan

Both taken with an immediate baseline-condition-baseline pairing, on a fresh
page, so slow drift cancels:

| change | frame | saving |
|---|---|---|
| player ship DoubleSide -> FrontSide | 38.1 -> 20.5 ms | **17.6 ms (46%)** |
| all point lights off | 35.1 -> 16.7 ms | **18.4 ms (52%)** |

**1. Double-sided hulls.** Nothing in this repo asked for it — Sketchfab
exports carry `doubleSided: true` and three honours it, so every triangle of
every downloaded hull is rasterised twice and cannot be depth-rejected early.
The back faces are inside the ship. `<HardenMaterials>` now restores
`FrontSide` on opaque loaded materials, with `userData.keepDoubleSide` opting
out the two surfaces that genuinely need it (planet atmosphere shell, the open
cone of a billboard jet).

**2. One hundred and two point lights.** Every billboard mounts its own
floodlight; 102 exist and ~21 are visible at once. `MeshStandardMaterial`
costs O(lights) per fragment, so every lit surface in the scene pays for all of
them. This is untouched and is the single largest remaining lead. Cheaper
options, in order of preference: bake the wash into the panel material, share
one floodlight per board ring, or light only the board being read.

### Triangle count is nearly irrelevant here

Hiding whole subtrees, paired against adjacent baselines:

| subtree | meshes | triangles | saving |
|---|---|---|---|
| #18 | 515 | 1,530k | **0.0 ms** |
| #14 | 10 | 884k | 1.2 ms |
| #13 | 174 | 407k | -0.1 ms |
| #32 (the player ship) | 36 | 141k | **10.0 ms** |

The heaviest subtree in the scene costs nothing; the ship, with a tenth of its
triangles, costs a quarter of the frame. Any future plan that ranks work by
triangle count is ranking by the wrong number.

### Four ways these measurements lie, all found the hard way

- **Thermal throttling.** Sustained automated rendering degrades the baseline
  from 23 ms to 55 ms over about ten minutes on this M3. Any unpaired
  comparison taken minutes apart is worthless.
- **The ship drifts.** Gravity pulls it toward whatever system it was parked
  near, so a "fixed" viewpoint is not fixed — one run ended up inside the star.
- **Bulk `needsUpdate` recompiles.** Flipping hundreds of materials at once
  triggers a shader recompile storm that poisons the next sample.
- **Flags that arrive too late.** `perfFlags.hardenMaterials` cannot be A/B'd
  by flipping it after load: models load during the preflight and the pass has
  already run. A real whole-scene A/B needs the flag set before module init.

Because of the last two, the **17.6 ms is established for the ship in
isolation, not yet for the whole-scene pass**. The pass is verified to work
(565 materials remain double-sided, the rest converted) and verified not to
break anything visually, but its end-to-end number is still owed.


## THE BOARD FLOODLIGHTS — removed, and the look they were there for, kept

102 point lights existed across the world, one bolted to every billboard, and
`MeshStandardMaterial` costs O(lights) per fragment — so every lit surface in
the scene paid for all of them. Turning them all off measured **18.4 ms of a
35 ms frame** (paired, fresh page).

They are gone. 102 point lights -> 20 (stars, the station, the drift colony).

The look they existed for is now painted instead, to Tirtha's brief: *the
writing should be visible only because of floodlights attached to the board
itself; naturally there would be unlit parts, and that is fine as long as the
text is understandable.* A lamp bar with three visible lamps runs along the
top edge; a shade map darkens the plate in proportion to how far it is from
them, so the face falls into black at the bottom corners. The text is drawn
with its own material in front of that layer, so it stays legible wherever it
falls — the dark parts cost atmosphere, not readability.

The boards also stopped being flat colour. `panelTexture.ts` draws painted
steel into a canvas at startup — rolling marks, weld seams, grime and rust
banking up at the edges — shared by every board in the world. Nothing is
downloaded for any of it.

**The end-to-end number is still owed.** Measured immediately afterwards the
frame read 50 ms, worse than the 22.9 ms baseline — but that baseline was
taken hours earlier on a cool machine, and this one had been rendering flat
out since. Thermal decay of 23 -> 55 ms was already documented above. Nothing
here can be concluded from that reading; the saving rests on the paired
lights-off measurement, and a clean confirmation needs a cold machine.


## BOARD LIGHTING v2 + REVIEW OF THE 2026-08-04 OPTIMISATIONS (Fable, same day)

**The painted-light approach was scrapped** after Tirtha's verdict on its look
("it does not look like anything"). The face is now lit by real math: a small
shader evaluates the board's three lamps per pixel — inverse-square falloff,
soft cone, Blinn specular, normal-mapped plate — with lamp positions fixed in
board-local space. No scene lights are involved, so the 102-light problem
stays dead, and the face dropped from three draw calls (panel + shade quad +
glow strip) to one. Fixture geometry and shading share one `lampLayout()`, so
the light provably comes from the hardware you see. In vacuum there are no
visible beams — fixtures and lit plate only.

**Texture candidates** for the plate surface are staged in `textures.html`
(dev page): six CC0 sets from ambientCG (color + real normal maps) against the
procedural v2 plate, all rendered under the production shader. Sketchfab was
considered and rejected for this: its textures are per-model atlases, not
tileable materials.

**Review of the earlier optimisations found two real flaws, both fixed:**

1. `HardenMaterials` watched `gl.info.memory.geometries`, which only ticks
   AFTER a mesh's first draw — so every newly spawned hull compiled its shader
   double-sided, was flipped, and compiled again, the second time mid-flight,
   exactly where the no-pop contract cares. Clones share geometry, so cloned
   materials could dodge the signal entirely. Now: unconditional sweep every
   15th frame (~7 µs/frame amortised), and materials caught before their first
   draw skip `needsUpdate` — the first compile picks the corrected side up for
   free.

2. `AdaptiveResolution`'s "pixels don't help" verdict latched for the whole
   session, but the verdict describes a viewpoint, not the machine. It now
   expires after two minutes.

Left alone on review: the board warmup/mount pacing (correct), and
`checkShaderErrors=false` in builds (kept, still not credited).

**Where the frame stands** — standard heavy viewpoint, dpr 1.5, 2400×1350:

| when | median | fps |
|---|---|---|
| baseline, cool machine (this morning) | 22.9 ms | 44 |
| after lights-gone + sides + lighting v2, WARM machine | **17.1 ms** | **58** |

The warm-machine caveat cuts against us here, so the real improvement is at
least this. Confirmation on a cold machine remains owed, per the earlier note.


## HOW I WOULD ATTACK WHAT REMAINS — first-principles plan (Fable, 2026-08-04)

Asked to approach the performance problem as if implementing it fresh, not
patching what exists. The prior work stands; this is the strategy from here.

**The prime law this audit earned three times: attribute before optimizing.**
"97% GPU" became "fill-limited" without an experiment, and the experiment
killed it. Triangles were assumed heavy; the 1.5M-triangle subtree cost
nothing. Dev-server numbers condemned code the build runs fine. So: the
remaining ~17 ms at the heavy viewpoint is NOT yet attributed, and nothing
gets optimized until it is.

**Attribution plan (one session, probe build, fresh page per arm):**
1. CPU/GPU split: JS main-thread time inside the rAF (R3F loop + three
   render call, measured around `gl.render`) vs the timer-query GPU median.
2. If CPU-heavy: profile `projectObject` / `updateMatrixWorld` /
   `WebGLRenderer.render` self-times. ~3,100 meshes make DRAW-CALL AND
   GRAPH-WALK OVERHEAD the strongest suspect — three touches every object
   every frame just to decide what to draw.
3. If GPU-heavy: binary-search subtrees (paired A-B-A, the drift-proof
   protocol), then within the winner, distinguish state-change cost from
   shading cost by draw-call count vs covered pixels.
4. Composer isolated: render one frame with EffectComposer bypassed. Bloom's
   mip chain is the only full-screen work that survived the pixel ladder;
   it deserves its own number.

**Ranked levers, sized by hypothesis, each with its kill criterion:**
- **Merge static board geometry.** Every billboard is ~25 meshes over 2
  shared materials; merged at mount that is 1–2 draws per board — hundreds
  of draws saved where boards cluster, plus the matching graph-walk savings.
  Kill if attribution says draws are cheap here.
- **Distance-gate small-fry per system** (boards, activity hardware, belt
  extras beyond the range where they are sub-pixel). Collapses both draw
  count and graph walk for the 90% of flight time spent in transit. The
  no-pop contract is satisfied by gating strictly beyond sub-pixel range and
  verified with the visual-diff judge. This was P2 in July; it survives
  first-principles review.
- **Static-subtree matrix freeze**: `matrixAutoUpdate=false` across the
  station, wreck, drift colony, gates (boards already done). Cheap, safe,
  bounded win.
- **Composer diet** if its number warrants: bloom at half input resolution,
  5 mip levels, drop the near-invisible ChromaticAberration pass. Visual
  diff decides, not taste.
- **Payload tiering** (unchanged from July, still real, independent of
  frame rate): 19 MB serial → ship+nearest-system first; KTX2 textures;
  re-decimate the two heavy models. Kills the loader creep and the cold
  26 s start.

**What I would explicitly NOT do:** chase pixels (measured irrelevant on
this class of machine — adaptive resolution stays as insurance for machines
where it is not); chase triangles (measured irrelevant); WASM the physics
(the integrator is microseconds); move work to a worker (nothing measured
main-thread-bound enough to pay the transfer tax).

**Standing measurement discipline** (now house rules): probe build only;
fresh page per experimental arm; paired baseline-condition-baseline so
thermal drift cancels; suspect any result where hiding work makes things
slower; `renderer.info` lies inside composers; a flag that cannot be flipped
before module init cannot be A/B'd after load.


## THE PERFORMANCE PUSH, EXECUTED — and what the evidence rejected (2026-08-04)

Governing constraint, from Tirtha: playability and delight are the hard
line; performance serves them. Banned outright: pixelation, pop-in, visible
distortion. Every lever below was accepted or rejected against that line.

### Attribution (Phase A, probe build, simultaneous per-frame counters)

| viewpoint | frame | JS render (matrices+walk+dispatch) | draw calls |
|---|---|---|---|
| station | 25.8 ms | 5.4 ms | 381 |
| Projects | 28.6 ms | 4.2 ms | 106 |
| transit | 19.7 ms | 3.5 ms | 91 |

The CPU side is <=6 ms and dispatched draws are hundreds, not thousands —
frustum culling and lazy board mounting already work. The frame is
GPU-side. The composer could not be priced: thermal drift (26 -> 39 ms
across paired arms after hours of automated rendering) swamped it.
`perfFlags.postfx` + PostFxGate now exist so a cool-machine run can price
it in one minute.

### Accepted (shipped)

- Shared board materials: ~3,500 -> 957 unique materials in the live scene.
- ContactStation hidden-board early-out; InteramniaDrift colony matrix
  freeze (marquee stays live).
- Loader honesty: SkyDome's 1.8 MB of sky now counts toward the boot bar;
  the 26 remote content photos moved to a private LoadingManager and can
  never again hold the bar at 99%.
- index.html: preload gateway.glb + tachi.glb + starmap, preconnect i.ibb.co.
- buoy.glb 210 -> 100 KB, torpedo.glb 123 -> 25 KB (quantize+meshopt;
  attributes, textures and triangle counts verified identical).
- Flag honesty: bodyLod/shipLod marked DECLARED, NOT IMPLEMENTED.

### Rejected, with the evidence that rejected it

- **Board geometry merge, transit gating, pool bounding spheres** — killed
  by attribution: the costs they attack total a few ms of CPU that is
  already <=6 ms, and transit dispatches 91 draws.
- **Far star-light gating** — killed by the Delight Line before a line was
  written: stars use distance=0, decay=0.35 deliberately; a sun 6,000 units
  away still lights your hull. Gating would visibly darken transit.
- **Gateway decimation** — 405k -> 238k tris saved only ~1.0 MB (its
  geometry meshopt-compresses superbly) and Phase A says triangles buy no
  frames here; not worth any eyeball risk on the docking hero.
- **Drift decimation** — saved 0.28 MB, dropped a texture in the process,
  and emitted TEXCOORD warnings. Risk for noise; rejected.
- A corrupted 5.8 KB buoy output from one anomalous compression run was
  caught by size sanity-check, never installed, and did not reproduce.

### Corrections to earlier claims

The 2026-08-04 exploration asserted the GLBs ship uncompressed. False: 10
of 11 already carry EXT_meshopt_compression + KHR_mesh_quantization +
EXT_texture_webp from the July pipeline, and drei wires MeshoptDecoder by
default. The payload's real composition: gateway is ~3.8 MB of *compressed*
geometry + 2.6 MB of webp textures. The "~400 MB of bake VRAM at high
tier" estimate stands analytically but was not measured; it only matters
on low-VRAM machines and stays parked behind the (unbuilt) D4.

### Still owed

One cool-machine session: frame medians at the three viewpoints, the
composer's isolated price via `__perf.postfx`, and the cold-start timeline
with the new hints. Do it before any further optimisation is chosen.


## PHASE E — THE COOL-MACHINE SESSION (2026-08-08): the audit closes

The session the whole audit was owed: a rested machine, measured by the
house rules (probe build, fresh page per arm, thermal rest between hot
arms). Conditions: M3 / 16 GB, Brave closed first (swap fell 9.1 GB ->
1.8 GB), battery 82% with Low Power Mode OFF (Apple Silicon runs full
tilt on battery), thermal log clean, canvas pinned to the historical
2400x1350 (1600x900 css at dpr 1.5). The three standard viewpoints are
now pinned as coordinates so future sessions measure the same picture:
Projects heavy (300, 40, -3900 · yaw 0.785), station approach
(1160, 100, -280 · yaw 0.785), deep transit (3000, 200, 3000 · yaw 0).

| arm | median | p95 | note |
|---|---|---|---|
| Projects heavy (July: 22.9 cool / 17.1 warm) | **16.7 ms** | 17.7 | **vsync-locked 60 fps** |
| station approach | 16.7 ms | 18.6 | locked |
| deep transit | 16.7 ms | 18.6 | locked |
| **combat, cert W3** — tracer spray + torpedo brain + THE SCOPE, none of which existed in July | 16.7 ms | 18.6 | p99 18.7, worst frame 18.8 — zero stutter |

**Headroom ladder** (same page, Projects heavy): 60 fps holds through
dpr 2.0 (3200x1800) and 2.5 (4000x2250, 2.8x the shipped pixels);
the wall is at dpr 3.0 (4800x2700 -> 32.4 ms). Missed-vsync doubles
begin appearing in p95 from dpr 2.0, so the comfortable margin is ~2x
pixels. The renderer ships with roughly a 2.5x pixel budget in reserve
at the heaviest viewpoint.

**The composer's price**: at ship resolution, postfx ON = OFF = 16.7 ms
locked — Bloom's whole mip chain fits inside the vsync budget and costs
nothing a visitor can see. (A high-dpr isolation attempt is RECORDED AS
INVALID: flipping the gate at 13 megapixels re-allocates the composer's
render targets and the sustained 4x load triggered the M3's thermal
onset mid-pair — 50 and 66.7 ms readings that are method artifacts, not
composer cost. If an absolute number is ever needed, it wants GPU timer
queries and long cooldowns, not rAF.)

**Cold start**: 7.6 s / 8.1 s to ignition-ready on a LOCAL server — the
pure compute floor (planet bakes, shader warmup, GLB decode, loader
grace). Payload: 23 MB total (18 MB models, 1.5 MB JS, ~2 MB images);
the boot-critical set (JS + preloaded gateway/tachi/starmap + sky) is
~12 MB ≈ 3.8 s at 25 Mbps, which overlaps the compute window — a
25 Mbps visitor reaches ignition in roughly the same ~8 s. The July
target ("<8 s on 25 Mbps") is met at the margin, and the limiter has
FLIPPED: startup is now compute-bound, not network-bound. Phase D did
its job; any further cold-start win lives in bake/warmup staging, which
is Delight-guarded territory (the warmup exists to prevent pops) and is
NOT recommended without a visitor-facing complaint.

**Standing stock at the heavy viewpoint**: 204 geometries, 168 textures,
79 programs, 118 MB JS heap.

**Verdict — the audit closes.** Every standard viewpoint and the
heaviest combat the game can produce run vsync-locked at the shipped
resolution on a cool machine, with ~2.5x pixel headroom and a worst
combat frame of 18.8 ms. July's 22.9 ms baseline is a locked 16.7. No
optimization is owed. The next performance conversation should start
from a new complaint, not from this document.

## 2026-09-01 — the perf frontier (probe build, M3, docks viewpoint)

**The "44 fps CPU ceiling" story is corrected.** Live-visitor telemetry
(post-hygiene) shows desktop at 55-60 fps / 0-6% jank; the fps=0,
85%-jank desktop rows in the trove were BACKGROUNDED TABS (rAF
throttled) plus our own headless harness — the sampler now drops
hidden/throttled windows and resets on visibilitychange, so they can
never pollute again. session-start now records `tier` + `dprCeil` so a
stale-bundle session (the dpr-2.4 phone ghost of 08-27) is
attributable at a glance.

**The real desktop defect was a p90 stutter at the heaviest viewpoint**
(the docks): median 16.7 ms but p90 33.3 — every ~10th frame missed
vsync. CPU profile attribution: ~17% of busy time in
updateMatrixWorld/updateMatrix across ~6,636 scene objects, ~3,900 of
them static board signage. Two writers were defeating the existing
board freeze:
- Billboard slewed its spin group EVERY frame even at rest — one
  rotation write marks the group dirty and force-multiplies every
  frozen descendant's world matrix. Fix: 0.012 rad deadband (a board
  at rest writes nothing; tracking resumes the moment you move).
- PlanetBoards rewrote group scale + all ring positions per frame with
  constant values. Fix: scale writes stop once settled (snaps to
  target inside 0.0008), ring positions write only when the mounted
  count changes.

**Measured result, same viewpoint, same dpr 1.5, postfx ON:
p90 33.3 ms → 17.9 ms; median steady 16.7.** The docks stutter is
gone. Verified no-pop: boards still reveal, read, and slew to face the
ship (screenshot pass).

Remaining, deliberately not taken now: the flag-check walk itself
(~1.1 ms/frame on M3) would need subtree matrixWorldAutoUpdate
surgery for diminishing desktop returns — reconsider if phone telemetry
(now trustworthy) still shows a CPU wall at dpr 1.9.
