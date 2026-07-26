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

| | now | after P1–P4 | after P1–P6 |
|---|---|---|---|
| triangles/frame | 3.0–4.4 M | ~400 k | ~400 k |
| GPU ms/frame | 51.5 | ~15 | < 12 |
| fps | 29 | 60 | 60 locked |
| payload | 21.5 MB | 21.5 MB | ~7 MB |

### Explicitly not proposed

- Rewriting simulation in WASM (saves 1.84 ms of a 51.5 ms frame).
- Cutting ships, traffic, activities, text, or the map's scale — none of it
  is the problem. The problem is that we draw all of it all of the time.
- Dropping postprocessing. It is 0.78 megapixels; the look is worth it.

---

## Caveats

- All numbers are one machine (M3, DPR 2, Chromium under automation).
  Absolute figures will differ elsewhere; the *ratios* (97% GPU, 3M
  unculled triangles, belts ≈ 80%) are structural and will hold.
- Frame times quantise to vsync (16.7 / 33.3 / 50 ms), which is why the
  GPU-timer figure (51.5 ms) is the honest one and the rAF figure (34 ms)
  understates the cost.
