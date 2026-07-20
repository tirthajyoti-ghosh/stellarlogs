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

### Scene
- A procedural **range-control buoy** at the zone center (marker + blinking
  light), no external assets.
- ~12 **target drones**: small procedural glowing markers (octahedron + red
  target ring) drifting slowly inside a ~600u volume around the buoy.

### Aiming & firing
- **Aim by pointing the nose** — reuses the existing flight controls (A/D yaw,
  R/F pitch), no new aiming scheme. The chase camera already looks down the
  nose, so screen-center ≈ where shots go.
- A **reticle** at screen-center appears **only while in the zone** — it's
  functional there (you need to see where rounds land), not decoration, so it
  respects the "no decorative HUD" rule by being strictly contextual.
- **Fire**: `Space` (hold = continuous ~8 rounds/s, PDC-style) and left-click
  while in-zone; a **FIRE** button appears on touch devices. Mouse-fire is gated
  to in-zone so normal exploration clicks (billboard links) are unaffected.
- Each round raycasts from a muzzle offset along the nose; the nearest target
  within an angular tolerance + max range is a **hit** → it pops (flash +
  small particle burst) and **respawns** elsewhere after ~1.2s. **Tracers** are
  drawn from the PDC mounts to the hit point (or to max range on a miss).

### Scoring (no fail state, replayable)
- Entering starts a **30-second round**; `DESTROYED` counts up as you fire.
- At 0 the run locks, compares to **BEST** (`localStorage`
  `stellarlogs-gunnery-best`), flashes the score / "NEW BEST", then auto-restarts
  after a beat. You can leave any time; nothing punishes you.
- Activity panel shows: **TIME · DESTROYED · BEST**; entry hint "FIRE: SPACE /
  CLICK".

### Files
New:
- `src/scene/activities/GunneryRange.tsx` — buoy, target drones, raycast firing,
  tracers, pop FX, round timer.
- `src/state/activityState.ts` — shared activity HUD state + gunnery best.
- `src/hud/ActivityPanel.tsx` — the shared activity panel.
- `src/hud/Reticle.tsx` — contextual center reticle.

Touched:
- `src/App.tsx` — mount `GunneryRange`, `ActivityPanel`, `Reticle`.
- `src/hud/hudState.ts` — add `'poi'` to `LabelKind`; register the range POI.
- `src/hud/LabelLayer.tsx` / `HudBridge.tsx` — subtle POI label style + vis rule.
- fire input — `Space` + gated in-zone click (new `useFireControls` or extend
  `useShipControls`).
- `src/hud/TouchControls.tsx` — FIRE button shown only in-zone.
- `src/config/*` — zone center/radius, target count, RoF, round length.

### Verification
Fly the corridor → POI label + buoy visible → enter zone → panel + reticle fade
in → firing throws tracers and pops targets → timer/DESTROYED/BEST update and
persist → leaving fades the panel and resets the round. Hold 60fps. FIRE button
on mobile emulation.

---

## Later slices (same pattern, noted for continuity)

- **F.2 Race course** — start gate + ~6–8 checkpoint rings (torus geometry +
  trigger volumes) through the Projects belt; timer + best lap.
- **F.3 Easter eggs** — Cylon Raider + MCRN Canterbury; unmarked, caption on
  close approach. Needs sourced (Sketchfab/CC) or procedural models — a research
  step like Phase C.
