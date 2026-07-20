# Phase F — Playground (Bruno-Simon-style fun)

Planned with Tirtha 2026-07-20. Locked decisions:

- **Placement**: distributed on natural landmarks (not a dedicated arcade zone).
- **Discovery**: the interactive games get *subtle* POI markers so most visitors
  find them; easter eggs stay completely unmarked (pure exploration reward).
- **Scope**: build the **PDC Gunnery Range first** as a self-contained slice
  that establishes the reusable activity-zone pattern; race + easter eggs follow
  once the feel is right.

The games are dessert — this is a portfolio first. Nothing here may block or
distract from reading content. Everything stays invisible until the visitor
flies into it and opts in.

---

## World map of activities (full Phase F vision)

| Activity | Location | Discovery |
|---|---|---|
| **PDC Gunnery Range** (F.1, now) | drifting asteroid field ~`[2600, -140, -4800]`, on the spawn→Projects corridor (high early traffic) | subtle POI marker + visible range buoy |
| **Asteroid Race Course** (F.2, later) | threaded through the Projects outer belt (radius ~5300 around `[0,0,-10500]`) | subtle POI marker + lit start gate |
| **Cylon Raider** wreck (F.3, later) | deep space, off-plane ~`[-6000, 6000, -8000]` | none — unmarked, caption on close approach |
| **MCRN Canterbury** wreck (F.3, later) | beside the Work belt ~`[-18500, 800, -17500]` | none — unmarked, caption on close approach |

---

## The reusable "Activity Zone" pattern (built in F.1, reused after)

The core deliverable of F.1 is a small, general pattern so F.2/F.3 are cheap:

- Each activity is a scene component owning a **zone** (center + activation
  radius) plus its own mechanic.
- A shared **`activityState`** module (imperative, like `hudReadouts`) holds the
  active activity's `title`, `lines[]` (label/value pairs for the panel),
  `hint`, and an `active` flag.
- **`ActivityPanel`** (HUD) renders `activityState`, fading in on `active` and
  out on exit. One panel, any activity.
- Enter radius → `active = true`, panel appears, mechanic runs. Leave → `active
  = false`, mechanic resets; persisted bests (localStorage) survive.
- **POI label**: add a new `HudLabel` kind `'poi'` with a subtle style (dimmer,
  small icon), shown within ~4000u — enough to notice from the corridor, not
  loud enough to read as an "official" destination.

---

## F.1 — PDC Gunnery Range (this slice)

### Why here
The Tachi already has PDC turrets, and the drifting asteroid field is already on
the spawn→Projects path — so the range teaches "you can shoot" within the first
minute, using an existing landmark for context.

### Research findings (2026-07-20, re-verified) — locked: FULL articulation

**The model can do show-accurate PDCs.** The original 19.6MB Tachi has **6
complete PDC turret assemblies** (deployable bay, ball mount, rotary Gatling).
Verified suffix `.001`–`.006` = one physical turret (same-suffix parts cluster
within ~20 raw units), with one quirk: `pdc_gun_details3` uses a bare name for
its sixth instance. Turret positions (VERIFIED against sphere centers; raw
model space, ×0.0135 for ship units):

| Turret | Sphere center (raw) | Mount |
|---|---|---|
| .001 | `(0, +68, -47)` | dorsal aft |
| .002 | `(-83, 0, +71)` | port mid |
| .003 | `(+1, -68, -47)` | ventral aft |
| .004 | `(+83, 0, +71)` | starboard mid |
| .005 | `(-57, -3, +192)` | port bow |
| .006 | `(+57, -3, +192)` | starboard bow |

**Payload is free**: an un-joined meshopt+webp export is still 2.4MB. The model
ships DEPLOYED (no closed pose exists) → **v1 keeps turrets always deployed;
no stow/deploy animation** (bay doors are later polish).

**These are ball turrets** — one free rotation per turret, not a yaw/elevation
hierarchy. Each turret = ONE movable ball group (sphere + gun assembly, aimed
with a single clamped quaternion look-at) + a spinning barrels child. Draw
calls: ~4 hull + 6×2 turret parts ≈ **16–18**.

**Sound is synthesizable** (the show's PDC firing is GAU-8-family — a rotary
cannon at ~65–70 rounds/s whose ~66 Hz pulse-repetition tone IS the "BRRRT"):
- **Fire**: ~66 Hz pulse fundamental + synced noise-burst reports + mid "tear"
  band, short spin-up ramp.
- **Traverse**: servo whine, pitch tracking turret angular velocity, gated to
  movement.
- Quality gate: if the synth doesn't convince on first review, fall back to a
  public-domain US DoD A-10 recording (one-off exception to no-samples).

