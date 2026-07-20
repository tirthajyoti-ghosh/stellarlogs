# Stellarlogs 3D — Roadmap (July 2026)

Planning doc agreed with Tirtha on 2026-07-20. No code in this pass — this is the
work list for the next build sessions, in priority order. Each phase ends
browser-verifiable (screenshots + fps sampling via Playwright).

---

## Phase A — Performance ✅ SHIPPED 2026-07-20 (commit a7acd12)

Results: Projects-core fps 50 → 60 (capped) on the dev machine; GLB 19.6MB →
2.4MB. Star shader NOT baked (still live-animated; revisit only if low-tier
devices still struggle). Dynamic resolution not needed — the static 1.5 cap
plus planet bakes hit 60. NOTE: the optimized GLB uses KHR_mesh_quantization —
never bake matrices into its attributes (normalized ints clamp); render via
<primitive> with node transforms intact.

The ship is NOT the bottleneck (140k tris, 1K textures, ~53MB VRAM, 4 draw
calls). In-system slowness is dominated by per-pixel procedural planet shaders
at Retina DPR 2 with bloom.

1. **Bake planet surfaces at load** — biggest win. Render each planet's
   procedural surface once into an equirect texture (offscreen render target or
   canvas), then the planet becomes a plain textured sphere; rotation = spinning
   the mesh. Keep the cheap per-pixel parts live (atmosphere rim, limb
   darkening, ocean specular). Same for star granulation if feasible.
2. **Dynamic resolution** — drop DPR 2 → 1.5 when frame time slips (or cap at
   1.5 outright on high tier; visually near-identical, ~44% fewer pixels).
3. **Compress the Tachi GLB** with gltf-transform: `weld` + `meshopt` geometry
   compression + KTX2/UASTC textures. Expect ~19.6MB → 3–5MB download AND ~4–6×
   less texture VRAM. Needs `KTX2Loader`/`MeshoptDecoder` wired into `useGLTF`.
4. Smaller wins: re-index the merged ship geometry (currently non-indexed,
   ~422k verts), distance-LOD on any remaining shader noise octaves, tune board
   activation radii.
5. **Measure first**: before/after fps sampled in-system with a planet
   fullscreen; `renderer.info` draw-call counts in the perf notes.

## Phase B — Flight feel ✅ SHIPPED 2026-07-20 (commit a7acd12)

Auto-level and pitch limit removed; full 360° pitch verified inverted (HUD
wraps to ±180°, chase camera stays coherent, warp align takes shortest path).

- **Delete pitch auto-level** (`pitchAutolevel` in `src/config/flight.ts`,
  applied in `src/physics/integrator.ts`). The ship must hold whatever attitude
  the pilot leaves it in — it's a spacecraft, nothing "rights" it toward the
  stellar plane.
- **Decide pitch limit**: `pitchLimit 1.25` (~72°) is another hidden automatic
  constraint. Preferred: unlock full 360° pitch. Requires checking HUD
  assumptions first (heading tape, radar projection, chase-camera up vector all
  assume a mostly-upright ship — verify no flip glitches when inverted).
- No other auto-actions exist today (yaw has no centering; warp auto-align is
  pilot-commanded, keep it).

## Phase C — Asset upgrades ✅ SHIPPED 2026-07-20 (commit 1fdd4ac)

Gateway station (6.6MB), SebastianSosnowski asteroid pack (0.47MB, 10 instanced
variants), NASA/SVS Deep Star Maps sky (tone-mapped EXR → 4k JPG, dimmed via
material color), ESA/Hubble nebula photo sprites (Orion/Carina/Lagoon) with
radial edge fades. Skipped: alexandr.melas skydomes (only 1024², too low-res)
and Solar System Scope planet textures (baked procedural planets already hit
the bar — revisit only if a specific planet type looks weak). All credits in
Welcome card, SeoContent, README.

| Asset | Source | License | Plan |
|---|---|---|---|
| Comm station | "Gateway" by andreas9343, Sketchfab `57c6a27313794618a299ebe9ec8c2afd` (404k faces, 45.8MB raw) | CC-BY | Decimate + meshopt + KTX2 → target 5–8MB; replaces procedural station. NASA-Gateway realism matches the Tachi. |
| Asteroids | "Asteroids Pack (metallic)" by Sketchfab `eff495d9315c47dbb2777ec80bef40d8` (23k faces) | CC-BY | Take 3–4 variants, instance them in the belts; <1MB after compression. Optional flex: 1 real photogrammetry asteroid (Bennu/Itokawa) from NASA 3D Resources (public domain). |
| Nebula sky | alexandr.melas equirect space skydomes, e.g. `f7a5798b5b374576879973272d27300e` (~0.5MB) | CC-BY | Real painted nebulae on the existing follow-the-ship sky dome, replacing baked canvas blobs. Alt: NASA SVS Deep Star Maps (public domain) for a real Milky Way band. |
| Planet/moon textures | Solar System Scope textures (solarsystemscope.com/textures), up to 8K equirect | CC-BY 4.0 | Real gas-giant banding / cratered moons on our spheres, keeping our atmosphere + limb-darkening shaders on top. Dovetails with Phase A baking (a loaded texture IS the bake). |
| Ship | keep current MCRN Tachi | CC-BY (credited) | Do NOT swap: best free alternative (56k-face stylized Roci) is a visual downgrade. Compress instead (Phase A.3). |

Every CC-BY asset added → credit line in Welcome card small print, SeoContent,
and README (same pattern as the Tachi credit).

## Phase D — Billboards: geostationary + face-the-pilot

- Kill the spin and orbital drift: boards hold fixed positions over each planet
  (geostationary).
- When the ship enters read range, each board slowly yaws to face the ship,
  with its attitude thrusters visibly puffing while it turns (makes the
  existing thruster props functional, not decorative).
- Beyond read range boards sit static. No full camera-billboarding — rejected
  as fake-feeling.

## Phase E — Tactical MFD: make the nearest-contact readout useful

Current state: shows raw nearest-planet name (overflows on long names, e.g.
recommender-named planets), `RNG`/`VEL` jargon, no purpose. Redesign:

- Type/system chip above the name: `PLANET · RECOMMENDATIONS` in system color;
  ellipsis-truncate long names.
- Bearing chevron showing where the contact is relative to the nose.
- Plain language: `4.0 km · closing 6 m/s`.
- Purpose line by distance: far → `8 content boards in orbit`; near →
  `IN RANGE — boards readable`.
- Click/tap the readout or a radar blip → set as jump/approach target (radar
  becomes a menu, not decoration).

## Phase F — Playground (Bruno-Simon-style fun, space edition)

First bundle (one action + one skill + secrets):

1. **PDC target range** — drone/debris targets near the comms station; click to
   fire PDC tracers; hit counter + best streak. The Tachi already has the guns.
2. **Race rings time trial** — checkpoint rings through an asteroid belt; local
   best time on the HUD.
3. **Easter eggs ×2** — derelict Cylon Raider adrift in deep space (old README
   promise) + a wrecked freighter ("Canterbury" homage).

Later candidates: zero-g bowling (nudge cargo pods into a gravity well),
gravity-slingshot speed challenge, visitor "whisper" message buoys (needs a
small backend, e.g. Vercel KV — phase last).

---

## Notes

- Sketchfab downloads: API token required (Tirtha's account), CDN is slow from
  this machine — use the parallel ranged downloader pattern (20 curl range
  requests, then concatenate + verify glb magic/size).
- gltf-transform pipeline (Phase A.3 / C) runs at build-prep time, committed as
  compressed assets — no runtime cost.
