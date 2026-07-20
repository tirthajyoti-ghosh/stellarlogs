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

### Research findings (2026-07-20) — locked: FULL articulation

**The model can do show-accurate PDCs.** The original 19.6MB Tachi has **6
complete, articulated PDC turrets**, each an Expanse-accurate assembly:
deployable bay (large + small doors, hinge, pistons, shielding), ball mount
(sphere + holder + two swivel joints), rotary Gatling (barrels + holder + body +
ammo box). Mount points around the hull (raw model space, ship-unit scale):

| Turret | Position (ship units) | Mount |
|---|---|---|
| .001 | `(-1.06, 0.00, +0.92)` | port mid |
| .004 | `(+1.06, 0.00, +0.92)` | starboard mid |
| .002 | `( 0.00, +0.85, -0.60)` | dorsal aft |
| .003 | `( 0.00, -0.85, -0.60)` | ventral aft |
| .005 | `(-0.70, -0.05, +2.56)` | port bow |
| .006 | `(+0.70, -0.05, +2.56)` | starboard bow |

Caveats (both solved in code): the shipped 2.4MB model is **merged into 4 static
meshes** (turrets baked, can't move), the source has **no glTF animations** (we
animate procedurally), and the source parts are **flat-parented, grouped only by
name suffix** `.001`–`.006` (we reconstruct 6 turret groups in code).

**Payload is free.** Re-exporting the model *un-merged* (`gltf-transform optimize
--join false --compress meshopt --texture-compress webp`) is **still 2.4MB** —
meshopt ignores mesh count. We ship this articulated variant and control draw
calls in code: merge non-PDC meshes by material (4 calls, as today) + keep 6
turret groups, each merged into ~3 sub-parts (static base, movable swivel
assembly, spinning barrels) → **~22 draw calls total**, negligible at 60fps.
Turrets sit stowed in normal flight; they only wake in the range.

**Sound is synthesizable, no copyright issue.** The show's PDC firing sound is
built on a real **GAU-8 Avenger** (the A-10 "BRRRT") — a rotary cannon at
~65–70 rounds/s whose deep "raspberry" tone *is* the ~66 Hz pulse-repetition
frequency. We synthesize it in the existing WebAudio engine (no ripped audio):
- **Fire**: ~66 Hz pulse/saw (buzz fundamental) + rapid noise-burst reports
  synced to it + mid "tear" band + light clatter, with a short spin-up ramp.
- **Traverse**: servo whine — filtered saw whose pitch tracks turret angular
  velocity (fast slew → higher whine) + faint motor rumble, gated to movement.
- **Deploy**: bay-door thunk + pneumatic hiss.

### Scene
- A procedural **range-control buoy** at the zone center (marker + blinking
  light), no external assets.
- ~12 **target drones**: small procedural glowing markers (octahedron + red
  target ring) drifting slowly inside a ~600u volume around the buoy.

### Firing — automated point-defense (show-accurate, NO reticle)
Real PDCs are *automated* — they acquire and track incoming automatically. So
the range works the Expanse way and this also drops the disliked reticle:
- On entering the range the 6 turrets **deploy** (bay doors open, guns extend).
- Each turret **auto-acquires the nearest target drone within its firing arc**
  and **traverses to track it** (visible swivel motion + servo-whine sound).
- The pilot holds **FIRE** (`Space` / left-click in-zone; **FIRE** button on
  touch). Turrets with a lock **spin up and fire** GAU-8 bursts; **tracers**
  stream from the real barrel tips to the target, which **pops** (flash +
  particle burst) and **respawns** elsewhere after ~1.2s.
- No aiming needed → skill = maneuvering the ship to keep drones inside the
  turret arcs, plus burst timing. Cleaner HUD, more show-accurate.
- Mouse-fire is gated to in-zone so exploration clicks (billboard links) are
  unaffected.

### Scoring (no fail state, replayable)
- Entering starts a **30-second round**; `DESTROYED` counts up.
- At 0 the run locks, compares to **BEST** (`localStorage`
  `stellarlogs-gunnery-best`), flashes the score / "NEW BEST", then auto-restarts
  after a beat. You can leave any time; nothing punishes you.
- Activity panel: **TIME · DESTROYED · BEST · LOCKS n** (turrets currently
  tracking); entry hint "HOLD FIRE — TURRETS AUTO-TRACK".

### Model pipeline (articulated Tachi)
- Replace `public/models/tachi.glb` with the articulated export (un-joined,
  meshopt+webp, 2.4MB). Already prototyped at
  `scratchpad/tachi-articulated.glb`.
- In `Ship.tsx` load: merge non-PDC meshes by material (4 draw calls) and build
  6 **turret rigs** from the `.001`–`.006` suffixes — each rig = a group at the
  turret pivot with: static base (merged), a **yaw/elevation swivel** node
  (sphere + swivel + body + barrels-holder, merged) rotated to aim, a **barrels**
  node spun about its axis while firing, and the **bay doors** for the deploy
  animation. Expose the rigs so `GunneryRange` can drive aim/spin/fire.

### Files
New:
- `src/scene/activities/GunneryRange.tsx` — buoy, target drones, per-turret
  target assignment, tracers, pop FX, round timer; drives the ship's turret rigs.
- `src/scene/shipTurrets.ts` — reconstruct 6 turret rigs from the GLB nodes;
  shared aim/spin/deploy API.
- `src/state/activityState.ts` — shared activity HUD state + gunnery best.
- `src/hud/ActivityPanel.tsx` — the shared activity panel.

Touched:
- `src/scene/Ship.tsx` — build turret rigs at load; deploy/stow by activity.
- `src/audio/engine.ts` — GAU-8 fire synth, servo-whine traverse, deploy thunk.
- `src/App.tsx` — mount `GunneryRange`, `ActivityPanel`.
- `src/hud/hudState.ts` — add `'poi'` to `LabelKind`; register the range POI.
- `src/hud/LabelLayer.tsx` / `HudBridge.tsx` — subtle POI label style + vis rule.
- fire input — `Space` + gated in-zone click (new `useFireControls`).
- `src/hud/TouchControls.tsx` — FIRE button shown only in-zone.
- `src/config/*` — zone center/radius, target count, RoF, round length, arcs.

### Verification
Fly the corridor → POI label + buoy visible → enter zone → turrets deploy + panel
fades in → drones drift, turrets traverse to track them (servo whine) → HOLD FIRE
→ barrels spin, GAU-8 BRRRT, tracers from real barrel tips, drones pop → TIME /
DESTROYED / BEST / LOCKS update and persist → leaving stows turrets, fades panel,
resets the round. Hold ~60fps (~22 draw calls). FIRE button on mobile emulation.

---

## Later slices (same pattern, noted for continuity)

- **F.2 Race course** — start gate + ~6–8 checkpoint rings (torus geometry +
  trigger volumes) through the Projects belt; timer + best lap.
- **F.3 Easter eggs** — Cylon Raider + MCRN Canterbury; unmarked, caption on
  close approach. Needs sourced (Sketchfab/CC) or procedural models — a research
  step like Phase C.