### Model pipeline — ALL geometry surgery happens OFFLINE

A build script (`scripts/build-tachi.mjs`, gltf-transform Node API) reads the
ORIGINAL float-precision GLB and outputs a ready-rigged `public/models/tachi.glb`:

- Assign every `pdc_*` node to its turret by **nearest sphere center** (immune
  to the naming quirks).
- Per turret: a pivot node `pdc_N` at the sphere center; child `pdc_N_ball` =
  joined movable gun assembly (baked into pivot-local space); grandchild
  `pdc_N_barrels` = joined Gatling barrels (spin axis = rest aim direction,
  from sphere center toward barrels centroid). Bay parts + sphere socket stay
  in the hull.
- Hull: everything else joined by material (~4 meshes).
- THEN weld + quantize + meshopt + webp. Quantization LAST, on the final node
  hierarchy — never transform quantized attributes at runtime (documented
  landmine).
- Runtime just does `getObjectByName('pdc_N')` and rotates. No geometry code in
  the browser. The model swap and the rig-driving code land in the SAME commit.

### Firing — automated point-defense (show-accurate, NO reticle)

- Turrets **auto-acquire and track** drones (visible ball rotation + servo
  whine). The pilot holds **FIRE** (`Space` / in-zone click / touch FIRE
  button); locked turrets spin up and fire.
- **The challenge is flying, not aiming.** Constraints that create skill:
  - turret range ~**220u**, per-turret arc cone ~**100°** around rest direction
    (clamped look-at — guns never aim through the hull);
  - **one target per turret** (max 6 simultaneous locks);
  - drones spread across a ~**600u** cloud → from any position only 1–3 turrets
    bear; a good run is a flight line that keeps feeding turrets.
- **Projectile tracers with travel time** (~800 u/s instanced streaks, like the
  warp streaks; turrets lead their targets; proximity hit-test) — the show's
  "walking the stream onto the target" look. NOT instant raycasts.
- Hit → drone pops (flash + particle burst), respawns elsewhere after ~1.2s.
- Mouse-fire gated to in-zone so exploration clicks are unaffected.

### Scoring (no fail state, replayable)
- The 30-second round starts on the **first shot**, not on zone entry.
- At 0 the run locks, compares to BEST (`localStorage stellarlogs-gunnery-best`),
  flashes "NEW BEST" if beaten, auto-restarts after a beat.
- Panel: **TIME · DESTROYED · BEST · LOCKS n**; hint "HOLD SPACE — TURRETS
  AUTO-TRACK".

### Architecture — activity decoupled from the ship
- `src/state/turretControl.ts` — imperative shared state (like `shipRig`): the
  range writes the target list; the Ship's own frame loop aims its turret rigs,
  spins barrels, and reports muzzle transforms + lock states back. Ship stays
  self-contained; turrets can serve other uses later.

### Files
New: `scripts/build-tachi.mjs` · `src/scene/activities/GunneryRange.tsx` ·
`src/scene/shipTurrets.ts` (rig discovery + aim/spin update, driven from
Ship.tsx) · `src/state/turretControl.ts` · `src/state/activityState.ts` ·
`src/hud/ActivityPanel.tsx`.
Touched: `Ship.tsx` (turret update in frame loop) · `audio/engine.ts` (fire
synth, servo whine) · `App.tsx` · `hudState.ts` + `LabelLayer/HudBridge` (POI
kind) · fire input (`useFireControls`) · `TouchControls.tsx` (in-zone FIRE) ·
`config/*` (zone, arcs, range, RoF, round length).

### Build order (each step verified before the next)
① build script → inspect output GLB (node graph, sizes, draw calls) →
② Ship loads it; dev handle aims turrets at a test point; verify tracking looks
right and never clips the hull → ③ zone + drones + activity panel → ④ firing,
tracers, hits, scoring → ⑤ sound → ⑥ touch + POI label + polish.

### Verification
Corridor → POI + buoy visible → enter zone → panel fades in, turrets begin
tracking drones (servo whine) → HOLD SPACE → barrels spin, BRRRT, tracer streams
walk onto drones, pops + respawns → TIME/DESTROYED/BEST/LOCKS update & persist →
leave → panel fades, round resets. ~60fps, ~16–18 ship draw calls. Touch FIRE
on mobile emulation.

## Later slices (same pattern, noted for continuity)

- **F.2 Race course** — start gate + ~6–8 checkpoint rings (torus geometry +
  trigger volumes) through the Projects belt; timer + best lap.
- **F.3 Easter eggs** — Cylon Raider + MCRN Canterbury; unmarked, caption on
  close approach. Needs sourced (Sketchfab/CC) or procedural models — a research
  step like Phase C.
